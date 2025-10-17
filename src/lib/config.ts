const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const rawApiBase =
  (import.meta.env.VITE_CLOUD_API_BASE_URL as string | undefined) ??
  "http://127.0.0.1:8100";

const normalizedApiBase = trimTrailingSlash(rawApiBase);

const inferSignalingUrl = (apiUrl: string): string => {
  try {
    const url = new URL(apiUrl);
    const scheme = url.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${url.host}/signaling/ws`;
  } catch (error) {
    console.warn("Failed to infer signaling URL from API base:", error);
    return "ws://127.0.0.1:8100/signaling/ws";
  }
};

const signalingOverride =
  (import.meta.env.VITE_CLOUD_SIGNALING_WS as string | undefined) ?? null;

export const cloudConfig = {
  apiBaseUrl: normalizedApiBase,
  signalingWsUrl: trimTrailingSlash(
    signalingOverride ?? inferSignalingUrl(normalizedApiBase)
  ),
  signalingOverride,
};

export const buildApiUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${cloudConfig.apiBaseUrl}${suffix}`;
};

export const buildSignalingUrl = (path = "/signaling/ws"): string => {
  if (path.startsWith("ws://") || path.startsWith("wss://")) {
    return path;
  }
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const base = cloudConfig.signalingWsUrl.replace(/\/signaling\/ws$/, "");
  return `${base}${suffix}`;
};

export type CloudConfig = typeof cloudConfig;
