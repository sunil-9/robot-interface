/**
 * Hook for accessing EpisodeControlContext
 */

import {
  EpisodeControlContext,
  type EpisodeControlContextValue,
} from "@/context/EpisodeControlContext";
import { useContext } from "react";

export function useEpisodeControlContext(): EpisodeControlContextValue {
  const context = useContext(EpisodeControlContext);
  if (!context) {
    throw new Error(
      "useEpisodeControlContext must be used within EpisodeControlProvider",
    );
  }
  return context;
}
