import { useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket";

interface JointData {
  names?: string[];
  positions?: number[];
  velocities?: number[];
  efforts?: number[];
}

interface CommandData {
  data?: number[];
}

interface BridgeData {
  state: JointData | null;
  command: CommandData | null;
  camera_base: string | null; // base64 image
  camera_wrist: string | null; // base64 image
  isConnected: boolean;
  error: string | null;
}

export const useBridgeData = () => {
  const [bridgeData, setBridgeData] = useState<BridgeData>({
    state: null,
    command: null,
    camera_base: null,
    camera_wrist: null,
    isConnected: false,
    error: null,
  });

  const { isConnected, lastMessage, error } = useWebSocket({
    url: "ws://localhost:8080",
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  useEffect(() => {
    setBridgeData((prev) => ({
      ...prev,
      isConnected,
      error,
    }));
  }, [isConnected, error]);

  useEffect(() => {
    if (lastMessage) {
      const { role, normalized } = lastMessage;

      console.log("Bridge data received:", {
        role,
        hasNormalized: !!normalized,
        dataType: typeof normalized?.data,
        dataLength: normalized?.data ? normalized.data.length : 0,
        fullMessage: lastMessage,
      });

      setBridgeData((prev) => {
        const newData = { ...prev };

        switch (role) {
          case "state":
            newData.state = {
              names: normalized?.names,
              positions: normalized?.positions,
              velocities: normalized?.velocities,
              efforts: normalized?.efforts,
            };
            console.log("✅ State data updated:", newData.state);
            break;
          case "command":
            newData.command = {
              data: Array.isArray(normalized?.data) ? normalized.data : [],
            };
            console.log("✅ Command data updated:", newData.command);
            break;
          case "camera_base":
            if (normalized?.data && typeof normalized.data === "string") {
              newData.camera_base = `data:image/jpeg;base64,${normalized.data}`;
              console.log(
                "✅ Camera base updated, data length:",
                normalized.data.length,
                "Base64 preview:",
                normalized.data.substring(0, 50) + "..."
              );
            } else {
              console.log("❌ Camera base data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
                dataLength: normalized?.data ? normalized.data.length : 0,
              });
            }
            break;
          case "camera_wrist":
            if (normalized?.data && typeof normalized.data === "string") {
              newData.camera_wrist = `data:image/jpeg;base64,${normalized.data}`;
              console.log(
                "✅ Camera wrist updated, data length:",
                normalized.data.length,
                "Base64 preview:",
                normalized.data.substring(0, 50) + "..."
              );
            } else {
              console.log("❌ Camera wrist data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
                dataLength: normalized?.data ? normalized.data.length : 0,
              });
            }
            break;
        }

        return newData;
      });
    }
  }, [lastMessage]);

  // Debug: Log the complete bridge data state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔍 Complete Bridge Data State:", {
        isConnected: bridgeData.isConnected,
        error: bridgeData.error,
        hasState: !!bridgeData.state,
        hasCommand: !!bridgeData.command,
        hasCamera_base: !!bridgeData.camera_base,
        hasCamera_wrist: !!bridgeData.camera_wrist,
        camera_base_length: bridgeData.camera_base
          ? bridgeData.camera_base.length
          : 0,
        camera_wrist_length: bridgeData.camera_wrist
          ? bridgeData.camera_wrist.length
          : 0,
      });
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [bridgeData]);

  return bridgeData;
};
