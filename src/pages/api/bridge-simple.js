// bridge-simple.js
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const rclnodejs = require("rclnodejs");

const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("Missing config.json");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const wsPort = config.websocket?.port || 8080;
const maxBuffer = config.maxBuffer || 1000;

// Simple circular buffer per topic
class Buffer {
  constructor(max) {
    this.max = max;
    this.arr = [];
  }

  push(item) {
    this.arr.push(item);
    if (this.arr.length > this.max) {
      this.arr.shift();
    }
  }

  getAll() {
    return this.arr;
  }
}

// Start WebSocket server
const wss = new WebSocket.Server({ port: wsPort }, () => {
  console.log(`✅ WebSocket server listening on ws://0.0.0.0:${wsPort}`);
});

// Store client subscriptions
const clientSubscriptions = new Map();

// Broadcast helper
function broadcastJson(obj) {
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

// Keep latest buffers per topic
const buffers = {};

async function main() {
  try {
    console.log("🚀 Initializing ROS2 node...");
    await rclnodejs.init();
    const node = new rclnodejs.Node("ros2_ws_bridge_node");
    console.log("✅ ROS2 node initialized");

    // Subscribe to configured topics
    for (const t of config.topics) {
      console.log(`📡 Subscribing to ${t.name} as ${t.type} (role=${t.role})`);
      buffers[t.name] = new Buffer(maxBuffer);

      try {
        node.createSubscription(t.type, t.name, (msg) => {
          // Build normalized JSON to send to clients
          const out = {
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

          // Push to buffer and broadcast
          buffers[t.name].push(out);
          broadcastJson(out);
        });

        console.log(`✅ Successfully subscribed to ${t.name}`);
      } catch (err) {
        console.error(
          `❌ Failed to create subscription for ${t.name} ${t.type}:`,
          err.message
        );
      }
    }

    rclnodejs.spin(node);
    console.log("🔄 ROS2 node spinning...");

    // Handle WebSocket connections
    wss.on("connection", (socket) => {
      console.log("🔌 Web client connected");
      clientSubscriptions.set(socket, new Set());

      socket.on("message", (message) => {
        try {
          const data = JSON.parse(message);

          if (data.type === "subscribe") {
            const subscriptions = clientSubscriptions.get(socket) || new Set();
            if (Array.isArray(data.roles)) {
              data.roles.forEach((role) => subscriptions.add(role));
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
          } else if (data.type === "unsubscribe") {
            const subscriptions = clientSubscriptions.get(socket);
            if (subscriptions && Array.isArray(data.roles)) {
              data.roles.forEach((role) => subscriptions.delete(role));
              console.log(
                `📝 Client unsubscribed from roles: ${data.roles.join(", ")}`
              );
            }

            socket.send(
              JSON.stringify({
                type: "unsubscribed",
                roles: Array.from(subscriptions || []),
              })
            );
          }
        } catch (err) {
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

      // Send latest item from each buffer
      for (const topicName of Object.keys(buffers)) {
        const items = buffers[topicName].getAll();
        if (items.length) {
          try {
            socket.send(
              JSON.stringify({
                type: "replay",
                topic: topicName,
                items: [items[items.length - 1]],
              })
            );
          } catch (e) {
            // ignore send errors
          }
        }
      }
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("🛑 Shutting down bridge...");
      rclnodejs.shutdown();
      wss.close(() => process.exit(0));
    });
  } catch (error) {
    console.error("❌ Bridge initialization error:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("❌ Bridge error:", e);
  process.exit(1);
});
