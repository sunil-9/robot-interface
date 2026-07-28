import { buildApiUrl, cloudConfig } from "@/lib/config";

const API_BASE_URL = new URL(cloudConfig.apiBaseUrl);
const API_BASE_PATH = API_BASE_URL.pathname.replace(/\/+$/, "") || "/";
const AUTH_STORAGE_KEY = "im.auth.session";

type AuthMode = "auto" | "always" | "never";

const loadStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { accessToken?: string } | null;
    const accessToken = parsed?.accessToken?.trim();
    return accessToken || null;
  } catch {
    return null;
  }
};

const isCloudApiUrl = (url: string): boolean => {
  const target = new URL(url, API_BASE_URL);
  if (target.origin !== API_BASE_URL.origin) {
    return false;
  }

  const targetPath = target.pathname.replace(/\/+$/, "") || "/";
  if (API_BASE_PATH === "/") {
    return true;
  }

  return targetPath === API_BASE_PATH || targetPath.startsWith(`${API_BASE_PATH}/`);
};

const shouldAttachAuth = (url: string, authMode: AuthMode): boolean => {
  if (authMode === "never") {
    return false;
  }
  if (authMode === "always") {
    return true;
  }
  return isCloudApiUrl(url);
};

const buildRequestHeaders = (
  url: string,
  authMode: AuthMode,
  headers?: HeadersInit,
): Headers => {
  const mergedHeaders = new Headers(headers);
  const accessToken = loadStoredAccessToken();

  if (accessToken && shouldAttachAuth(url, authMode) && !mergedHeaders.has("Authorization")) {
    mergedHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return mergedHeaders;
};

type ApiFetchOptions = RequestInit & {
  auth?: AuthMode;
};

export const apiFetch = (input: string, init: ApiFetchOptions = {}): Promise<Response> => {
  const { auth = "auto", headers, ...rest } = init;
  const url = buildApiUrl(input);
  return fetch(url, {
    ...rest,
    headers: buildRequestHeaders(url, auth, headers),
  });
};
