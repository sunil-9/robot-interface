import { useState, useEffect } from "react";
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
    setBridgeData(prev => ({
      ...prev,
      isConnected,
      error,
    }));
  }, [isConnected, error]);

  useEffect(() => {
    if (lastMessage) {
      const { role, normalized } = lastMessage;
      
      setBridgeData(prev => {
        const newData = { ...prev };
        
        switch (role) {
          case "state":
            newData.state = {
              names: normalized?.names,
              positions: normalized?.positions,
              velocities: normalized?.velocities,
              efforts: normalized?.efforts,
            };
            break;
          case "command":
            newData.command = {
              data: Array.isArray(normalized?.data) ? normalized.data : [],
            };
            break;
          case "camera_base":
            if (normalized?.data && typeof normalized.data === 'string') {
              newData.camera_base = `data:image/jpeg;base64,${normalized.data}`;
            }
            break;
          case "camera_wrist":
            if (normalized?.data && typeof normalized.data === 'string') {
              newData.camera_wrist = `data:image/jpeg;base64,${normalized.data}`;
            }
            break;
        }
        
        return newData;
      });
    }
  }, [lastMessage]);

  return bridgeData;
};
