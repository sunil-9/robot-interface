import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchRobotCameras, fetchSignalingConfig, type RobotCameraConfig } from "@/lib/api";
import { cloudConfig } from "@/lib/config";

type TelemetryListener = (message: unknown) => void;

type SignalingEndpoints = {
  baseUrl: string;
  joinUrl: string;
  pollUrl: string;
  messageUrl: string;
};

const DEFAULT_POLL_TIMEOUT_MS = 25_000;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const createSignalingEndpoints = (baseUrl: string): SignalingEndpoints => {
  const normalized = trimTrailingSlash(baseUrl || cloudConfig.signalingBaseUrl);
  return {
    baseUrl: normalized,
    joinUrl: `${normalized}/join`,
    pollUrl: `${normalized}/poll`,
    messageUrl: `${normalized}/message`,
  };
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

export const useWebRTCSession = (robotId: string | null): WebRTCSession => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const telemetryListenersRef = useRef<Set<TelemetryListener>>(new Set());
  const pendingOfferRef = useRef(false);
  const signalingConfigRef = useRef<SignalingEndpoints>(
    createSignalingEndpoints(cloudConfig.signalingBaseUrl)
  );
  const pollAbortRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<number>(DEFAULT_POLL_TIMEOUT_MS);
  const joinedRef = useRef(false);

  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState | "new">("new");
  const [signalingState, setSignalingState] =
    useState<RTCSignalingState | "new">("new");
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamEntry[]>([]);
  const [cameraInfos, setCameraInfos] = useState<RobotCameraConfig[] | null>(null);
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
        joinUrl: discovered.joinUrl ?? fallback.joinUrl,
        pollUrl: discovered.pollUrl ?? fallback.pollUrl,
        messageUrl: discovered.messageUrl ?? fallback.messageUrl,
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

  // Build a list of camera names from the config.
  const expectedCameras = useMemo(() => {
    if (!cameraInfos) {
      return [] as string[];
    }
    return cameraInfos
      .map((camera) => (camera && typeof camera.name === "string" ? camera.name.trim() : null))
      .filter((name): name is string => !!name);
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

  // Dispose of peer connections, data channels, and background polls.
  const closeResources = useCallback(() => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;

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
    if (!robotId) {
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
    const operatorPeerId = `operator-${crypto.randomUUID()}`;
    let cancelled = false;

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    const availableCameraNames = new Set(expectedCameras);
    const assignedByTrack = new Map<string, string | null>();

    const parseCameraName = (trackId: string | undefined): string | null => {
      if (!trackId) {
        return null;
      }
      const prefix = "camera::";
      return trackId.startsWith(prefix) ? trackId.slice(prefix.length) : null;
    };

    const allocateCameraName = (requested: string | null): string | null => {
      if (requested && availableCameraNames.has(requested)) {
        availableCameraNames.delete(requested);
        return requested;
      }
      const next = availableCameraNames.values().next();
      if (!next.done) {
        availableCameraNames.delete(next.value);
        return next.value;
      }
      return requested;
    };

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
      const trackId = track.id ?? `track-${crypto.randomUUID()}`;
      const requested = parseCameraName(trackId);
      let cameraName = assignedByTrack.get(trackId) ?? null;
      if (!cameraName) {
        cameraName = allocateCameraName(requested);
        assignedByTrack.set(trackId, cameraName);
      }

      const stream =
        event.streams && event.streams.length > 0
          ? event.streams[0]
          : new MediaStream([track]);

      const entryCamera = cameraName ?? requested ?? null;
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
        setRemoteStreams((prev) => prev.filter((item) => item.id !== trackId));
        const assigned = assignedByTrack.get(trackId);
        if (assigned) {
          availableCameraNames.add(assigned);
        }
        assignedByTrack.delete(trackId);
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
      const { messageUrl } = signalingConfigRef.current;
      try {
        const response = await fetch(messageUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            room_id: currentRobotId,
            sender_id: operatorPeerId,
          }),
        });
        if (!response.ok && !cancelled) {
          const detail = await response.text();
          console.warn(
            `Signaling message '${String(payload.type ?? "unknown")}' failed (${response.status}): ${detail}`
          );
        }
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
        await sendSignalingMessage({
          type: "offer",
          target_id: target,
          sdp: {
            type: offer.type,
            sdp: offer.sdp ?? "",
          },
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to create/send offer:", error);
          setLastError("Failed to negotiate WebRTC session");
        }
      } finally {
        pendingOfferRef.current = false;
      }
    };

    const handleSignalingMessage = async (message: Record<string, any>) => {
      switch (message.type) {
        case "join-ack": {
          const peerRoles = (message.peer_roles as Record<string, string>) ?? {};
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

    const joinSignaling = async (): Promise<boolean> => {
      const { joinUrl } = signalingConfigRef.current;
      try {
        const response = await fetch(joinUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "join",
            room_id: currentRobotId,
            peer_id: operatorPeerId,
            role: "operator",
          }),
        });

        if (!response.ok) {
          if (!cancelled) {
            const detail = await response.text();
            console.warn(
              `Failed to join signaling (${response.status}): ${detail}`
            );
            setLastError("Failed to connect to signaling");
            setSignalingConnected(false);
          }
          return false;
        }

        const ack = (await response.json()) as Record<string, any>;
        const timeoutValue = ack.poll_timeout_ms ?? DEFAULT_POLL_TIMEOUT_MS;
        pollTimeoutRef.current =
          typeof timeoutValue === "number" && Number.isFinite(timeoutValue)
            ? timeoutValue
            : DEFAULT_POLL_TIMEOUT_MS;

        joinedRef.current = true;
        setSignalingConnected(true);
        setLastError(null);
        await handleSignalingMessage(ack);
        return true;
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to join signaling:", error);
          setLastError("Failed to connect to signaling");
          setSignalingConnected(false);
        }
        return false;
      }
    };

    const pollLoop = async (): Promise<boolean> => {
      const controller = new AbortController();
      pollAbortRef.current = controller;
      let shouldRejoin = false;

      try {
        while (!controller.signal.aborted && !cancelled) {
          try {
            const response = await fetch(signalingConfigRef.current.pollUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                room_id: currentRobotId,
                peer_id: operatorPeerId,
                timeout_ms:
                  pollTimeoutRef.current ?? DEFAULT_POLL_TIMEOUT_MS,
              }),
              signal: controller.signal,
            });

            if (response.status === 404) {
              shouldRejoin = true;
              setSignalingConnected(false);
              break;
            }

            if (!response.ok) {
              const detail = await response.text();
              console.warn(
                `Signaling poll failed (${response.status}) – retrying soon. Details: ${detail}`
              );
              await wait(2_000);
              continue;
            }

            const payload = (await response.json()) as {
              messages?: Record<string, any>[];
            };
            const messages = Array.isArray(payload.messages)
              ? payload.messages
              : [];
            for (const message of messages) {
              if (cancelled || controller.signal.aborted) {
                break;
              }
              await handleSignalingMessage(message);
            }
          } catch (error) {
            if (controller.signal.aborted || cancelled) {
              break;
            }
            console.error("Signaling poll error:", error);
            await wait(2_000);
          }
        }
      } finally {
        pollAbortRef.current = null;
        if (shouldRejoin) {
          joinedRef.current = false;
        }
      }

      return shouldRejoin && !cancelled;
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

    const run = async () => {
      while (!cancelled) {
        const joined = await joinSignaling();
        if (!joined) {
          await wait(3_000);
          continue;
        }

        const retry = await pollLoop();
        if (!retry || cancelled) {
          break;
        }
        setSignalingConnected(false);
        await wait(1_000);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (joinedRef.current) {
        const leavePayload = {
          type: "leave",
          room_id: currentRobotId,
          sender_id: operatorPeerId,
        };
        fetch(signalingConfigRef.current.messageUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(leavePayload),
        }).catch(() => undefined);
      }
      closeResources();
      resetState();
    };
  }, [robotId, cameraInfos, expectedCameras, closeResources, resetState]);

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
