import { useCallback, useEffect, useRef, useState } from "react";

interface WebSocketMessage {
  topic: string;
  role?: string;
  received_at: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
  normalized?: {
    // For joint states and trajectory data
    names?: string[];
    positions?: number[];
    velocities?: number[];
    efforts?: number[];
    // Numeric data for Float64MultiArray or base64 string for images
    data?: string | number[];
    joint_names?: string[];
    last_point_positions?: number[];

    // For camera images
    width?: number;
    height?: number;
    encoding?: string;
  };
  replay?: WebSocketMessage[];
}

interface UseWebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = ({ url, reconnectInterval = 3000, maxReconnectAttempts = 5, onMessage }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log("WebSocket connected to ROS2 bridge");
        setIsConnected(true);
        setError(null);
        reconnectCount.current = 0;
      };

      ws.current.onmessage = (event) => {
        let sanitizedData = "";
        try {
          // First, sanitize the data by replacing NaN with null - more comprehensive regex
          sanitizedData = event.data
            .replace(/:\s*NaN\b/g, ": null")
            .replace(/,\s*NaN\b/g, ", null")
            .replace(/\[\s*NaN\b/g, "[null")
            .replace(/NaN\s*,/g, "null,")
            .replace(/NaN\s*\]/g, "null]");

          let message: WebSocketMessage = JSON.parse(sanitizedData);

          // Debug each message to see what's coming in
          // if the type of message is string then change it to json object
          if (typeof message === "string") {
            message = JSON.parse(message);
          }

          // Log ALL messages to debug
          console.log("🔍 WebSocket message received:", {
            topic: message.topic,
            role: message.role,
            hasData: message.normalized && !!message.normalized.data,
            dataLength: message.normalized?.data
              ? message.normalized.data.length
              : 0,
            width: message.normalized?.width,
            height: message.normalized?.height,
          });

          if (message.role && message.role.includes("camera")) {
            console.log("📸 CAMERA MESSAGE DETAILS:", {
              topic: message.topic,
              role: message.role,
              hasData: message.normalized && !!message.normalized.data,
              width: message.normalized?.width,
              height: message.normalized?.height,
            });
          }

          console.log(
            "🚀 SETTING LAST MESSAGE:",
            message.role,
            "at",
            Date.now()
          );
          setLastMessage(message);

          // Also call the callback immediately to avoid React batching issues
          if (onMessage) {
            console.log(
              "📨 CALLING onMessage CALLBACK:",
              message.role,
              "at",
              Date.now()
            );
            onMessage(message);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
          console.log("Raw message:", event.data.substring(0, 300));
          console.log("Sanitized message:", sanitizedData.substring(0, 300));
        }
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if not a normal closure
        if (
          event.code !== 1000 &&
          reconnectCount.current < maxReconnectAttempts
        ) {
          reconnectCount.current += 1;
          console.log(
            `Attempting to reconnect... (${reconnectCount.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutId.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCount.current >= maxReconnectAttempts) {
          setError("Max reconnection attempts reached");
        }
      };

      ws.current.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
      };
    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      setError("Failed to create WebSocket connection");
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current);
      }
      if (ws.current) {
        ws.current.close(1000, "Component unmounting");
      }
    };
  }, [url, connect]);

  return {
    isConnected,
    lastMessage,
    error,
    reconnect: connect,
  };
};
