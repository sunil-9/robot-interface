// bridge.ts
import fs from "fs";
import path from "path";
import * as rclnodejs from "rclnodejs";
import { fileURLToPath } from "url";
import WebSocket, { WebSocketServer } from "ws";

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

interface JointStateMessage {
  name?: string[];
  position?: number[];
  velocity?: number[];
  effort?: number[];
}

interface Float64MultiArrayMessage {
  data?: number[];
}

interface JointTrajectoryMessage {
  joint_names?: string[];
  points?: Array<{
    positions: number[];
  }>;
}

interface ImageMessage {
  width: number;
  height: number;
  encoding: string;
  data: Uint8Array | number[];
}

interface NormalizedData {
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
}

interface BridgeMessage {
  topic: string;
  role: string | null;
  received_at: number;
  raw: unknown;
  normalized?: NormalizedData;
}

interface ClientMessage {
  type: "subscribe" | "unsubscribe";
  roles?: string[];
}

interface ServerResponse {
  type: "subscribed" | "unsubscribed" | "available_roles" | "replay";
  roles?: string[];
  topic?: string;
  items?: BridgeMessage[];
}

// Load configuration
const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("Missing config.json");
  process.exit(1);
}

const config: Config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const wsPort = config.websocket?.port || 8080;
const maxBuffer = config.maxBuffer || 1000;

// Simple circular buffer per topic
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
  console.log(`WebSocket server listening on ws://0.0.0.0:${wsPort}`);
});

// Store client subscriptions - clients can subscribe to specific roles
const clientSubscriptions = new Map<WebSocket, Set<string>>();

