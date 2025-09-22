/* eslint-disable @typescript-eslint/no-explicit-any */
// TypeScript WebSocket proxy API for Isaac Sim and frontend
import { exec } from "child_process";
import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 5002 });

interface RobotData {
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number; w: number };
  status?: string;
}

type IsaacSimData = {
  camera_view?: WebSocket | null;
  register?: "frontend" | "isaacsim" | "dataHouse";
  command?: string;
  image?: string;
  robot?: RobotData;
  joints?: any; // ✨ new field for joint data
};

let frontendClients: WebSocket[] = [];
let isaacSimClient: WebSocket | null = null;

// helper to run bash scripts
function runScript(scriptName: string) {
  exec(`bash ${scriptName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error running ${scriptName}:`, error.message);
      return;
    }
    if (stderr) {
      console.error(`⚠️ ${scriptName} stderr:`, stderr);
    }
    if (stdout) {
      console.log(`✅ ${scriptName} output:`, stdout);
    }
  });
}

wss.on("connection", (ws: WebSocket, req) => {

  ws.on("message", (message: string | Buffer) => {
    let data: IsaacSimData = {};
    try {
      data = JSON.parse(message.toString());
    } catch {
      // invalid JSON, ignore
    }

    // Registration logic
    if (data.register === "frontend") {
      frontendClients.push(ws);
      ws.on("close", () => {
        frontendClients = frontendClients.filter((client) => client !== ws);
      });
      return;
    }
    if (data.register === "isaacsim") {
      isaacSimClient = ws;
      ws.on("close", () => {
        isaacSimClient = null;
      });
      return;
    }

    if (data.register === "dataHouse") {
      console.log("📡 DataHouse connected");
      ws.on("close", () => {
        console.log("❌ DataHouse disconnected");
      });
      return;
    }

    // Handle frontend commands
    if (data.command) {
      console.log(`Frontend command received: ${data.command}`);
      const script_path = "./next/pages/api/";

      // Run corresponding bash script
      switch (data.command) {
        case "move_left":
          runScript(`${script_path}left.sh`);
          console.log("Left script executed");
          break;
        case "move_right":
          runScript(`${script_path}right.sh`);
          console.log("Right script executed");
          break;
        case "move_top":
          runScript(`${script_path}top.sh`);
          console.log("Top script executed");
          break;
        case "move_down":
          runScript(`${script_path}down.sh`);
          console.log("Down script executed");
          break;
        case "wave":
          runScript(`${script_path}wave.sh`);
          console.log("Wave script executed");
          break;
        case "nod":
          runScript(`${script_path}nod.sh`);
          console.log("Nod script executed");
          break;
        case "shut_down":
          runScript(`${script_path}shut_down.sh`);
          break;

        default:
          console.warn(`⚠️ Unknown command: ${data.command}`);
      }

      // Relay command to Isaac Sim (if connected)
      if (isaacSimClient) {
        isaacSimClient.send(JSON.stringify({ command: data.command }));
      }
      return;
    }

    // Camera view relay
    if (data.camera_view && isaacSimClient) {
      console.log(`Frontend camera_view received: ${data.camera_view}`);
      isaacSimClient.send(JSON.stringify({ camera_view: data.camera_view }));
      return;
    }

    // Robot state relay
    if (data.robot) {
      frontendClients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(message);
        }
      });
      return;
    }

    // Broadcast Isaac Sim image data
    if (data.image || data.joints) {
      frontendClients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(message);
        }
      });
    }
  });
});

console.log("✅ WebSocket server running on ws://localhost:5002");
