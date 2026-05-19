/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { useWebRTCClient } from "./useWebRTCClient";
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

interface ActionVarianceData {
  data?: number[];
}

interface BridgeData {
  state: JointData | null;
  command: CommandData | null;
  camera_head: string | null; // base64 image from head camera
  camera_left: string | null; // base64 image from left hand camera
  camera_right: string | null; // base64 image from right hand camera
  mask_head: string | null; // base64 mask image for head camera
  mask_left: string | null; // base64 mask image for left hand camera
  mask_right: string | null; // base64 mask image for right hand camera
  action_variance: ActionVarianceData | null; // action variance windows data
  isConnected: boolean;
  error: string | null;
}

export const useBridgeData = () => {
  const [bridgeData, setBridgeData] = useState<BridgeData>({
    state: null,
    command: null,
    camera_head: null,
    camera_left: null,
    camera_right: null,
    mask_head: null,
    mask_left: null,
    mask_right: null,
    action_variance: null,
    isConnected: false,
    error: null,
  });

  const handleMessage = useCallback(
    (message: { role: string; normalized: any }) => {
      const { role, normalized } = message;

      console.log("📦 Bridge data received via callback:", {
        role,
        timestamp: Date.now(),
        hasNormalized: !!normalized,
        dataType: typeof normalized?.data,
        dataLength: normalized?.data ? normalized.data.length : 0,
      });

      if (role.includes("camera_")) {
        console.log(`🎯 PROCESSING ${role.toUpperCase()} VIA CALLBACK!`, {
          role,
          hasNormalized: !!normalized,
          hasData: !!normalized?.data,
          dataType: typeof normalized?.data,
        });
      }

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
          case "camera_head":
            if (normalized?.data && typeof normalized.data === "string") {
              newData.camera_head = `data:image/jpeg;base64,${normalized.data}`;
              console.log(
                "✅ Head camera updated, data length:",
                normalized.data.length,
                "Base64 preview:",
                normalized.data.substring(0, 50) + "..."
              );
            } else {
              console.log("❌ Head camera data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
                dataLength: normalized?.data ? normalized.data.length : 0,
              });
            }
            break;
          case "camera_left":
            console.log("🎥 LEFT HAND CAMERA MESSAGE RECEIVED!", {
              hasNormalized: !!normalized,
              hasData: !!normalized?.data,
              dataType: typeof normalized?.data,
              dataLength: normalized?.data ? normalized.data.length : 0,
              fullNormalized: normalized,
            });
            if (normalized?.data && typeof normalized.data === "string") {
              newData.camera_left = `data:image/jpeg;base64,${normalized.data}`;
              console.log(
                "✅ Left hand camera updated, data length:",
                normalized.data.length,
                "Base64 preview:",
                normalized.data.substring(0, 50) + "..."
              );
            } else {
              console.log("❌ Left hand camera data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
                dataLength: normalized?.data ? normalized.data.length : 0,
              });
            }
            break;
          case "camera_right":
            console.log("🎥 RIGHT HAND CAMERA MESSAGE RECEIVED!", {
              hasNormalized: !!normalized,
              hasData: !!normalized?.data,
              dataType: typeof normalized?.data,
              dataLength: normalized?.data ? normalized.data.length : 0,
              fullNormalized: normalized,
            });
            if (normalized?.data && typeof normalized.data === "string") {
              newData.camera_right = `data:image/jpeg;base64,${normalized.data}`;
              console.log(
                "✅ Right hand camera updated, data length:",
                normalized.data.length,
                "Base64 preview:",
                normalized.data.substring(0, 50) + "..."
              );
            } else {
              console.log("❌ Right hand camera data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
                dataLength: normalized?.data ? normalized.data.length : 0,
              });
            }
            break;
          case "mask_head":
            if (normalized?.data && typeof normalized.data === "string") {
              newData.mask_head = `data:image/png;base64,${normalized.data}`;
              console.log(
                "✅ Head mask updated, data length:",
                normalized.data.length
              );
            } else {
              console.log("❌ Head mask data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
              });
            }
            break;
          case "mask_left":
            if (normalized?.data && typeof normalized.data === "string") {
              newData.mask_left = `data:image/png;base64,${normalized.data}`;
              console.log(
                "✅ Left hand mask updated, data length:",
                normalized.data.length
              );
            } else {
              console.log("❌ Left hand mask data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
              });
            }
            break;
          case "mask_right":
            if (normalized?.data && typeof normalized.data === "string") {
              newData.mask_right = `data:image/png;base64,${normalized.data}`;
              console.log(
                "✅ Right hand mask updated, data length:",
                normalized.data.length
              );
            } else {
              console.log("❌ Right hand mask data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
              });
            }
            break;
          case "action_variance":
            if (normalized?.data && Array.isArray(normalized.data)) {
              newData.action_variance = {
                data: normalized.data,
              };
              console.log(
                "✅ Action variance updated, values:",
                normalized.data.map((v: number) => v.toFixed(4)).join(", ")
              );
            } else {
              console.log("❌ Action variance data invalid:", {
                hasData: !!normalized?.data,
                dataType: typeof normalized?.data,
                isArray: Array.isArray(normalized?.data),
              });
            }
            break;
        }

        return newData;
      });
    },
    []
  );

  // Use the WebSocket configuration from our utils
  const {
    isConnected: wsConnected,
    lastMessage,
    error,
  } = useWebSocket({
    // No need to explicitly provide URL, it will use the one from config
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onMessage: (msg) => {
      // Only process websocket messages when RTC is not connected
      if (!rtcApi.connected) {
        handleMessage(msg as { role: string; normalized: any });
      }
    },
  });

  const rtcApi = useWebRTCClient();

  // Subscribe to RTC datachannel messages when connected
  useEffect(() => {
    if (!rtcApi || !rtcApi.connected) return;
    const off = rtcApi.addDataListener((payload) => {
      if (!payload || typeof payload !== "object") return;
      // payload is expected to be a mapping role -> data dict
      try {
        for (const [role, data] of Object.entries(payload)) {
          handleMessage({ role, normalized: (data as any).normalized ?? data });
        }
      } catch (e) {
        console.warn("Failed to process rtc payload", e);
      }
    });

    return () => off && off();
  }, [rtcApi, rtcApi?.connected, handleMessage]);

  useEffect(() => {
    setBridgeData((prev) => ({
      ...prev,
      isConnected: rtcApi?.connected || wsConnected,
      error,
    }));
  }, [rtcApi?.connected, wsConnected, error]);


  return bridgeData;
}
