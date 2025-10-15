import { useContext } from "react";
import { BridgeContext, BridgeContextType } from "./BridgeContextDef";

// Custom hook to use the bridge context
export const useBridgeConfig = (): BridgeContextType => {
  const context = useContext(BridgeContext);
  if (context === undefined) {
    throw new Error("useBridgeConfig must be used within a BridgeProvider");
  }
  return context;
};
