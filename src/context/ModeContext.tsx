import React, { ReactNode, useCallback, useState } from "react";
import {
  AppMode,
  MODE_LABELS,
  ModeContext,
  ModeContextType,
} from "./ModeContextDef";

// Provider props interface
interface ModeProviderProps {
  children: ReactNode;
  initialMode?: AppMode;
}

// Mode provider component to wrap the application
export const ModeProvider: React.FC<ModeProviderProps> = ({
  children,
  initialMode = AppMode.TRAINING,
}) => {
  const [mode, setMode] = useState<AppMode>(initialMode);

  const getModeLabel = useCallback(() => {
    return MODE_LABELS[mode];
  }, [mode]);

  const value: ModeContextType = {
    mode,
    setMode,
    getModeLabel,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};
