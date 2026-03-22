import { type ReactNode, useEffect, useState } from "react";

import {
  type AuthUser,
  clearStoredAuthSession,
  fetchCurrentUser,
  loadStoredAuthSession,
  loginUser,
  registerUser,
  saveStoredAuthSession,
} from "@/services/authApi";

import {
  AuthSessionContext,
  type AuthSessionContextType,
} from "./AuthSessionContextDef";

interface AuthSessionProviderProps {
  children: ReactNode;
}

export const AuthSessionProvider = ({
  children,
}: AuthSessionProviderProps) => {
  const [session, setSession] = useState(() => loadStoredAuthSession());
  const [isLoadingUser, setIsLoadingUser] = useState(
    () => Boolean(loadStoredAuthSession()?.accessToken),
  );

  const accessToken = session?.accessToken ?? null;
  const user = session?.user ?? null;

  useEffect(() => {
    if (!accessToken) {
      setIsLoadingUser(false);
      return;
    }

    let cancelled = false;
    setIsLoadingUser(true);

    const syncUser = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        if (cancelled) {
          return;
        }
        const nextSession = { accessToken, user: currentUser };
        setSession(nextSession);
        saveStoredAuthSession(nextSession);
      } catch {
        if (cancelled) {
          return;
        }
        clearStoredAuthSession();
        setSession(null);
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

  useEffect(() => {
    const syncFromStorage = () => {
      setSession(loadStoredAuthSession());
    };

    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const applySession = (nextSession: { accessToken: string; user: AuthUser }) => {
    setSession(nextSession);
    saveStoredAuthSession(nextSession);
    return nextSession.user;
  };

  const login = async (email: string, password: string) =>
    applySession(await loginUser({ email, password }));

  const register = async (email: string, password: string, fullName?: string) =>
    applySession(await registerUser({ email, password, fullName }));

  const logout = () => {
    clearStoredAuthSession();
    setSession(null);
    setIsLoadingUser(false);
  };

  const refreshUser = async () => {
    if (!accessToken) {
      setSession(null);
      return null;
    }

    const currentUser = await fetchCurrentUser();
    const nextSession = { accessToken, user: currentUser };
    setSession(nextSession);
    saveStoredAuthSession(nextSession);
    return currentUser;
  };

  const value: AuthSessionContextType = {
    accessToken,
    user,
    isAuthenticated: Boolean(accessToken && user),
    isLoadingUser,
    login,
    logout,
    refreshUser,
    register,
  };

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};
