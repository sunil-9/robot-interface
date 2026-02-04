/* Minimal WebRTC client for negotiating with backend signaling API
 * Exposes a React hook that can connect and provide MediaStreams for cameras.
 */

import { useEffect, useMemo, useState } from "react";

import { cloudConfig } from "@/lib/config";
import { getSelectedRobot, getSignalingConfig } from "@/lib/sessionStore";

type CameraId = "head" | "left" | "right";

type Listener = () => void;

type DataListener = (msg: unknown) => void;

let pc: RTCPeerConnection | null = null;
let peerId: string | null = null;
let connected = false;
const tracks: Partial<Record<CameraId, MediaStreamTrack>> = {};
const listeners: Listener[] = [];
const dataListeners: DataListener[] = [];

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const getSignalingEndpoints = () => {
  let baseUrl = cloudConfig.signalingBaseUrl;
  const storedConfig = getSignalingConfig();
  if (storedConfig) {
    baseUrl = storedConfig.webrtc_base_url || storedConfig.signaling_base_url;
  }

  const normalized = trimTrailingSlash(baseUrl);
  return {
    baseUrl: normalized,
    offerUrl: `${normalized}/offer`,
    iceUrl: `${normalized}/ice`,
  };
};

function notify() {
  listeners.forEach((l) => l());
}

function notifyData(msg: unknown) {
  dataListeners.forEach((l) => l(msg));
}

export function getWebRTCConnected() {
  return connected;
}

export function getCameraStream(id: CameraId): MediaStream | null {
  const track = tracks[id];
  return track ? new MediaStream([track]) : null;
}

export async function connectWebRTC() {
  if (connected && pc) {
    return true;
  }

  const endpoints = getSignalingEndpoints();

  const roomId = getSelectedRobot() ?? undefined;
  peerId = null;
  connected = false;

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onconnectionstatechange = () => {
    if (!pc) {
      return;
    }
    if (pc.connectionState === "connected") {
      connected = true;
      notify();
    }
    if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected" ||
      pc.connectionState === "closed"
    ) {
      connected = false;
      notify();
    }
  };

  pc.onicecandidate = async (event) => {
    if (!event.candidate || !peerId) {
      return;
    }
    try {
      await fetch(endpoints.iceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peer_id: peerId,
          candidate: event.candidate.toJSON(),
        }),
      });
    } catch (error) {
      console.warn("Failed to send ICE candidate:", error);
    }
  };

  pc.ontrack = (event) => {
    const order: CameraId[] = ["head", "left", "right"];
    const mid = event.transceiver?.mid ?? null;
    let id: CameraId = "head";
    if (mid !== null) {
      const index = Number.parseInt(mid, 10);
      if (!Number.isNaN(index) && order[index]) {
        id = order[index];
      }
    }
    const [remoteStream] = event.streams ?? [];
    if (remoteStream) {
      const [videoTrack] = remoteStream.getVideoTracks();
      if (videoTrack) {
        tracks[id] = videoTrack;
      }
    } else {
      tracks[id] = event.track;
    }
    notify();
  };

  for (let i = 0; i < 3; i += 1) {
    pc.addTransceiver("video", { direction: "recvonly" });
  }

  try {
    const dataChannel = pc.createDataChannel("telemetry", { ordered: true });
    dataChannel.onopen = () => {
      console.log("RTC data channel open");
    };
    dataChannel.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        notifyData(parsed);
      } catch (error) {
        console.warn("Failed to parse rtc data message", error);
      }
    };
    dataChannel.onclose = () => {
      console.log("RTC data channel closed");
    };
  } catch (error) {
    console.warn("Failed to create telemetry data channel:", error);
  }

  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: true,
  });
  await pc.setLocalDescription(offer);

  try {
    const response = await fetch(endpoints.offerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sdp: offer.sdp ?? "",
        type: offer.type ?? "offer",
        robot_id: roomId,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Offer failed (${response.status}): ${detail}`);
    }

    const answer = (await response.json()) as {
      peer_id?: string;
      sdp?: string;
      type?: RTCSessionDescriptionInit["type"];
    };

    if (!answer?.sdp) {
      throw new Error("Invalid answer from signaling server");
    }

    peerId = answer.peer_id ?? null;

    await pc.setRemoteDescription({
      type: answer.type ?? "answer",
      sdp: answer.sdp,
    });

    connected = true;
    notify();
    return true;
  } catch (error) {
    console.error("WebRTC negotiation failed:", error);
    connected = false;
    notify();
    try {
      await pc.close();
    } catch {
      /* ignore */
    }
    pc = null;
    return false;
  }
}

export function useWebRTCClient() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((value) => value + 1);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const api = useMemo(
    () => ({
      connected,
      version: tick,
      connect: connectWebRTC,
      getStream: (id: CameraId) => getCameraStream(id),
      addDataListener: (callback: DataListener) => {
        dataListeners.push(callback);
        return () => {
          const index = dataListeners.indexOf(callback);
          if (index >= 0) {
            dataListeners.splice(index, 1);
          }
        };
      },
    }),
    [tick],
  );

  return api;
}
