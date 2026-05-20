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

const PLACEHOLDER_SELECTIONS = new Set([
  "",
  "unknown",
  "undefined",
  "null",
  "none",
]);

export const normalizeSessionSelection = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return PLACEHOLDER_SELECTIONS.has(trimmed.toLowerCase()) ? null : trimmed;
};

const normalizeControllerKey = (value: unknown): string | null => {
  const selection = normalizeSessionSelection(value);
  if (!selection) {
    return null;
  }
  const normalized = selection.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized || null;
};

export const isSessionControllerAvailable = (
  controllerId: unknown,
  devices: Array<{ id?: unknown }>,
): boolean => {
  const normalizedControllerId = normalizeControllerKey(controllerId);
  if (!normalizedControllerId) {
    return false;
  }

  return devices.some(
    (device) => normalizeControllerKey(device.id) === normalizedControllerId,
  );
};

const hasOwn = <T extends object>(value: T, key: keyof T): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

// Robot Session Data
export const getSessionRobotData = (): SessionRobotData | null => {
  try {
    const stored = sessionStorage.getItem(KEYS.SESSION_ROBOT_DATA);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      robot: normalizeSessionSelection(parsed.robot),
      controller: normalizeSessionSelection(parsed.controller),
      mode: parsed.mode ?? null,
      timestamp: parsed.timestamp ?? "",
    };
  } catch (e) {
    console.error("Failed to parse session robot data", e);
    return null;
  }
};

export const setSessionRobotData = (data: Partial<SessionRobotData>): void => {
  const current = getSessionRobotData();
  const updated: SessionRobotData = {
    robot: hasOwn(data, "robot")
      ? normalizeSessionSelection(data.robot)
      : (current?.robot ?? null),
    controller: hasOwn(data, "controller")
      ? normalizeSessionSelection(data.controller)
      : (current?.controller ?? null),
    mode: hasOwn(data, "mode") ? (data.mode ?? null) : (current?.mode ?? null),
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
