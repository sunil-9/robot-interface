import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchRobotCameras,
  fetchSignalingConfig,
  type RobotCameraConfig,
} from "@/lib/api";
import { cloudConfig } from "@/lib/config";

type TelemetryListener = (message: unknown) => void;

type SignalingEndpoints = {
  baseUrl: string;
  wsUrl: string;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const createSignalingEndpoints = (baseUrl: string): SignalingEndpoints => {
  const normalized = trimTrailingSlash(baseUrl || cloudConfig.signalingBaseUrl);
  return {
    baseUrl: normalized,
    wsUrl: normalized.endsWith("/ws") ? normalized : `${normalized}/ws`,
  };
};

const KEYBOARD_PREVENT_DEFAULT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  " ", // space
  "Tab",
]);

const STORAGE_CONTROLLER_KEYS = [
  "controller",
  "selectedControl",
  "controlType",
];

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!target || typeof (target as HTMLElement).tagName !== "string") {
    return false;
  }

  const element = target as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (element.isContentEditable) {
    return true;
  }

  return tag === "input" || tag === "textarea" || tag === "select";
};

const resolvePreferredControllerId = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  let fromQuery: string | null = null;
  try {
    const query = new URLSearchParams(window.location.search);
    fromQuery = query.get("controller");
  } catch {
    fromQuery = null;
  }
  if (fromQuery && fromQuery.trim().length > 0) {
    return fromQuery;
  }

  const storages: Array<Storage | null> = [];
  try {
    storages.push(window.sessionStorage);
  } catch {
    storages.push(null);
  }

  try {
    storages.push(window.localStorage);
  } catch {
    storages.push(null);
  }

  for (const storage of storages) {
    if (!storage) {
      continue;
    }
    for (const key of STORAGE_CONTROLLER_KEYS) {
      try {
        const candidate = storage.getItem(key);
        if (candidate && candidate.trim().length > 0) {
          return candidate;
        }
      } catch {
        // Ignore storage access errors
      }
    }
  }

  return null;
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
};

const getStringField = (
  record: Record<string, unknown>,
  key: string
): string | null => {
  const value = record[key];
  return typeof value === "string" ? value : null;
};

const createRuntimeSafeId = (prefix: string): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    const randomHex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    return `${prefix}-${randomHex}`;
  }

  const fallback = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  return `${prefix}-${fallback}`;
};

export interface RemoteStreamEntry {
  id: string;
  camera: string | null;
  stream: MediaStream;
}

export interface WebRTCSession {
  robotId: string | null;
  connectionState: RTCPeerConnectionState | "new";
  signalingState: RTCSignalingState | "new";
  signalingConnected: boolean;
  telemetryOpen: boolean;
  remoteStreams: RemoteStreamEntry[];
  expectedCameras: string[];
  lastError: string | null;
  onTelemetry: (listener: TelemetryListener) => () => void;
  sendControl: (payload: unknown) => boolean;
}

