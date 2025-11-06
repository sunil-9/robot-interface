import { createContext } from "react";
import { WebSocketConfig } from "../utils/websocketConfig";

// Define the context type
export interface BridgeContextType {
  config: WebSocketConfig;
  isLoading: boolean;
  error: string | null;
}

// Create context with default undefined value
export const BridgeContext = createContext<BridgeContextType | undefined>(
  undefined
);
