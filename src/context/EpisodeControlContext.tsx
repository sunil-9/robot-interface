/**
 * Episode Control Context
 * Provides shared episode control state and actions across components
 */

import { toast } from "@/components/ui/use-toast";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import {
  createContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";

export interface EpisodeControlState {
  isRecording: boolean;
  currentEpisodeId: string | null;
  isLoading: boolean;
  isSavingEpisode: boolean;
  selectedDataset: string;
}

export interface EpisodeControlActions {
  startEpisode: () => Promise<boolean>;
  endEpisode: () => Promise<boolean>;
  setSelectedDataset: (datasetId: string) => void;
  setSession: (session: WebRTCSession | null) => void;
  setRobotId: (robotId: string | null) => void;
  setControllerId: (controllerId: string | null) => void;
  setIsSavingEpisode: (saving: boolean) => void;
  // For ACK/NACK handlers
  setIsRecording: (recording: boolean) => void;
  setCurrentEpisodeId: (episodeId: string | null) => void;
}

export type EpisodeControlContextValue = EpisodeControlState &
  EpisodeControlActions;

// Export context for hook file
export const EpisodeControlContext =
  createContext<EpisodeControlContextValue | null>(null);

interface EpisodeControlProviderProps {
  children: ReactNode;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
}

export function EpisodeControlProvider({
  children,
  onRecordingStart,
  onRecordingEnd,
}: EpisodeControlProviderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingEpisode, setIsSavingEpisode] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState("");

  // Store session and IDs in refs so they're always current in callbacks
  const sessionRef = useRef<WebRTCSession | null>(null);
  const robotIdRef = useRef<string | null>(null);
  const controllerIdRef = useRef<string | null>(null);
  const selectedDatasetRef = useRef(selectedDataset);
  selectedDatasetRef.current = selectedDataset;

  const setSession = useCallback((session: WebRTCSession | null) => {
    sessionRef.current = session;
  }, []);

  const setRobotId = useCallback((robotId: string | null) => {
    robotIdRef.current = robotId;
  }, []);

  const setControllerId = useCallback((controllerId: string | null) => {
    controllerIdRef.current = controllerId;
  }, []);

  const startEpisode = useCallback(async (): Promise<boolean> => {
    const datasetId = selectedDatasetRef.current;
    const session = sessionRef.current;
    const robotId = robotIdRef.current;
    const controllerId = controllerIdRef.current;

    if (!datasetId) {
      toast({
        title: "Error",
        description: "Select a dataset before starting an episode",
        variant: "destructive",
      });
      return false;
    }

    if (!robotId) {
      toast({
        title: "Error",
        description: "Select a robot before starting an episode",
        variant: "destructive",
      });
      return false;
    }

    if (!controllerId) {
      toast({
        title: "Error",
        description: "Select a control device before starting an episode",
        variant: "destructive",
      });
      return false;
    }

    if (!session) {
      toast({
        title: "Error",
        description: "No active session",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const sent = session.sendControl({
        type: "dataset",
        payload: {
          action: "start",
          datasetId,
        },
      });

      if (!sent) {
        toast({
          title: "Error",
          description: "Failed to send start request to robot",
          variant: "destructive",
        });
        return false;
      }

      setCurrentEpisodeId((prev) => prev ?? "pending");
      setIsRecording(true);
      onRecordingStart?.();
      return true;
    } catch (error) {
      console.error("Failed to start episode:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onRecordingStart]);

  const endEpisode = useCallback(async (): Promise<boolean> => {
    const datasetId = selectedDatasetRef.current;
    const session = sessionRef.current;

    if (!datasetId) {
      toast({
        title: "Error",
        description: "Select a dataset before ending an episode",
        variant: "destructive",
      });
      return false;
    }

    if (!session) {
      toast({
        title: "Error",
        description: "No active session",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const sent = session.sendControl({
        type: "dataset",
        payload: {
          action: "stop",
          datasetId,
        },
      });

      if (!sent) {
        toast({
          title: "Error",
          description: "Failed to send stop request to robot",
          variant: "destructive",
        });
        return false;
      }

      setIsRecording(false);
      setIsSavingEpisode(true);
      setCurrentEpisodeId(null);
      onRecordingEnd?.();
      return true;
    } catch (error) {
      console.error("Failed to end episode:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [onRecordingEnd]);

  const value: EpisodeControlContextValue = {
    // State
    isRecording,
    currentEpisodeId,
    isLoading,
    isSavingEpisode,
    selectedDataset,
    // Actions
    startEpisode,
    endEpisode,
    setSelectedDataset,
    setSession,
    setRobotId,
    setControllerId,
    setIsSavingEpisode,
    setIsRecording,
    setCurrentEpisodeId,
  };

  return (
    <EpisodeControlContext.Provider value={value}>
      {children}
    </EpisodeControlContext.Provider>
  );
}