export const useWebRTCSession = ({
  robotId,
  controllerId,
}: {
  robotId: string | null;
  controllerId?: string | null;
}): WebRTCSession => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const telemetryListenersRef = useRef<Set<TelemetryListener>>(new Set());
  const pendingOfferRef = useRef(false);
  const signalingConfigRef = useRef<SignalingEndpoints>(
    createSignalingEndpoints(cloudConfig.signalingBaseUrl)
  );
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const joinedRef = useRef(false);

  const [connectionState, setConnectionState] = useState<
    RTCPeerConnectionState | "new"
  >("new");
  const [signalingState, setSignalingState] = useState<
    RTCSignalingState | "new"
  >("new");
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamEntry[]>([]);
  const [cameraInfos, setCameraInfos] = useState<RobotCameraConfig[] | null>(
    null
  );
  const [lastError, setLastError] = useState<string | null>(null);

  // Discover which signaling server URL to use before establishing a session.
  useEffect(() => {
    if (cloudConfig.signalingOverride) {
      signalingConfigRef.current = createSignalingEndpoints(
        cloudConfig.signalingOverride
      );
      return;
    }

    let disposed = false;
    const resolveSignalingConfig = async () => {
      const discovered = await fetchSignalingConfig();
      if (disposed || !discovered) {
        return;
      }
      const fallback = createSignalingEndpoints(cloudConfig.signalingBaseUrl);
      signalingConfigRef.current = {
        baseUrl: trimTrailingSlash(discovered.baseUrl ?? fallback.baseUrl),
        wsUrl: discovered.wsUrl ?? fallback.wsUrl,
      };
    };

    void resolveSignalingConfig();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!robotId) {
      setCameraInfos(null);
      return;
    }

    let disposed = false;
    setCameraInfos(null);

    // Fetch the camera config for the robot.
    const resolveCameraConfig = async () => {
      try {
        const cameras = await fetchRobotCameras(robotId);
        if (!disposed) {
          setCameraInfos(cameras);
        }
      } catch (error) {
        console.warn("Failed to load camera config for robot:", error);
        if (!disposed) {
          setCameraInfos([]);
        }
      }
    };

    void resolveCameraConfig();

    return () => {
      disposed = true;
    };
  }, [robotId]);

  // Build a list of camera labels from the config (prefer positions when available).
  const expectedCameras = useMemo(() => {
    if (!cameraInfos) {
      return [] as string[];
    }
    const normalize = (value: unknown): string | null => {
      if (!value || typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };
    return cameraInfos
      .map((camera) => {
        const position = normalize(camera?.position);
        const name = normalize(camera?.name);
        return position ?? name;
      })
      .filter((label): label is string => !!label);
  }, [cameraInfos]);

  // Reset the public session fields so the UI starts from a clean slate.
  const resetState = useCallback(() => {
    setConnectionState("new");
    setSignalingState("new");
    setSignalingConnected(false);
    setTelemetryOpen(false);
    setRemoteStreams([]);
    setLastError(null);
    pendingOfferRef.current = false;
  }, []);

  // Dispose of peer connections, data channels, and signaling socket.
  const closeResources = useCallback(() => {
    const timer = reconnectTimerRef.current;
    if (timer !== null) {
      window.clearTimeout(timer);
      reconnectTimerRef.current = null;
    }

    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      try {
        socket.close();
      } catch {
        // ignore close errors while reclaiming resources
      }
    }

    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    const pc = pcRef.current;
    if (pc) {
      pc.getSenders().forEach((sender) => {
        try {
          pc.removeTrack(sender);
        } catch {
          // ignore removal errors
        }
      });
      pc.close();
    }
    pcRef.current = null;

    remotePeerIdRef.current = null;
    joinedRef.current = false;
    setRemoteStreams([]);
  }, [setRemoteStreams]);

  // Build or tear down the full WebRTC stack whenever the selected robot changes.
  useEffect(() => {
    if (!robotId || !controllerId) {
      closeResources();
      resetState();
      return;
    }

    // Wait for the camera config to be loaded before establishing a session.
    if (cameraInfos === null) {
      closeResources();
      resetState();
      return;
    }

    closeResources();
    resetState();

    const currentRobotId = robotId;
    const operatorPeerId = createRuntimeSafeId("operator");
    let cancelled = false;

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    // Tracks which configured camera labels are still unassigned to incoming tracks.
    const availableCameraLabels = new Set(expectedCameras);
    // Remembers which track ID has been paired with which camera label for stable UI naming.
    const assignedByTrack = new Map<string, string | null>();
    // Keeps track of synthetic MediaStreams we create when remote streams bundle multiple tracks.
    const syntheticStreamsByTrack = new Map<string, MediaStream>();

    const parseCameraLabel = (trackId: string | undefined): string | null => {
      if (!trackId) {
        return null;
      }
      const prefix = "camera::";
      return trackId.startsWith(prefix) ? trackId.slice(prefix.length) : null;
    };

    const allocateCameraLabel = (requested: string | null): string | null => {
      if (requested && availableCameraLabels.has(requested)) {
        availableCameraLabels.delete(requested);
        return requested;
      }
      const next = availableCameraLabels.values().next();
      if (!next.done) {
        availableCameraLabels.delete(next.value);
        return next.value;
      }
      return requested;
    };

    // Pre-flight a recvonly transceiver per expected camera so the offer advertises enough slots.
    const videoSlots = Math.max(expectedCameras.length, 1);
    for (let index = 0; index < videoSlots; index += 1) {
      try {
        pc.addTransceiver("video", { direction: "recvonly" });
      } catch (error) {
        console.warn(
          "Failed to add video transceiver; remote video may be unavailable.",
          error
        );
        break;
      }
    }

    pc.ontrack = (event) => {
      const track = event.track;
      if (!track) {
        return;
      }
      const trackId = track.id ?? createRuntimeSafeId("track");
      const requested = parseCameraLabel(trackId);
      let cameraLabel = assignedByTrack.get(trackId) ?? null;
      if (!cameraLabel) {
        cameraLabel = allocateCameraLabel(requested);
        assignedByTrack.set(trackId, cameraLabel);
      }

      // Use the remote stream when it only carries this track; otherwise synthesize a dedicated stream.
      const [remoteStream] = event.streams ?? [];
      let stream: MediaStream;
      if (remoteStream) {
        const videoTracks = remoteStream.getVideoTracks();
        if (videoTracks.length <= 1) {
          stream = remoteStream;
        } else {
          stream = syntheticStreamsByTrack.get(trackId) ?? new MediaStream();
          if (!syntheticStreamsByTrack.has(trackId)) {
            syntheticStreamsByTrack.set(trackId, stream);
          }
          const currentTracks = stream.getTracks();
          if (!currentTracks.includes(track)) {
            stream.addTrack(track);
          }
        }
      } else {
        stream = syntheticStreamsByTrack.get(trackId) ?? new MediaStream();
        if (!syntheticStreamsByTrack.has(trackId)) {
          syntheticStreamsByTrack.set(trackId, stream);
        }
        const currentTracks = stream.getTracks();
        if (!currentTracks.includes(track)) {
          stream.addTrack(track);
        }
      }

      const entryCamera = cameraLabel ?? requested ?? null;
      setRemoteStreams((prev) => {
        const next = [...prev];
        const existing = next.findIndex((item) => item.id === trackId);
        const updated = { id: trackId, camera: entryCamera, stream };
        if (existing >= 0) {
          next[existing] = updated;
        } else {
          next.push(updated);
        }
        return next;
      });

      track.onended = () => {
        // Drop the ended track from state and free its camera label for future tracks.
        setRemoteStreams((prev) => prev.filter((item) => item.id !== trackId));
        const assigned = assignedByTrack.get(trackId);
        if (assigned) {
          availableCameraLabels.add(assigned);
        }
        assignedByTrack.delete(trackId);
        if (syntheticStreamsByTrack.has(trackId)) {
          const syntheticStream = syntheticStreamsByTrack.get(trackId);
          syntheticStream?.getTracks().forEach((mediaTrack) => {
            syntheticStream.removeTrack(mediaTrack);
          });
          syntheticStreamsByTrack.delete(trackId);
        }
      };
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      setSignalingState(pc.signalingState);
    };

    const dataChannel = pc.createDataChannel("telemetry", { ordered: true });
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      setTelemetryOpen(true);
    };

    dataChannel.onclose = () => {
      setTelemetryOpen(false);
    };

    dataChannel.onerror = () => {
      setLastError("Telemetry channel error");
    };

    dataChannel.onmessage = (event) => {
      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = null;
        }
      } else if (payload instanceof ArrayBuffer) {
        try {
          const decoded = new TextDecoder().decode(payload);
          payload = JSON.parse(decoded);
        } catch {
          payload = null;
        }
      }

      if (!payload) {
        return;
      }

      telemetryListenersRef.current.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error("Telemetry listener failed:", error);
        }
      });
    };

    const sendSignalingMessage = async (
      payload: Record<string, unknown>
    ): Promise<void> => {
      if (cancelled) {
        return;
      }
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        socket.send(
          JSON.stringify({
            ...payload,
            room_id: currentRobotId,
            sender_id: operatorPeerId,
          })
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to send signaling message:", error);
        }
      }
    };

    const ensureNegotiation = async () => {
      if (pendingOfferRef.current) {
        return;
      }
      const target = remotePeerIdRef.current;
      if (!target) {
        return;
      }
      pendingOfferRef.current = true;
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        const offerPayload: Record<string, unknown> = {
          type: "offer",
          target_id: target,
          input_device:  controllerId,
          sdp: {
            type: offer.type,
            sdp: offer.sdp ?? "",
          },
        };

        await sendSignalingMessage(offerPayload);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to create/send offer:", error);
          setLastError("Failed to negotiate WebRTC session");
        }
      } finally {
        pendingOfferRef.current = false;
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSignalingMessage = async (message: Record<string, any>) => {
      switch (message.type) {
        case "join-ack": {
          const peerRoles =
            (message.peer_roles as Record<string, string>) ?? {};
          const robotEntry = Object.entries(peerRoles).find(
            ([, role]) => role === "robot"
          );
          if (robotEntry) {
            remotePeerIdRef.current = robotEntry[0];
            await ensureNegotiation();
          } else {
            remotePeerIdRef.current = null;
          }
          break;
        }
        case "peer-joined":
          if (message.role === "robot") {
            remotePeerIdRef.current = message.peer_id as string;
            await ensureNegotiation();
          }
          break;
        case "answer":
          if (
            message.sdp &&
            message.peer_id === remotePeerIdRef.current &&
            typeof message.sdp.sdp === "string" &&
            typeof message.sdp.type === "string"
          ) {
            try {
              await pc.setRemoteDescription({
                type: message.sdp.type,
                sdp: message.sdp.sdp,
              });
            } catch (error) {
              console.warn("Failed to apply remote answer:", error);
            }
          }
          break;
        case "ice":
          if (message.candidate) {
            try {
              await pc.addIceCandidate(message.candidate);
            } catch (error) {
              console.warn("Failed to add ICE candidate:", error);
            }
          }
          break;
        case "peer-left":
          if (message.peer_id === remotePeerIdRef.current) {
            remotePeerIdRef.current = null;
            setTelemetryOpen(false);
            setRemoteStreams([]);
          }
          break;
        case "error":
          setLastError(
            message.message ?? "Signaling server reported an error."
          );
          break;
        default:
          break;
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }
      const target = remotePeerIdRef.current;
      if (!target) {
        return;
      }
      void sendSignalingMessage({
        type: "ice",
        target_id: target,
        candidate: event.candidate.toJSON(),
      });
    };

    const scheduleReconnect = () => {
      if (cancelled) {
        return;
      }
      if (reconnectTimerRef.current !== null) {
        return;
      }
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        if (!cancelled) {
          openWebSocket();
        }
      }, 2_000);
    };

    const openWebSocket = () => {
      if (cancelled) {
        return;
      }
      const existing = socketRef.current;
      if (
        existing &&
        (existing.readyState === WebSocket.OPEN ||
          existing.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const endpoints = signalingConfigRef.current;
      const targetUrl =
        endpoints.wsUrl ?? `${endpoints.baseUrl.replace(/\/+$/, "")}/ws`;

      try {
        const socket = new WebSocket(targetUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          if (cancelled) {
            socket.close();
            return;
          }
          const joinPayload = {
            type: "join",
            room_id: currentRobotId,
            peer_id: operatorPeerId,
            role: "operator",
          };
          try {
            socket.send(JSON.stringify(joinPayload));
          } catch (error) {
            console.error("Failed to send join payload:", error);
          }
        };

        socket.onmessage = async (event: MessageEvent) => {
          if (cancelled) {
            return;
          }

          let rawData: string;
          if (typeof event.data === "string") {
            rawData = event.data;
          } else if (event.data instanceof Blob) {
            rawData = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            rawData = new TextDecoder().decode(event.data);
          } else {
            console.warn(
              "Unsupported signaling payload type:",
              typeof event.data
            );
            return;
          }

          let message: Record<string, unknown> | null = null;
          try {
            message = JSON.parse(rawData);
          } catch (error) {
            console.warn("Failed to parse signaling payload:", error);
            return;
          }

          if (!message || typeof message !== "object") {
            return;
          }

          if (message.type === "error") {
            setLastError(
              (message.detail as string) ??
                (message.message as string) ??
                "Signaling server reported an error."
            );
            return;
          }

          if (message.type === "join-ack") {
            joinedRef.current = true;
            setSignalingConnected(true);
            setLastError(null);
          }

          await handleSignalingMessage(message);
        };

        socket.onerror = (event) => {
          if (!cancelled) {
            console.error("Signaling websocket error:", event);
          }
        };

        socket.onclose = (event) => {
          if (socketRef.current === socket) {
            socketRef.current = null;
          }
          if (reconnectTimerRef.current !== null) {
            window.clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
          if (joinedRef.current && event.wasClean) {
            console.info(
              "Signaling websocket closed:",
              event.reason || "normal closure"
            );
          }
          joinedRef.current = false;
          remotePeerIdRef.current = null;
          setSignalingConnected(false);
          setTelemetryOpen(false);
          setRemoteStreams([]);
          if (!cancelled) {
            scheduleReconnect();
          }
        };
      } catch (error) {
        console.error("Failed to open signaling websocket:", error);
        scheduleReconnect();
      }
    };

    openWebSocket();

    return () => {
      cancelled = true;
      const timer = reconnectTimerRef.current;
      if (timer !== null) {
        window.clearTimeout(timer);
        reconnectTimerRef.current = null;
      }
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(
              JSON.stringify({
                type: "leave",
                room_id: currentRobotId,
                sender_id: operatorPeerId,
              })
            );
          } catch {
            // ignore send errors during shutdown
          }
        }
        try {
          socket.close();
        } catch {
          // ignore close errors during shutdown
        }
      }
      joinedRef.current = false;
      closeResources();
      resetState();
    };
  }, [robotId, controllerId, cameraInfos, expectedCameras, closeResources, resetState]);

  // Allow callers to subscribe to decoded telemetry payloads.
  const onTelemetry = useCallback((listener: TelemetryListener) => {
    telemetryListenersRef.current.add(listener);
    return () => {
      telemetryListenersRef.current.delete(listener);
    };
  }, []);

  // Push control messages over the telemetry channel, normalizing payload format.
  const sendControl = useCallback((payload: unknown) => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      return false;
    }
    try {
      let envelope: unknown = payload;
      if (
        !payload ||
        typeof payload !== "object" ||
        !("type" in (payload as Record<string, unknown>))
      ) {
        envelope = { type: "command", data: payload };
      }
      channel.send(JSON.stringify(envelope));
      return true;
    } catch (error) {
      console.error("Failed to send command payload:", error);
      return false;
    }
  }, []);

  return useMemo(
    () => ({
      robotId,
      connectionState,
      signalingState,
      signalingConnected,
      telemetryOpen,
      remoteStreams,
      expectedCameras,
      lastError,
      onTelemetry,
      sendControl,
    }),
    [
      robotId,
      connectionState,
      signalingState,
      signalingConnected,
      telemetryOpen,
      remoteStreams,
      expectedCameras,
      lastError,
      onTelemetry,
      sendControl,
    ]
  );
};
