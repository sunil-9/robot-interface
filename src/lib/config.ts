const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const rawApiBase =
  (import.meta.env.VITE_CLOUD_API_BASE_URL as string | undefined) ??
  "http://127.0.0.1:8100";

const normalizedApiBase = trimTrailingSlash(rawApiBase);

const inferSignalingBaseUrl = (apiUrl: string): string => {
  try {
    const url = new URL(apiUrl);
    const scheme = url.protocol === "https:" ? "https:" : "http:";
    return `${scheme}//${url.host}/signaling`;
  } catch (error) {
    console.warn("Failed to infer signaling base URL from API base:", error);
    return "http://127.0.0.1:8100/signaling";
  }
};

const signalingOverride =
  (import.meta.env.VITE_CLOUD_SIGNALING_BASE_URL as string | undefined) ?? null;

export const cloudConfig = {
  apiBaseUrl: normalizedApiBase,
  signalingBaseUrl: trimTrailingSlash(
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

export const buildSignalingUrl = (path = "/signaling"): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const base = cloudConfig.signalingBaseUrl.replace(/\/signaling$/, "");
  return `${base}${suffix}`;
};

export type CloudConfig = typeof cloudConfig;