// Broadcast helper - only send to clients who subscribed to this role
function broadcastJson(obj: BridgeMessage): void {
  const s = JSON.stringify(obj);
  const role = obj.role;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // If client has subscriptions and is subscribed to this role, or has no subscriptions (default: receive all)
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

// Keep latest buffers per topic
const buffers: Record<string, Buffer<BridgeMessage>> = {};

async function main(): Promise<void> {
  await rclnodejs.init();
  const node = new rclnodejs.Node("ros2_ws_bridge_node");

  // subscribe to configured topics
  for (const t of config.topics) {
    console.log(`Subscribing to ${t.name} as ${t.type} (role=${t.role})`);
    buffers[t.name] = new Buffer<BridgeMessage>(maxBuffer);

    // create subscription
    try {
      // @ts-expect-error - rclnodejs has complex type constraints for message types
      node.createSubscription(t.type, t.name, (msg: unknown) => {
        // Build normalized JSON to send to clients
        const out: BridgeMessage = {
          topic: t.name,
          role: t.role || null,
          received_at: Date.now(),
          raw: msg, // rclnodejs message is serializable to JSON for common types
        };

        // Update the normalization logic in the subscription callback
        if (t.type === "sensor_msgs/msg/JointState") {
          const jointMsg = msg as JointStateMessage;
          out.normalized = {
            names: jointMsg.name || [],
            positions: jointMsg.position || [],
            velocities: jointMsg.velocity || [],
            efforts: jointMsg.effort || [],
          };
        } else if (t.type === "std_msgs/msg/Float64MultiArray") {
          const arrayMsg = msg as Float64MultiArrayMessage;
          out.normalized = { data: arrayMsg.data || [] };
        } else if (t.type === "trajectory_msgs/msg/JointTrajectory") {
          const trajectoryMsg = msg as JointTrajectoryMessage;
          // Extract last point if present
          const points = trajectoryMsg.points || [];
          out.normalized = {
            joint_names: trajectoryMsg.joint_names || [],
            last_point_positions: points.length
              ? points[points.length - 1].positions
              : [],
          };
        } else if (t.type === "sensor_msgs/msg/Image") {
          const imageMsg = msg as ImageMessage;
          // For camera images, we'll include essential metadata and encode the raw data as base64
          out.normalized = {
            width: imageMsg.width,
            height: imageMsg.height,
            encoding: imageMsg.encoding,
            // Convert binary data to base64 string for transmission over websocket
            data: globalThis.Buffer.from(imageMsg.data).toString("base64"),
          };

          // Log camera metadata when we receive images
          if (t.role === "camera_base" || t.role === "camera_wrist") {
            console.log(`Camera ${t.role} received:`, {
              topic: t.name,
              width: imageMsg.width,
              height: imageMsg.height,
              encoding: imageMsg.encoding,
              dataSize: Array.isArray(imageMsg.data)
                ? imageMsg.data.length
                : imageMsg.data.byteLength,
            });
          }
        }
        // push to buffer and broadcast
        buffers[t.name].push(out);
        broadcastJson(out);
      });
    } catch (err: unknown) {
      console.error(
        `Failed to create subscription for ${t.name} ${t.type}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  rclnodejs.spin(node);

  // serve initial state on websocket connection (so client can catch up)
  wss.on("connection", (socket: WebSocket) => {
    console.log("Web client connected");

    // Initialize client with no subscriptions (will receive all messages by default)
    clientSubscriptions.set(socket, new Set<string>());

    // Handle subscription messages
    socket.on("message", (message: WebSocket.Data) => {
      try {
        const data: ClientMessage = JSON.parse(message.toString());

        // Handle subscription requests
        if (data.type === "subscribe") {
          // Get or initialize client's subscription set
          const subscriptions =
            clientSubscriptions.get(socket) || new Set<string>();

          // Add roles to subscribe to
          if (Array.isArray(data.roles)) {
            data.roles.forEach((role: string) => subscriptions.add(role));
            console.log(`Client subscribed to roles: ${data.roles.join(", ")}`);
          }

          // Update subscriptions
          clientSubscriptions.set(socket, subscriptions);

          // Send confirmation
          const response: ServerResponse = {
            type: "subscribed",
            roles: Array.from(subscriptions),
          };
          socket.send(JSON.stringify(response));

          // Send initial data for subscribed roles only
          for (const topicName of Object.keys(buffers)) {
            const items = buffers[topicName].getAll();
            if (items.length) {
              // Only send if no subscriptions or if subscribed to this role
              const latestItem = items[items.length - 1];
              if (
                !subscriptions.size ||
                subscriptions.has(latestItem.role || "")
              ) {
                try {
                  const replayResponse: ServerResponse = {
                    type: "replay",
                    topic: topicName,
                    items: [latestItem], // Send only the latest item to reduce bandwidth
                  };
                  socket.send(JSON.stringify(replayResponse));
                } catch (e) {
                  /* ignore send errors */
                }
              }
            }
          }
        }

        // Handle unsubscribe requests
        else if (data.type === "unsubscribe") {
          const subscriptions = clientSubscriptions.get(socket);
          if (subscriptions && Array.isArray(data.roles)) {
            data.roles.forEach((role: string) => subscriptions.delete(role));
            console.log(
              `Client unsubscribed from roles: ${data.roles.join(", ")}`
            );
          }

          // Send confirmation
          const response: ServerResponse = {
            type: "unsubscribed",
            roles: Array.from(subscriptions || []),
          };
          socket.send(JSON.stringify(response));
        }
      } catch (err: unknown) {
        console.error("Error handling client message:", err);
      }
    });

    // Handle client disconnect
    socket.on("close", () => {
      console.log("Client disconnected");
      clientSubscriptions.delete(socket);
    });

    // Send available roles to the client
    const availableRoles = [...new Set(config.topics.map((t) => t.role))];
    const rolesResponse: ServerResponse = {
      type: "available_roles",
      roles: availableRoles,
    };
    socket.send(JSON.stringify(rolesResponse));

    // If no specific subscriptions yet, send the latest item from each buffer
    for (const topicName of Object.keys(buffers)) {
      const items = buffers[topicName].getAll();
      if (items.length) {
        try {
          const replayResponse: ServerResponse = {
            type: "replay",
            topic: topicName,
            items: [items[items.length - 1]], // Send only latest item
          };
          socket.send(JSON.stringify(replayResponse));
        } catch (e) {
          /* ignore send errors */
        }
      }
    }
  });

  // gracefully shutdown on SIGINT
  process.on("SIGINT", () => {
    console.log("Shutting down bridge...");
    rclnodejs.shutdown();
    wss.close(() => process.exit(0));
  });
}

main().catch((e: unknown) => {
  console.error("bridge error:", e);
  process.exit(1);
});
