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
import { clearAuthSessionState } from "@/lib/sessionStore";

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

  const stripSessionQueryParamsAndReload = () => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const hadRobot = currentUrl.searchParams.has("robot");
    const hadController = currentUrl.searchParams.has("controller");

    if (!hadRobot && !hadController) {
      return;
    }

    currentUrl.searchParams.delete("robot");
    currentUrl.searchParams.delete("controller");

    const nextSearch = currentUrl.searchParams.toString();
    const nextUrl = `${currentUrl.pathname}${
      nextSearch ? `?${nextSearch}` : ""
    }${currentUrl.hash}`;

    window.history.replaceState(null, "", nextUrl);
    window.location.reload();
  };

  const clearOperatorSession = () => {
    clearStoredAuthSession();
    clearAuthSessionState();
    setSession(null);
    setIsLoadingUser(false);
    stripSessionQueryParamsAndReload();
  };

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
        clearOperatorSession();
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
    clearOperatorSession();
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
