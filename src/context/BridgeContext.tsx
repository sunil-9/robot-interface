import React, { ReactNode, useState } from "react";
import { getWebSocketConfig } from "../utils/websocketConfig";
import { BridgeContext, BridgeContextType } from "./BridgeContextDef";

// Provider props interface
interface BridgeProviderProps {
  children: ReactNode;
}

// Bridge provider component to wrap the application
export const BridgeProvider: React.FC<BridgeProviderProps> = ({ children }) => {
  const [state] = useState<BridgeContextType>({
    config: getWebSocketConfig(),
    isLoading: false,
    error: null,
  });

  // If we want to add functionality to reload the config in the future
  // we could add it here

  return (
    <BridgeContext.Provider value={state}>{children}</BridgeContext.Provider>
  );
};
