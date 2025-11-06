import { useContext } from "react";
import { ModeContext, ModeContextType } from "../context/ModeContextDef";

/**
 * Custom hook to access the mode context
 * @throws Error if used outside of ModeProvider
 * @returns ModeContextType with current mode, setMode function, and getModeLabel function
 */
export const useModeContext = (): ModeContextType => {
  const context = useContext(ModeContext);

  if (context === undefined) {
    throw new Error("useModeContext must be used within a ModeProvider");
  }

  return context;
};
