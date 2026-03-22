import { createContext } from "react";

import { AuthUser } from "@/services/authApi";

export interface AuthSessionContextType {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
  register: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<AuthUser>;
}

export const AuthSessionContext = createContext<
  AuthSessionContextType | undefined
>(undefined);
