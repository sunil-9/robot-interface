// bridge-fixed.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import WebSocket, { WebSocketServer } from "ws";

// Try dynamic import for rclnodejs to avoid ES6 module issues
let rclnodejs: any;

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
interface TopicConfig {
  name: string;
  type: string;
  role: string;
}

interface Config {
  websocket?: {
    port: number;
  };
  topics: TopicConfig[];
  maxBuffer: number;
}

interface BridgeMessage {
  topic: string;
  role: string | null;
  received_at: number;
  raw?: unknown;
  normalized?: {
    names?: string[];
    positions?: number[];
    velocities?: number[];
    efforts?: number[];
    data?: number[] | string;
    joint_names?: string[];
    last_point_positions?: number[];
    width?: number;
    height?: number;
    encoding?: string;
  };
}

// Load configuration
const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("❌ Missing config.json");
  process.exit(1);
}

const config: Config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const wsPort = config.websocket?.port || 8080;
const maxBuffer = config.maxBuffer || 1000;

// Simple circular buffer
class Buffer<T> {
  private max: number;
  private arr: T[];

  constructor(max: number) {
    this.max = max;
    this.arr = [];
  }

  push(item: T): void {
    this.arr.push(item);
    if (this.arr.length > this.max) {
      this.arr.shift();
    }
  }

  getAll(): T[] {
    return this.arr;
  }
}

// Start WebSocket server
const wss = new WebSocketServer({ port: wsPort }, () => {
  console.log(`✅ WebSocket server listening on ws://0.0.0.0:${wsPort}`);
});

const clientSubscriptions = new Map<WebSocket, Set<string>>();
const buffers: Record<string, Buffer<BridgeMessage>> = {};

// Broadcast helper
function broadcastJson(obj: BridgeMessage): void {
  const s = JSON.stringify(obj);
  const role = obj.role;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const subscriptions = clientSubscriptions.get(client);
      if (
        !subscriptions ||
        subscriptions.size === 0 ||
        subscriptions.has(role || "")
      ) {
        client.send(s);
      }
    }
  });
}

async function initializeROS2() {
  try {
    // Dynamic import to handle ES6 module compatibility
    rclnodejs = await import("rclnodejs");
    console.log("🚀 Initializing ROS2 node...");

    await rclnodejs.init();
    const node = new rclnodejs.Node("ros2_ws_bridge_node");
    console.log("✅ ROS2 node initialized");

    // Subscribe to configured topics
    for (const t of config.topics) {
      console.log(`📡 Subscribing to ${t.name} as ${t.type} (role=${t.role})`);
      buffers[t.name] = new Buffer<BridgeMessage>(maxBuffer);

      try {
        node.createSubscription(t.type, t.name, (msg: unknown) => {
          const out: BridgeMessage = {
            topic: t.name,
            role: t.role || null,
            received_at: Date.now(),
            raw: msg,
          };

          // Normalize based on message type
          if (t.type === "sensor_msgs/msg/JointState") {
            out.normalized = {
              names: msg.name || [],
              positions: msg.position || [],
              velocities: msg.velocity || [],
              efforts: msg.effort || [],
            };
          } else if (t.type === "std_msgs/msg/Float64MultiArray") {
            out.normalized = { data: msg.data || [] };
          } else if (t.type === "trajectory_msgs/msg/JointTrajectory") {
            const points = msg.points || [];
            out.normalized = {
              joint_names: msg.joint_names || [],
              last_point_positions: points.length
                ? points[points.length - 1].positions
                : [],
            };
          } else if (t.type === "sensor_msgs/msg/Image") {
            out.normalized = {
              width: msg.width,
              height: msg.height,
              encoding: msg.encoding,
              data: Buffer.from(msg.data).toString("base64"),
            };

            if (t.role === "camera_base" || t.role === "camera_wrist") {
              console.log(
                `📸 Camera ${t.role} received: ${msg.width}x${msg.height}`
              );
            }
          }

          buffers[t.name].push(out);
          broadcastJson(out);
        });

        console.log(`✅ Successfully subscribed to ${t.name}`);
      } catch (err: unknown) {
        console.error(
          `❌ Failed to create subscription for ${t.name} ${t.type}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    rclnodejs.spin(node);
    console.log("🔄 ROS2 node spinning...");

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("🛑 Shutting down bridge...");
      rclnodejs.shutdown();
      wss.close(() => process.exit(0));
    });
  } catch (error) {
    console.error("❌ Failed to initialize ROS2:", error);
    console.log("💡 Tip: Make sure ROS2 is sourced and topics are available");
    process.exit(1);
  }
}

// Handle WebSocket connections
wss.on("connection", (socket: WebSocket) => {
  console.log("🔌 Web client connected");
  clientSubscriptions.set(socket, new Set<string>());

  socket.on("message", (message: WebSocket.Data) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "subscribe") {
        const subscriptions =
          clientSubscriptions.get(socket) || new Set<string>();
        if (Array.isArray(data.roles)) {
          data.roles.forEach((role: string) => subscriptions.add(role));
          console.log(
            `📝 Client subscribed to roles: ${data.roles.join(", ")}`
          );
        }
        clientSubscriptions.set(socket, subscriptions);

        socket.send(
          JSON.stringify({
            type: "subscribed",
            roles: Array.from(subscriptions),
          })
        );

        // Send initial data
        for (const topicName of Object.keys(buffers)) {
          const items = buffers[topicName].getAll();
          if (items.length) {
            const latestItem = items[items.length - 1];
            if (
              !subscriptions.size ||
              subscriptions.has(latestItem.role || "")
            ) {
              try {
                socket.send(
                  JSON.stringify({
                    type: "replay",
                    topic: topicName,
                    items: [latestItem],
                  })
                );
              } catch (e) {
                // ignore send errors
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error("❌ Error handling client message:", err);
    }
  });

  socket.on("close", () => {
    console.log("❌ Client disconnected");
    clientSubscriptions.delete(socket);
  });

  // Send available roles
  const availableRoles = [...new Set(config.topics.map((t) => t.role))];
  socket.send(
    JSON.stringify({
      type: "available_roles",
      roles: availableRoles,
    })
  );
});

// Start the bridge
console.log("🚀 Starting ROS2 WebSocket Bridge (TypeScript ES6)...");
initializeROS2().catch((e: unknown) => {
  console.error("❌ Bridge startup error:", e);
  process.exit(1);
});
