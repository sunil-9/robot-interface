import { useContext } from "react";

import {
  AuthSessionContext,
  type AuthSessionContextType,
} from "@/context/AuthSessionContextDef";

export const useAuthSession = (): AuthSessionContextType => {
  const context = useContext(AuthSessionContext);

  if (context === undefined) {
    throw new Error("useAuthSession must be used within an AuthSessionProvider");
  }

  return context;
};
