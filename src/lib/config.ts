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

const resolveApiBaseUrl = (): string => {
  const primary = import.meta.env
    .VITE_CLOUD_API_BASE_URL as string | undefined;
  const local = import.meta.env
    .VITE_LOCAL_CLOUD_API_BASE_URL as string | undefined;

  const candidate = primary?.trim() || local?.trim();
  if (candidate) {
    return candidate;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    console.warn(
      "Falling back to window.origin for API base; set VITE_CLOUD_API_BASE_URL or VITE_LOCAL_CLOUD_API_BASE_URL."
    );
    return window.location.origin;
  }

  throw new Error(
    "No API base URL configured. Please set VITE_CLOUD_API_BASE_URL or VITE_LOCAL_CLOUD_API_BASE_URL."
  );
};

const rawApiBase = resolveApiBaseUrl();

const normalizedApiBase = trimTrailingSlash(rawApiBase);

const inferSignalingBaseUrl = (apiUrl: string): string => {
  try {
    const url = new URL(apiUrl);
    const scheme = url.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${url.host}/signaling`;
  } catch (error) {
    console.warn("Failed to infer signaling base URL from API base:", error);
    if (typeof window !== "undefined" && window.location?.host) {
      const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${scheme}//${window.location.host}/signaling`;
    }
    throw error;
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
