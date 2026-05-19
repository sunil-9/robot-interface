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
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage?: (message: WebSocketMessage | any) => void; // Callback to handle messages
}

export const useWebSocket = ({
  url: customUrl,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onMessage,
}: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  const url = customUrl ;

  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null);

  // Store onMessage callback in a ref to avoid reconnection on every callback change
  const onMessageRef = useRef(onMessage);

  // Update the ref when onMessage changes, but don't trigger reconnection
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    // Prevent creating a new connection if one already exists and is open
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.CONNECTING ||
        ws.current.readyState === WebSocket.OPEN)
    ) {
      console.log("⚠️ WebSocket already connected or connecting, skipping...");
      return;
    }

    // Close existing connection before creating a new one
    if (ws.current) {
      console.log("🔄 Closing existing WebSocket before reconnecting...");
      ws.current.close(1000, "Reconnecting");
    }

    try {
      console.log("🔌 Creating new WebSocket connection to:", url);
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log("✅ WebSocket connected to ROS2 bridge");
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
              dataLength: message.normalized?.data
                ? message.normalized.data.length
                : 0,
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

          // Use the ref to call the callback to avoid reconnection issues
          if (onMessageRef.current) {
            console.log(
              "📨 CALLING onMessage CALLBACK:",
              message.role,
              "at",
              Date.now()
            );
            onMessageRef.current(message);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
          console.log("Raw message:", event.data.substring(0, 300));
          console.log("Sanitized message:", sanitizedData.substring(0, 300));
        }
      };

      ws.current.onclose = (event) => {
        console.log("❌ WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if not a normal closure
        if (
          event.code !== 1000 &&
          reconnectCount.current < maxReconnectAttempts
        ) {
          reconnectCount.current += 1;
          console.log(
            `🔄 Attempting to reconnect... (${reconnectCount.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutId.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCount.current >= maxReconnectAttempts) {
          setError("Max reconnection attempts reached");
        }
      };

      ws.current.onerror = (event) => {
        console.error("⚠️ WebSocket error:", event);
        setError("WebSocket connection error");
      };
    } catch (err) {
      console.error("❌ Failed to create WebSocket connection:", err);
      setError("Failed to create WebSocket connection");
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  useEffect(() => {
    console.log(
      "🎬 useWebSocket useEffect triggered - initializing connection"
    );
    connect();

    return () => {
      console.log("🧹 useWebSocket cleanup - closing connection");
      if (reconnectTimeoutId.current) {
        clearTimeout(reconnectTimeoutId.current);
      }
      if (ws.current) {
        ws.current.close(1000, "Component unmounting");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]); // Only reconnect when URL changes, not when connect function changes

  return {
    isConnected,
    lastMessage,
    error,
    reconnect: connect,
  };
};
