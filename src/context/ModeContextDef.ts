import { createContext } from "react";

// Mode types enum for different operational modes
export enum AppMode {
  TRAINING = "training",
  RECORDING = "recording",
  REPLAY = "replay",
  POLICY_RUNNING = "policy_running",
}

// Mode display labels
export const MODE_LABELS: Record<AppMode, string> = {
  [AppMode.RECORDING]: "Recording Mode",
  [AppMode.TRAINING]: "Free exploration Mode",
  [AppMode.REPLAY]: "Replay Mode",
  [AppMode.POLICY_RUNNING]: "Policy Running Mode",
};

// Context type definition
export interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  getModeLabel: () => string;
}

// Create the context with undefined default value
export const ModeContext = createContext<ModeContextType | undefined>(
  undefined,
);
