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
                normalized.data.length
              );
            }
            break;
          case "camera_wrist":
            if (normalized?.data && typeof normalized.data === "string") {
              newData.camera_wrist = `data:image/jpeg;base64,${normalized.data}`;
              console.log(
                "✅ Camera wrist updated, data length:",
                normalized.data.length
              );
            }
            break;
        }

        return newData;
      });
    }
  }, [lastMessage]);

  return bridgeData;
};
