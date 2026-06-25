/**
 * Episode Control Context
 * Provides shared episode control state and actions across components
 */

import { toast } from "@/components/ui/use-toast";
import { AppMode } from "@/context/ModeContextDef";
import { useAuthSession } from "@/hooks/useAuthSession";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import {
  createContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SELECTED_DATASET_STORAGE_KEY = "im-selected-dataset";

const normalizeDeployModelId = (modelId?: string | number | null) => {
  if (modelId === null || modelId === undefined) {
    return null;
  }
  const normalized = String(modelId).trim();
  return normalized || null;
};

export interface EpisodeControlState {
  isRecording: boolean;
  currentEpisodeId: string | null;
  isLoading: boolean;
  isSavingEpisode: boolean;
  selectedDataset: string;
  // Deploy state
  isDeploying: boolean;
  deployRequestPending: boolean;
  deployDatasetId: string | null;
  deployModelId: string | null;
  deployStatusPopupOpen: boolean;
  deployStatusMessage: string | null;
  // Pose state
  memorisedPose: { topics: Record<string, unknown> } | null;
  poseLoading: boolean;
  isRestoring: boolean;
}

export interface EpisodeControlActions {
  startEpisode: () => Promise<boolean>;
  endEpisode: () => Promise<boolean>;
  resetAuthSessionState: () => void;
  setSelectedDataset: (datasetName: string) => void;
  setSelectedDatasetId: (datasetId: string | null) => void;
  setSession: (session: WebRTCSession | null) => void;
  setRobotId: (robotId: string | null) => void;
  setControllerId: (controllerId: string | null) => void;
  setIsSavingEpisode: (saving: boolean) => void;
  // For ACK/NACK handlers
  setIsRecording: (recording: boolean) => void;
  setCurrentEpisodeId: (episodeId: string | null) => void;
  // Deploy actions
  handleDeploy: (modelId?: string | number | null) => Promise<boolean>;
  handleForceStopDeploy: () => Promise<boolean>;
  setIsDeploying: (deploying: boolean) => void;
  setDeployRequestPending: (pending: boolean) => void;
  setDeployDatasetId: (datasetId: string | null) => void;
  setDeployModelId: (modelId: string | null) => void;
  setDeployStatusPopupOpen: (open: boolean) => void;
  setDeployStatusMessage: (message: string | null) => void;
  // Pose actions
  handleMemorisePose: () => Promise<boolean>;
  handleRestorePose: () => Promise<boolean>;
  handleClearPose: () => Promise<boolean>;
  handleGetPose: () => Promise<void>;
  setMemorisedPose: (pose: { topics: Record<string, unknown> } | null) => void;
  setIsRestoring: (restoring: boolean) => void;
}

export type EpisodeControlContextValue = EpisodeControlState &
  EpisodeControlActions;

// Export context for hook file
export const EpisodeControlContext =
  createContext<EpisodeControlContextValue | null>(null);

interface EpisodeControlProviderProps {
  children: ReactNode;
  setMode?: (mode: AppMode) => void;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
}

export function EpisodeControlProvider({
  children,
  setMode,
  onRecordingStart,
  onRecordingEnd,
}: EpisodeControlProviderProps) {
  const { user } = useAuthSession();
  const [isRecording, setIsRecording] = useState(false);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingEpisode, setIsSavingEpisode] = useState(false);

  // Initialize selectedDataset from localStorage
  const [selectedDataset, setSelectedDatasetState] = useState(() => {
    try {
      return localStorage.getItem(SELECTED_DATASET_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });

  // Persist selectedDataset to localStorage when it changes
  const setSelectedDataset = useCallback((datasetName: string) => {
    setSelectedDatasetState(datasetName);
    try {
      if (datasetName) {
        localStorage.setItem(SELECTED_DATASET_STORAGE_KEY, datasetName);
      } else {
        localStorage.removeItem(SELECTED_DATASET_STORAGE_KEY);
        selectedDatasetIdRef.current = null;
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const selectedDatasetIdRef = useRef<string | null>(null);

  const setSelectedDatasetId = useCallback((datasetId: string | null) => {
    const normalized = typeof datasetId === "string" ? datasetId.trim() : "";
    selectedDatasetIdRef.current = normalized || null;
  }, []);

  // Deploy state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployRequestPending, setDeployRequestPending] = useState(false);
  const [deployDatasetId, setDeployDatasetId] = useState<string | null>(null);
  const [deployModelId, setDeployModelId] = useState<string | null>(null);
  const [deployStatusPopupOpen, setDeployStatusPopupOpen] = useState(false);
  const [deployStatusMessage, setDeployStatusMessage] = useState<string | null>(
    null,
  );

  // Pose state
  const [memorisedPose, setMemorisedPose] = useState<{ topics: Record<string, unknown> } | null>(null);
  const [poseLoading, setPoseLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Store session and IDs in refs so they're always current in callbacks
  const sessionRef = useRef<WebRTCSession | null>(null);
  const robotIdRef = useRef<string | null>(null);
  const controllerIdRef = useRef<string | null>(null);
  const selectedDatasetRef = useRef(selectedDataset);
  selectedDatasetRef.current = selectedDataset;
  // Keep the latest auth user reachable from stable callbacks below — the
  // useCallback dependency lists are intentionally minimal, so we can't rely
  // on the closed-over `user` staying fresh across auth hydration.
  const userRef = useRef(user);
  userRef.current = user;
  const deployDatasetRef = useRef(deployDatasetId);
  deployDatasetRef.current = deployDatasetId;
  const deployModelRef = useRef(deployModelId);
  deployModelRef.current = deployModelId;

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
    const datasetId = selectedDatasetIdRef.current;
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

    const userId = userRef.current?.userId;
    if (typeof userId !== "number") {
      toast({
        title: "Error",
        description: "User session not ready yet; please wait and try again",
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
          userId: String(userId),
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
      setMode?.(AppMode.RECORDING);
      onRecordingStart?.();
      return true;
    } catch (error) {
      console.error("Failed to start episode:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setMode, onRecordingStart]);

  const endEpisode = useCallback(async (): Promise<boolean> => {
    const datasetId = selectedDatasetIdRef.current;
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

      onRecordingEnd?.();
      return true;
    } catch (error) {
      console.error("Failed to end episode:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setMode, onRecordingEnd]);

  const handleDeploy = useCallback(
    async (modelId?: string | number | null): Promise<boolean> => {
      const datasetId = selectedDatasetIdRef.current;
      const datasetLabel = selectedDatasetRef.current || datasetId;
      const session = sessionRef.current;
      const robotId = robotIdRef.current;
      const controllerId = controllerIdRef.current;
      const requestedModelId = normalizeDeployModelId(modelId);

      if (!datasetId) {
        toast({
          title: "Error",
          description: "Select a dataset before deploying",
          variant: "destructive",
        });
        return false;
      }

      if (!robotId) {
        toast({
          title: "Error",
          description: "Select a robot before deploying",
          variant: "destructive",
        });
        return false;
      }

      if (!controllerId) {
        toast({
          title: "Error",
          description: "Select a control device before deploying",
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

      const action = isDeploying ? "stop" : "start";
      const targetModelId =
        action === "start"
          ? requestedModelId
          : requestedModelId ?? deployModelRef.current;
      const targetLabel = targetModelId
        ? `model #${targetModelId} from dataset "${datasetLabel}"`
        : `dataset "${datasetLabel}"`;
      setDeployRequestPending(true);
      setDeployDatasetId(datasetId);
      setDeployModelId(targetModelId);

      const deployPayload: {
        action: string;
        datasetId: string;
        modelId?: string;
      } = {
        action,
        datasetId,
      };
      if (targetModelId) {
        deployPayload.modelId = targetModelId;
      }

      const sent = session.sendControl({
        type: "deploy",
        payload: deployPayload,
      });

      if (!sent) {
        setDeployRequestPending(false);
        setDeployModelId(deployModelRef.current);
        toast({
          title: "Error",
          description: "Failed to send deploy request to robot",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Deployment request sent",
        description:
          action === "start"
            ? `Deploying ${targetLabel}.`
            : `Stopping deployment for ${targetLabel}.`,
      });

      return true;
    },
    [isDeploying],
  );

  const handleForceStopDeploy = useCallback(async (): Promise<boolean> => {
    const session = sessionRef.current;
    const datasetToStop =
      deployDatasetRef.current ?? selectedDatasetIdRef.current;
    const modelToStop = deployModelRef.current;
    const datasetLabel = selectedDatasetRef.current ?? datasetToStop;

    if (!session) {
      toast({
        title: "Error",
        description: "No active session",
        variant: "destructive",
      });
      return false;
    }

    const deployPayload: {
      action: string;
      datasetId: string | null;
      modelId?: string;
    } = {
      action: "stop",
      datasetId: datasetToStop,
    };
    if (modelToStop) {
      deployPayload.modelId = modelToStop;
    }

    const sent = session.sendControl({
      type: "deploy",
      payload: deployPayload,
    });

    if (!sent) {
      toast({
        title: "Error",
        description: "Failed to send stop request to robot",
        variant: "destructive",
      });
      return false;
    }

    // Close popup and reset state
    setDeployStatusPopupOpen(false);
    setDeployStatusMessage(null);
    setIsDeploying(false);
    setDeployDatasetId(null);
    setDeployModelId(null);
    setDeployRequestPending(false);

    toast({
      title: "Force stop sent",
      description: modelToStop
        ? `Stopping deployment for model #${modelToStop} from dataset "${datasetLabel}".`
        : `Stopping deployment for dataset "${datasetLabel}".`,
    });

    return true;
  }, []);

  const handleGetPose = useCallback(async (): Promise<void> => {
    const session = sessionRef.current;
    if (!session) return;
    session.sendControl({ type: "pose", payload: { action: "get" } });
  }, []);

  const handleMemorisePose = useCallback(async (): Promise<boolean> => {
    const session = sessionRef.current;
    if (!session) {
      toast({ title: "Error", description: "No active session", variant: "destructive" });
      return false;
    }
    setPoseLoading(true);
    const sent = session.sendControl({ type: "pose", payload: { action: "memorise" } });
    setPoseLoading(false);
    if (!sent) {
      toast({ title: "Error", description: "Failed to send memorise request", variant: "destructive" });
      return false;
    }
    return true;
  }, []);

  const handleRestorePose = useCallback(async (): Promise<boolean> => {
    const session = sessionRef.current;
    if (!session) {
      toast({ title: "Error", description: "No active session", variant: "destructive" });
      return false;
    }
    if (!memorisedPose) {
      toast({ title: "Error", description: "No memorised pose to restore", variant: "destructive" });
      return false;
    }
    const sent = session.sendControl({ type: "pose", payload: { action: "restore" } });
    if (!sent) {
      toast({ title: "Error", description: "Failed to send restore request", variant: "destructive" });
      return false;
    }
    setIsRestoring(true);
    return true;
  }, [memorisedPose]);

  const handleClearPose = useCallback(async (): Promise<boolean> => {
    const session = sessionRef.current;
    if (!session) {
      toast({ title: "Error", description: "No active session", variant: "destructive" });
      return false;
    }
    const sent = session.sendControl({ type: "pose", payload: { action: "clear" } });
    if (!sent) {
      toast({ title: "Error", description: "Failed to send clear request", variant: "destructive" });
      return false;
    }
    setMemorisedPose(null);
    return true;
  }, []);

  const resetAuthSessionState = useCallback(() => {
    sessionRef.current = null;
    robotIdRef.current = null;
    controllerIdRef.current = null;
    selectedDatasetIdRef.current = null;
    setIsRecording(false);
    setCurrentEpisodeId(null);
    setIsLoading(false);
    setIsSavingEpisode(false);
    setSelectedDataset("");
    setIsDeploying(false);
    setDeployRequestPending(false);
    setDeployDatasetId(null);
    setDeployModelId(null);
    setDeployStatusPopupOpen(false);
    setDeployStatusMessage(null);
    setMode?.(AppMode.EXPLORATION);
  }, [setMode, setSelectedDataset]);

  const value: EpisodeControlContextValue = {
    // State
    isRecording,
    currentEpisodeId,
    isLoading,
    isSavingEpisode,
    selectedDataset,
    isDeploying,
    deployRequestPending,
    deployDatasetId,
    deployModelId,
    deployStatusPopupOpen,
    deployStatusMessage,
    // Actions
    startEpisode,
    endEpisode,
    resetAuthSessionState,
    setSelectedDataset,
    setSelectedDatasetId,
    setSession,
    setRobotId,
    setControllerId,
    setIsSavingEpisode,
    setIsRecording,
    setCurrentEpisodeId,
    handleDeploy,
    handleForceStopDeploy,
    setIsDeploying,
    setDeployRequestPending,
    setDeployDatasetId,
    setDeployModelId,
    setDeployStatusPopupOpen,
    setDeployStatusMessage,
    // Pose
    memorisedPose,
    poseLoading,
    isRestoring,
    handleMemorisePose,
    handleRestorePose,
    handleClearPose,
    handleGetPose,
    setMemorisedPose,
    setIsRestoring,
  };

  return (
    <EpisodeControlContext.Provider value={value}>
      {children}
    </EpisodeControlContext.Provider>
  );
}
