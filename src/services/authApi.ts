import { apiFetch } from "@/lib/apiClient";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";

const AUTH_STORAGE_KEY = "im.auth.session";

export interface AuthUser {
  userId: number;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
}

interface AuthPayloadResponse {
  user_id: number;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  access_token: string;
  token_type: string;
}

interface UserProfileResponse {
  user_id: number;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface ForgotPasswordResponse {
  message: string;
  reset_token: string | null;
}

export interface StoredAuthSession {
  accessToken: string;
  user: AuthUser | null;
}

const mapAuthUser = (
  payload: AuthPayloadResponse | UserProfileResponse,
): AuthUser => ({
  userId: payload.user_id,
  email: payload.email,
  fullName: payload.full_name,
  role: payload.role,
  createdAt: payload.created_at,
});

const buildJsonHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  return headers;
};

const parseError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = await parseCloudApiResponse<unknown>(response);
    return formatApiError(payload, fallbackMessage);
  } catch {
    return fallbackMessage;
  }
};

const postJson = async <TResponse>(
  path: string,
  body: unknown,
  fallbackMessage: string,
): Promise<TResponse> => {
  const response = await apiFetch(path, {
    method: "POST",
    auth: "never",
    headers: buildJsonHeaders(),
    body: JSON.stringify(body),
  });
  const payload = await parseCloudApiResponse<TResponse | unknown>(response);
  if (!response.ok) {
    throw new Error(formatApiError(payload, fallbackMessage));
  }
  return payload as TResponse;
};

export const loadStoredAuthSession = (): StoredAuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed?.accessToken) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      user: parsed.user ?? null,
    };
  } catch {
    return null;
  }
};

export const saveStoredAuthSession = (session: StoredAuthSession) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const clearStoredAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const registerUser = async (input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<{ accessToken: string; user: AuthUser }> => {
  const payload = await postJson<AuthPayloadResponse>(
    "/auth/register",
    {
      email: input.email,
      password: input.password,
      full_name: input.fullName?.trim() || null,
    },
    "Failed to create account.",
  );
  return {
    accessToken: payload.access_token,
    user: mapAuthUser(payload),
  };
};

export const loginUser = async (input: {
  email: string;
  password: string;
}): Promise<{ accessToken: string; user: AuthUser }> => {
  const payload = await postJson<AuthPayloadResponse>(
    "/auth/login",
    input,
    "Failed to sign in.",
  );
  return {
    accessToken: payload.access_token,
    user: mapAuthUser(payload),
  };
};

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const response = await apiFetch("/auth/me", {
    method: "GET",
    auth: "always",
    headers: buildJsonHeaders(),
  });
  const payload = await parseCloudApiResponse<UserProfileResponse | unknown>(
    response,
  );
  if (!response.ok) {
    throw new Error(formatApiError(payload, "Failed to load current user."));
  }
  return mapAuthUser(payload as UserProfileResponse);
};

export const requestPasswordReset = async (
  email: string,
): Promise<ForgotPasswordResponse> =>
  postJson<ForgotPasswordResponse>(
    "/auth/forgot-password",
    { email },
    "Failed to request password reset.",
  );

export const resetPassword = async (input: {
  resetToken: string;
  newPassword: string;
}): Promise<void> => {
  const response = await apiFetch("/auth/reset-password", {
    method: "POST",
    auth: "never",
    headers: buildJsonHeaders(),
    body: JSON.stringify({
      reset_token: input.resetToken,
      new_password: input.newPassword,
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, "Failed to update password."));
  }
};
