const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeSignalingBase = (value: string): string => {
  const trimmed = trimTrailingSlash(value);
  if (trimmed.startsWith("http://")) {
    return `ws://${trimmed.slice("http://".length)}`;
  }
  if (trimmed.startsWith("https://")) {
    return `wss://${trimmed.slice("https://".length)}`;
  }
  return trimmed;
};

const rawApiBase =
  (import.meta.env.VITE_CLOUD_API_BASE_URL as string | undefined) ??
  "http://127.0.0.1:8100";

const normalizedApiBase = trimTrailingSlash(rawApiBase);

const inferSignalingBaseUrl = (apiUrl: string): string => {
  try {
    const url = new URL(apiUrl);
    const scheme = url.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${url.host}/signaling`;
  } catch (error) {
    console.warn("Failed to infer signaling base URL from API base:", error);
    return "ws://127.0.0.1:8100/signaling";
  }
};

const signalingOverride =
  (import.meta.env.VITE_CLOUD_SIGNALING_BASE_URL as string | undefined) ?? null;

export const cloudConfig = {
  apiBaseUrl: normalizedApiBase,
  signalingBaseUrl: normalizeSignalingBase(
    signalingOverride ?? inferSignalingBaseUrl(normalizedApiBase)
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

export type CloudConfig = typeof cloudConfig;
