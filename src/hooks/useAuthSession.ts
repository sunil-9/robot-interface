import { useEffect, useState } from "react";

import {
  type AuthUser,
  clearStoredAuthSession,
  fetchCurrentUser,
  loadStoredAuthSession,
  loginUser,
  registerUser,
  saveStoredAuthSession,
} from "@/services/authApi";

const initialSession = loadStoredAuthSession();

export const useAuthSession = () => {
  const [accessToken, setAccessToken] = useState<string | null>(
    initialSession?.accessToken ?? null,
  );
  const [user, setUser] = useState<AuthUser | null>(initialSession?.user ?? null);
  const [isLoadingUser, setIsLoadingUser] = useState(Boolean(initialSession?.accessToken));

  useEffect(() => {
    if (!accessToken) {
      setIsLoadingUser(false);
      return;
    }

    let cancelled = false;
    setIsLoadingUser(true);

    const syncUser = async () => {
      try {
        const currentUser = await fetchCurrentUser(accessToken);
        if (cancelled) {
          return;
        }
        setUser(currentUser);
        saveStoredAuthSession({ accessToken, user: currentUser });
      } catch {
        if (cancelled) {
          return;
        }
        clearStoredAuthSession();
        setAccessToken(null);
        setUser(null);
      } finally {
        if (!cancelled) {
          setIsLoadingUser(false);
        }
      }
    };

    void syncUser();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const applySession = (session: { accessToken: string; user: AuthUser }) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    saveStoredAuthSession(session);
    return session.user;
  };

  const login = async (email: string, password: string) =>
    applySession(await loginUser({ email, password }));

  const register = async (email: string, password: string, fullName?: string) =>
    applySession(await registerUser({ email, password, fullName }));

  const logout = () => {
    clearStoredAuthSession();
    setAccessToken(null);
    setUser(null);
    setIsLoadingUser(false);
  };

  const refreshUser = async () => {
    if (!accessToken) {
      setUser(null);
      return null;
    }
    const currentUser = await fetchCurrentUser(accessToken);
    setUser(currentUser);
    saveStoredAuthSession({ accessToken, user: currentUser });
    return currentUser;
  };

  return {
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken && user),
    isLoadingUser,
    login,
    logout,
    refreshUser,
    register,
  };
};
