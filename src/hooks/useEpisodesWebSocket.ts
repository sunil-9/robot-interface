import { API_CONFIG } from "@/config/api";
import { loadStoredAuthSession } from "@/services/authApi";
import type * as episodeApi from "@/services/episodeApi";
import { useCallback, useEffect, useRef, useState } from "react";

type EpisodesSnapshotMessage = {
  type: "episodes_snapshot";
  dataset_id: string;
  dataset_status?: string;
  total_count: number;
  total_frames?: number;
  episodes: episodeApi.Episode[];
};

type DatasetDeletedMessage = {
  type: "dataset_deleted";
  dataset_id: string;
};

type EpisodesErrorMessage = {
  type: "error";
  detail: string;
};

type EpisodeSaveErrorMessage = {
  type: "episode_save_error";
  dataset_id: string;
  message?: string;
  created_at?: string;
};

type EpisodesWsMessage =
  | EpisodesSnapshotMessage
  | DatasetDeletedMessage
  | EpisodesErrorMessage
  | EpisodeSaveErrorMessage;

interface UseEpisodesWebSocketOptions {
  datasetId: string | null | undefined;
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onSnapshot?: (message: EpisodesSnapshotMessage) => void;
  onDatasetDeleted?: (message: DatasetDeletedMessage) => void;
  onErrorMessage?: (message: EpisodesErrorMessage) => void;
  onEpisodeSaveError?: (message: EpisodeSaveErrorMessage) => void;
}

const buildEpisodesWsUrl = (datasetId: string, token?: string) => {
  const base = new URL(API_CONFIG.BASE_URL);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const basePath = base.pathname.replace(/\/$/, "");
  base.pathname = `${basePath}/datasets/${encodeURIComponent(
    datasetId,
  )}/episodes/ws`;
  base.search = "";
  base.hash = "";
  if (token) {
    base.searchParams.set("token", token);
  }
  return base.toString();
};

export const useEpisodesWebSocket = ({
  datasetId,
  enabled = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onSnapshot,
  onDatasetDeleted,
  onErrorMessage,
  onEpisodeSaveError,
}: UseEpisodesWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowReconnect = useRef(true);

  const closeSocket = useCallback((code = 1000, reason = "Closing") => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close(code, reason);
    }
  }, []);

  const connect = useCallback(() => {
    if (!datasetId || !enabled) {
      return;
    }

    const token = loadStoredAuthSession()?.accessToken;
    if (!token) {
      console.warn(
        "Episodes websocket: no auth token available, skipping connection.",
      );
      return;
    }

    const targetUrl = buildEpisodesWsUrl(datasetId, token);
    console.info("Episodes websocket connecting to:", targetUrl);

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    closeSocket(1000, "Reconnecting");

    try {
      const socket = new WebSocket(targetUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCount.current = 0;
        console.info("Episodes websocket connected.");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as EpisodesWsMessage;
          if (message.type === "episodes_snapshot" && onSnapshot) {
            onSnapshot(message);
          } else if (message.type === "dataset_deleted" && onDatasetDeleted) {
            onDatasetDeleted(message);
          } else if (
            message.type === "episode_save_error" &&
            onEpisodeSaveError
          ) {
            onEpisodeSaveError(message);
          } else if (message.type === "error") {
            setError(message.detail);
            if (onErrorMessage) {
              onErrorMessage(message);
            }
          }
        } catch (err) {
          console.error("Failed to parse episodes websocket message:", err);
        }
      };

      socket.onerror = () => {
        setError("Episodes websocket connection error");
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        console.info("Episodes websocket closed:", event.code, event.reason);
        if (
          allowReconnect.current &&
          enabled &&
          event.code !== 1000 &&
          reconnectCount.current < maxReconnectAttempts
        ) {
          reconnectCount.current += 1;
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (err) {
      console.error("Failed to open episodes websocket:", err);
      setError("Failed to open episodes websocket");
    }
  }, [
    closeSocket,
    datasetId,
    enabled,
    maxReconnectAttempts,
    reconnectInterval,
    onDatasetDeleted,
    onErrorMessage,
    onSnapshot,
  ]);

  useEffect(() => {
    allowReconnect.current = true;
    if (enabled && datasetId) {
      connect();
    } else {
      closeSocket(1000, "Disabled");
      setIsConnected(false);
    }

    return () => {
      allowReconnect.current = false;
      closeSocket(1000, "Component unmount");
    };
  }, [closeSocket, connect, datasetId, enabled]);

  return {
    isConnected,
    error,
  };
};
