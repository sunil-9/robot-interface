import { API_CONFIG } from "@/config/api";

const knownOrigins = new Set<string>();

const addOrigin = (candidate?: string | null) => {
  if (!candidate) {
    return;
  }
  try {
    const parsed = new URL(candidate, API_CONFIG.BASE_URL);
    knownOrigins.add(parsed.origin);
  } catch (error) {
    console.warn("[apiResponse] Failed to parse API origin:", candidate, error);
  }
};

addOrigin(API_CONFIG.BASE_URL);

const isManagedApiOrigin = (responseUrl?: string): boolean => {
  if (!responseUrl) {
    return false;
  }
  try {
    const origin = new URL(responseUrl).origin;
    return knownOrigins.has(origin);
  } catch {
    return false;
  }
};

export interface ApiEnvelope<T> {
  status: number;
  code: string;
  detail: T;
}

const hasEnvelopeShape = (payload: unknown): payload is ApiEnvelope<unknown> => {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const record = payload as Record<string, unknown>;
  return (
    typeof record.status === "number" &&
    typeof record.code === "string" &&
    "detail" in record
  );
};

const shouldUnwrapPayload = (
  responseUrl: string | undefined,
  payload: unknown
): payload is ApiEnvelope<unknown> => {
  if (!hasEnvelopeShape(payload)) {
    return false;
  }
  return isManagedApiOrigin(responseUrl);
};

export const parseCloudApiResponse = async <T>(response: Response): Promise<T> => {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    console.warn(
      "[apiResponse] Failed to parse JSON response:",
      response.url,
      error
    );
    throw error;
  }
  if (shouldUnwrapPayload(response.url, payload)) {
    return (payload as ApiEnvelope<T>).detail;
  }
  return payload as T;
};

export const formatApiError = (
  detail: unknown,
  fallbackMessage = "Request failed"
): string => {
  if (detail === null || detail === undefined) {
    return fallbackMessage;
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (typeof detail === "number" || typeof detail === "boolean") {
    return String(detail);
  }
  if (typeof detail === "object") {
    const record = detail as Record<string, unknown>;
    if (typeof record.message === "string") {
      return record.message;
    }
    if (typeof record.detail === "string") {
      return record.detail;
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return fallbackMessage;
    }
  }
  return fallbackMessage;
};
