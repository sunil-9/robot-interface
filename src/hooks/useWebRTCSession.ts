import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchSignalingConfig } from "@/lib/api";
import { cloudConfig } from "@/lib/config";

type TelemetryListener = (message: unknown) => void;

export interface WebRTCSession {
  robotId: string | null;
  connectionState: RTCPeerConnectionState | "new";
  signalingState: RTCSignalingState | "new";
  signalingConnected: boolean;
  telemetryOpen: boolean;
  remoteStream: MediaStream | null;
  lastError: string | null;
  onTelemetry: (listener: TelemetryListener) => () => void;
  sendControl: (payload: unknown) => boolean;
}

export const useWebRTCSession = (robotId: string | null): WebRTCSession => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const telemetryListenersRef = useRef<Set<TelemetryListener>>(new Set());
  const pendingOfferRef = useRef(false);
  const signalingUrlRef = useRef<string>(cloudConfig.signalingWsUrl);

  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState | "new">("new");
  const [signalingState, setSignalingState] =
    useState<RTCSignalingState | "new">("new");
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Discover which signaling server URL to use before establishing a session.
  useEffect(() => {
    if (cloudConfig.signalingOverride) {
      signalingUrlRef.current = cloudConfig.signalingWsUrl;
      return;
    }

    let disposed = false;
    const resolveSignalingUrl = async () => {
      const discovered = await fetchSignalingConfig();
      if (!disposed && discovered) {
        signalingUrlRef.current = discovered;
      }
    };

    resolveSignalingUrl();

    return () => {
      disposed = true;
    };
  }, []);

  // Reset the public session fields so the UI starts from a clean slate.
  const resetState = useCallback(() => {
    setConnectionState("new");
    setSignalingState("new");
    setSignalingConnected(false);
    setTelemetryOpen(false);
    setRemoteStream(null);
    setLastError(null);
  }, []);

  // Dispose of peer connections, tracks, sockets, and cached peer IDs.
  const closeResources = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    pcRef.current?.getSenders().forEach((sender) => {
      try {
        pcRef.current?.removeTrack(sender);
      } catch {
        // ignore
      }
    });
    pcRef.current?.close();
    pcRef.current = null;

    wsRef.current?.close();
    wsRef.current = null;

    remotePeerIdRef.current = null;
  }, []);

  // Build or tear down the full WebRTC stack whenever the selected robot changes.
  useEffect(() => {
    if (!robotId) {
      closeResources();
      resetState();
      return;
    }

    resetState();
    const operatorPeerId = `operator-${crypto.randomUUID()}`;
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    try {
      pc.addTransceiver("video", { direction: "recvonly" });
    } catch (error) {
      console.warn("Failed to add video transceiver; remote video may be unavailable.", error);
    }
    // TODO: Multiple Streams support
    // Merge all tracks from the robot into a single MediaStream exposed to React state.
    pc.ontrack = (event) => {
      console.info("Received remote track", {
        id: event.track?.id,
        kind: event.track?.kind,
        streams: event.streams?.map((remote) => remote.id) ?? [],
      });
      if (event.streams && event.streams.length > 0) {
        setRemoteStream(event.streams[0]);
      } else if (event.track) {
        const fallbackStream = new MediaStream([event.track]);
        setRemoteStream(fallbackStream);
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      setSignalingState(pc.signalingState);
    };

    // Send ICE candidates to the robot
    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }
      const target = remotePeerIdRef.current;
      const ws = wsRef.current;
      if (!target || !ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      ws.send(
        JSON.stringify({
          type: "ice",
          room_id: robotId,
          target_id: target,
          candidate: event.candidate.toJSON(),
        })
      );
    };

    // Reliable data channel carries telemetry from the robot and control commands back.
    const dataChannel = pc.createDataChannel("telemetry", {
      ordered: true,
    });
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      setTelemetryOpen(true);
    };

    dataChannel.onclose = () => {
      setTelemetryOpen(false);
    };

    dataChannel.onerror = (event) => {
      console.error("Telemetry data channel error:", event);
      setLastError("Telemetry channel error");
    };

    // Receive telemetry payloads from the robot
    dataChannel.onmessage = (event) => {
      // Coerce incoming telemetry payloads into JSON objects before broadcasting.
      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          // ignore malformed telemetry
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

    const signalingUrl = signalingUrlRef.current;
    const ws = new WebSocket(signalingUrl);
    wsRef.current = ws;

    // Send join request to the signaling server
    ws.onopen = () => {
      setSignalingConnected(true);
      ws.send(
        JSON.stringify({
          type: "join",
          room_id: robotId,
          peer_id: operatorPeerId,
          role: "operator",
        })
      );
    };

    // Operator drives the offer side once both peers are in the signaling room.
    const ensureNegotiation = async () => {
      if (pendingOfferRef.current) {
        return;
      }
      const target = remotePeerIdRef.current;
      if (!target || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }
      pendingOfferRef.current = true;
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        wsRef.current.send(
          JSON.stringify({
            type: "offer",
            room_id: robotId,
            target_id: target,
            sdp: {
              type: offer.type,
              sdp: offer.sdp,
            },
          })
        );
      } catch (error) {
        console.error("Failed to create/send offer:", error);
        setLastError("Failed to negotiate WebRTC session");
      } finally {
        pendingOfferRef.current = false;
      }
    };

    // Handle signaling messages from the cloud service to complete negotiation.
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
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
              console.info("Waiting for robot peer to join signaling room.");
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
              message.peer_id === remotePeerIdRef.current
            ) {
              const { sdp, type } = message.sdp;
              try {
                await pc.setRemoteDescription({ type, sdp });
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
            }
            break;
          case "error":
            setLastError(message.message ?? "Signaling server reported an error.");
            break;
          default:
            break;
        }
      } catch (error) {
        console.error("Failed to handle signaling message:", error);
      }
    };

    ws.onerror = (event) => {
      console.error("Signaling websocket error:", event);
      setLastError("Signaling connection error");
    };

    ws.onclose = () => {
      setSignalingConnected(false);
    };

    return () => {
      closeResources();
      resetState();
    };
  }, [robotId, resetState, closeResources]);

  // Allow callers to subscribe to decoded telemetry payloads.
  const onTelemetry = useCallback((listener: TelemetryListener) => {
    telemetryListenersRef.current.add(listener);
    return () => {
      telemetryListenersRef.current.delete(listener);
    };
  }, []);

  // TODO: This is a placeholder for the actual control messages. To be defined later
  // Push control messages over the telemetry channel, normalizing payload format.
  const sendControl = useCallback(
    (payload: unknown) => {
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
    },
    []
  );

  return useMemo(
    () => ({
      robotId,
      connectionState,
      signalingState,
      signalingConnected,
      telemetryOpen,
      remoteStream,
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
      remoteStream,
      lastError,
      onTelemetry,
      sendControl,
    ]
  );
};
