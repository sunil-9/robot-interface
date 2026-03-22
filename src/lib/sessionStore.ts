/**
 * Centralized auth-scoped session storage utility.
 * These values belong to the signed-in operator session and must be cleared
 * together when auth is lost or the user signs out.
 */

export interface SessionRobotData {
  robot: string | null;
  controller: string | null;
  mode: "train" | "test" | null;
  timestamp: string;
}

export interface SignalingConfig {
  signaling_base_url: string;
  webrtc_base_url: string;
  signaling_ws_url: string;
}

const KEYS = {
  SESSION_ROBOT_DATA: "sessionRobotData",
  SIGNALING_CONFIG: "signalingConfig",
  CONNECTION_READY: "connection_ready",
} as const;

const LOCAL_KEYS = {
  SELECTED_DATASET: "im-selected-dataset",
  LEGACY_CONTROLLER: "controller",
  LEGACY_SELECTED_CONTROL: "selectedControl",
  LEGACY_CONTROL_TYPE: "controlType",
} as const;

// Robot Session Data
export const getSessionRobotData = (): SessionRobotData | null => {
  try {
    const stored = sessionStorage.getItem(KEYS.SESSION_ROBOT_DATA);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Failed to parse session robot data", e);
    return null;
  }
};

export const setSessionRobotData = (data: Partial<SessionRobotData>): void => {
  const current = getSessionRobotData();
  const updated: SessionRobotData = {
    robot: data.robot ?? current?.robot ?? null,
    controller: data.controller ?? current?.controller ?? null,
    mode: data.mode ?? current?.mode ?? null,
    timestamp: new Date().toISOString(),
  };
  sessionStorage.setItem(KEYS.SESSION_ROBOT_DATA, JSON.stringify(updated));
};

export const clearSessionRobotData = (): void => {
  sessionStorage.removeItem(KEYS.SESSION_ROBOT_DATA);
};

// Convenience getters
export const getSelectedRobot = (): string | null => {
  return getSessionRobotData()?.robot ?? null;
};

export const getSelectedController = (): string | null => {
  return getSessionRobotData()?.controller ?? null;
};

export const getMode = (): SessionRobotData["mode"] => {
  return getSessionRobotData()?.mode ?? null;
};

// Signaling Config
export const getSignalingConfig = (): SignalingConfig | null => {
  try {
    const stored = sessionStorage.getItem(KEYS.SIGNALING_CONFIG);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;

    // Handle both old and new key formats
    const baseUrl = parsed.webrtc_base_url ?? parsed.signaling_base_url ?? null;
    const wsUrl = parsed.signaling_ws_url ?? null;

    if (!baseUrl && !wsUrl) return null;

    return {
      signaling_base_url: baseUrl,
      webrtc_base_url: baseUrl,
      signaling_ws_url: wsUrl,
    };
  } catch (e) {
    console.warn("Failed to parse signaling config", e);
    return null;
  }
};

export const setSignalingConfig = (config: {
  baseUrl: string;
  wsUrl: string;
}): void => {
  sessionStorage.setItem(
    KEYS.SIGNALING_CONFIG,
    JSON.stringify({
      signaling_base_url: config.baseUrl,
      webrtc_base_url: config.baseUrl,
      signaling_ws_url: config.wsUrl,
    }),
  );
  setConnectionReady(true);
};

// Connection Ready flag
export const isConnectionReady = (): boolean => {
  return sessionStorage.getItem(KEYS.CONNECTION_READY) === "1";
};

export const setConnectionReady = (ready: boolean): void => {
  if (ready) {
    sessionStorage.setItem(KEYS.CONNECTION_READY, "1");
  } else {
    sessionStorage.removeItem(KEYS.CONNECTION_READY);
  }
};

export const clearAuthSessionState = (): void => {
  try {
    sessionStorage.removeItem(KEYS.SESSION_ROBOT_DATA);
    sessionStorage.removeItem(KEYS.SIGNALING_CONFIG);
    sessionStorage.removeItem(KEYS.CONNECTION_READY);
  } catch {
    // Ignore storage access errors
  }

  try {
    localStorage.removeItem(LOCAL_KEYS.SELECTED_DATASET);
    localStorage.removeItem(LOCAL_KEYS.LEGACY_CONTROLLER);
    localStorage.removeItem(LOCAL_KEYS.LEGACY_SELECTED_CONTROL);
    localStorage.removeItem(LOCAL_KEYS.LEGACY_CONTROL_TYPE);
  } catch {
    // Ignore storage access errors
  }
};

export const clearAll = clearAuthSessionState;
