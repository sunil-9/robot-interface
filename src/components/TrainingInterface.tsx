import { API_CONFIG } from "@/config/api";
import { AppMode } from "@/context/ModeContextDef";
import { useBridgeData } from "@/hooks/useBridgeData";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { useModeContext } from "@/hooks/useModeContext";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import {
  createDataset,
  fetchDatasets,
  fetchRobotCameras,
  type RobotCameraConfig,
} from "@/lib/api";
import * as episodeApi from "@/services/episodeApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ActionVarianceChart } from "./ActionVarianceChart";
import { CameraView } from "./CameraView";
import { HelpDialog } from "./HelpDialog";
import { RecordingControls, RecordingControlStyle } from "./RecordingControls";
import { SidebarTabs } from "./SidebarTabs";
import { CreateDatasetDialog } from "./training/dialogs/CreateDatasetDialog";
import { DeleteDatasetDialog } from "./training/dialogs/DeleteDatasetDialog";
import { DeleteEpisodeDialog } from "./training/dialogs/DeleteEpisodeDialog";
import { useEpisodeViewer } from "./training/EpisodeViewerContext";
import { EpisodeViewerPanel } from "./training/EpisodeViewerPanel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { toast } from "./ui/use-toast";

interface TrainingInterfaceProps {
  robotId: string | null;
  controllerId: string | null;
  session: WebRTCSession;
}

export const TrainingInterface = ({
  robotId,
  controllerId,
  session,
}: TrainingInterfaceProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { viewerState: episodeViewerState } = useEpisodeViewer();

  // Use shared episode control context
  const episodeControl = useEpisodeControlContext();
  const {
    isRecording,
    currentEpisodeId,
    isLoading: episodeLoading,
    isSavingEpisode,
    selectedDataset,
    startEpisode: contextStartEpisode,
    endEpisode: contextEndEpisode,
    setSelectedDataset,
    setSession,
    setRobotId,
    setControllerId,
    setIsSavingEpisode,
    setIsRecording,
    setCurrentEpisodeId,
  } = episodeControl;

  // Sync session, robotId, controllerId to context
  useEffect(() => {
    setSession(session);
  }, [session, setSession]);

  useEffect(() => {
    setRobotId(robotId);
  }, [robotId, setRobotId]);

  useEffect(() => {
    setControllerId(controllerId);
  }, [controllerId, setControllerId]);

  const [episodes, setEpisodes] = useState<episodeApi.Episode[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null,
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize sidebarTab from URL params, default to "secondary"
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const tabFromUrl = params.get("tab") as "secondary" | "episodes" | null;
  const [sidebarTab, setSidebarTab] = useState<"secondary" | "episodes">(
    tabFromUrl || "secondary",
  );

  const [cameraConfigs, setCameraConfigs] = useState<RobotCameraConfig[]>([]);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const bridgeData = useBridgeData();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<{
    datasetId: string;
    episodeId: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dataset management state
  const [datasets, setDatasets] = useState<string[]>([]);
  // selectedDataset and setSelectedDataset come from episodeControl context
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [deleteDatasetConfirmOpen, setDeleteDatasetConfirmOpen] =
    useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const [datasetEpisodesToShow, setDatasetEpisodesToShow] = useState<
    episodeApi.Episode[]
  >([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployRequestPending, setDeployRequestPending] = useState(false);
  const [deployDatasetId, setDeployDatasetId] = useState<string | null>(null);
  const [deployStatusPopupOpen, setDeployStatusPopupOpen] = useState(false);
  const [deployStatusMessage, setDeployStatusMessage] = useState<string | null>(
    null,
  );
  const { setMode } = useModeContext();
  const episodePanelActive = isSidebarOpen || sidebarTab === "episodes";
  const selectedDatasetRef = useRef<string | null>(selectedDataset);
  const deployDatasetRef = useRef<string | null>(deployDatasetId);

  // Handle tab changes and update URL
  const handleTabChange = useCallback(
    (newTab: "secondary" | "episodes") => {
      setSidebarTab(newTab);

      // Update URL params
      const newParams = new URLSearchParams(location.search);
      newParams.set("tab", newTab);
      navigate(`${location.pathname}?${newParams.toString()}`, {
        replace: true,
      });
    },
    [location.pathname, location.search, navigate],
  );

  // Update sidebarTab if URL param changes (on page refresh or navigation)
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== sidebarTab) {
      setSidebarTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  useEffect(() => {
    selectedDatasetRef.current = selectedDataset;
  }, [selectedDataset]);

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      setRecordingStartTime(Date.now());
      setElapsedTime(0);
    } else {
      setRecordingStartTime(null);
    }
  }, [isRecording]);

  useEffect(() => {
    if (!recordingStartTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - recordingStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingStartTime]);

  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    deployDatasetRef.current = deployDatasetId;
  }, [deployDatasetId]);

  useEffect(() => {
    let cancelled = false;

    if (!robotId) {
      setCameraConfigs([]);
      setCameraError("Select a robot to view cameras.");
      setCameraLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setCameraLoading(true);
    setCameraError(null);

    const loadCameras = async () => {
      try {
        const configs = await fetchRobotCameras(robotId);
        if (cancelled) {
          return;
        }
        setCameraConfigs(configs);
        setCameraError(
          configs.length === 0 ? "No cameras configured for this robot." : null,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCameraConfigs([]);
        setCameraError(
          error instanceof Error
            ? error.message
            : "Failed to load camera configuration.",
        );
      } finally {
        if (!cancelled) {
          setCameraLoading(false);
        }
      }
    };

    void loadCameras();

    return () => {
      cancelled = true;
    };
  }, [robotId]);

  type CameraSlot = {
    key: string;
    title: string;
    position: "main" | "left" | "right" | "extra";
    stream: MediaStream | null;
    matchedLabel: string | null;
    config: RobotCameraConfig | null;
  };

  const cameraLayout = useMemo(() => {
    const normalize = (value: unknown): string | null => {
      if (!value || typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const classifyPosition = (
      value: unknown,
    ): "main" | "left" | "right" | "extra" => {
      const normalized = normalize(value);
      if (!normalized) {
        return "extra";
      }
      const lower = normalized.toLowerCase();
      if (lower === "main" || lower === "left" || lower === "right") {
        return lower as "main" | "left" | "right";
      }
      return "extra";
    };

    const available = session.remoteStreams.map((entry, index) => ({
      index,
      entry,
      normalized: normalize(entry.camera)?.toLowerCase() ?? null,
    }));

    const consumed = new Set<number>();

    const claimStream = (labels: Array<string | null | undefined>) => {
      for (const label of labels) {
        const normalizedLabel = normalize(label)?.toLowerCase();
        if (!normalizedLabel) {
          continue;
        }
        const candidate = available.find(
          (item) =>
            !consumed.has(item.index) && item.normalized === normalizedLabel,
        );
        if (candidate) {
          consumed.add(candidate.index);
          return candidate.entry;
        }
      }
      const fallback = available.find((item) => !consumed.has(item.index));
      if (fallback) {
        consumed.add(fallback.index);
        return fallback.entry;
      }
      return null;
    };

    const slots: CameraSlot[] = [];

    cameraConfigs.forEach((config, index) => {
      const position = classifyPosition(config.position);
      const rawName = normalize(config.name);
      const observationKey = normalize(
        typeof config.observation_key === "string"
          ? config.observation_key
          : undefined,
      );
      const remote = claimStream([config.position, rawName, observationKey]);

      const positionLabel =
        position !== "extra"
          ? `${position.charAt(0).toUpperCase()}${position.slice(1)} Camera`
          : `Camera ${index + 1}`;

      slots.push({
        key: `cfg-${index}-${rawName ?? position}`,
        title: rawName ?? positionLabel,
        position,
        stream: remote?.stream ?? null,
        matchedLabel: remote?.camera ?? null,
        config,
      });
    });

    available
      .filter((item) => !consumed.has(item.index))
      .forEach((item, order) => {
        slots.push({
          key: `extra-${item.entry.id ?? item.index}-${order}`,
          title: item.entry.camera ?? `Stream ${order + 1}`,
          position: "extra",
          stream: item.entry.stream,
          matchedLabel: item.entry.camera ?? null,
          config: null,
        });
      });

    const mainSlot =
      slots.find((slot) => slot.position === "main") ??
      slots.find((slot) => slot.position === "extra") ??
      null;

    const leftSlots = slots.filter((slot) => slot.position === "left");
    const rightSlots = slots.filter((slot) => slot.position === "right");

    const extraSlots = slots.filter((slot) => slot.position === "extra");
    return {
      main: mainSlot,
      left: leftSlots,
      right: rightSlots,
      extras: extraSlots,
    };
  }, [cameraConfigs, session.remoteStreams]);

  const {
    main: mainSlot,
    left: leftSlots,
    right: rightSlots,
    extras: extraSlots,
  } = cameraLayout;

  const availableExtras = [...extraSlots, ...extraSlots];
  // change key to extra in each availableExtras slot
  availableExtras.forEach((slot) => {
    slot.position = "extra";
  });

  const fixedLeftSlot = leftSlots[0] ?? null;
  const fixedRightSlot = rightSlots[0] ?? null;
  const sidebarSlots = availableExtras;

  const fallbackImageForPosition = (
    position: "main" | "left" | "right" | "extra",
  ) => {
    switch (position) {
      case "main":
        return bridgeData.camera_head;
      case "left":
        return bridgeData.camera_left;
      case "right":
        return bridgeData.camera_right;
      default:
        return null;
    }
  };

  const renderSecondaryStack = (
    slots: CameraSlot[],
    fallbackPosition: "left" | "right" | "extra",
  ) => {
    if (slots.length === 0) {
      return (
        <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">
          No {fallbackPosition} cameras
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {slots.map((slot) => (
          <CameraView
            key={slot.key}
            title={slot.title}
            stream={slot.stream}
            fallbackImage={fallbackImageForPosition(
              slot.position === "extra" ? fallbackPosition : slot.position,
            )}
            position={slot.position ?? "extra"}
            isConnected={Boolean(slot.stream)}
            className="h-[170px] rounded-2xl border border-border bg-card/80 shadow-sm"
          />
        ))}
      </div>
    );
  };

  // Load datasets
  const loadDatasets = useCallback(async () => {
    setIsLoadingDatasets(true);
    try {
      const datasetList = await fetchDatasets();
      setDatasets(datasetList);
      // Set first dataset as default if none selected
      if (datasetList.length > 0 && !selectedDataset) {
        setSelectedDataset(datasetList[0]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load datasets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDatasets(false);
    }
  }, [selectedDataset, setSelectedDataset]);

  // Fetch episodes when sidebar opens or selected dataset changes
  useEffect(() => {
    if (episodePanelActive && selectedDataset) {
      fetchEpisodes();
    }
    if (episodePanelActive) {
      loadDatasets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodePanelActive, selectedDataset]);

  // Create new dataset
  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) {
      toast({
        title: "Error",
        description: "Dataset name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDataset(true);
    try {
      await createDataset(newDatasetName.trim());
      toast({
        title: "Success",
        description: `Dataset "${newDatasetName}" created successfully`,
      });
      setNewDatasetName("");
      setIsCreateDialogOpen(false);
      // Reload datasets and select the new one
      await loadDatasets();
      setSelectedDataset(newDatasetName.trim());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create dataset",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDataset(false);
    }
  };

  // Fetch episodes
  const fetchEpisodes = async (datasetIdOverride?: string) => {
    const datasetId =
      datasetIdOverride ?? selectedDatasetRef.current ?? selectedDataset;
    if (!datasetId) {
      return;
    }

    try {
      const response = await episodeApi.listEpisodes(datasetId);
      setEpisodes(response.episodes);
    } catch (error) {
      console.error("Failed to fetch episodes:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch episodes",
        variant: "destructive",
      });
    }
  };

  const startEpisode = async () => {
    const success = await contextStartEpisode();
    if (success) {
      setMode(AppMode.RECORDING);
      // Update episodes list if episode management UI is visible
      if (episodePanelActive) {
        fetchEpisodes();
      }
    }
  };

  const endEpisode = async () => {
    setMode(AppMode.TRAINING);
    await contextEndEpisode();
  };

  const rewindEpisode = async () => {
    setIsLoading(true);
    try {
      console.log("This function will be implemented later");
      // await fetch(`${EPISODES_API_URL}/rewind`, { method: "POST" });
      // // Update episodes list if sidebar is open
      // if (isSidebarOpen) {
      //   fetchEpisodes();
      // }
      toast({
        title: "Info",
        description: "Rewind functionality is not implemented yet",
      });
    } catch (error) {
      console.error("Failed to rewind episode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploy = () => {
    if (!selectedDataset) {
      toast({
        title: "Error",
        description: "Select a dataset before deploying",
        variant: "destructive",
      });
      return;
    }
    if (!robotId) {
      toast({
        title: "Error",
        description: "Select a robot before deploying",
        variant: "destructive",
      });
      return;
    }
    if (!controllerId) {
      toast({
        title: "Error",
        description: "Select a control device before deploying",
        variant: "destructive",
      });
      return;
    }
    const action = isDeploying ? "stop" : "start";
    setDeployRequestPending(true);
    setDeployDatasetId(selectedDataset);

    const sent = session.sendControl({
      type: "deploy",
      payload: {
        action,
        datasetId: selectedDataset,
      },
    });

    if (!sent) {
      setDeployRequestPending(false);
      toast({
        title: "Error",
        description: "Failed to send deploy request to robot",
        variant: "destructive",
      });
      return;
    }
    console.log("response of sent", sent);

    toast({
      title: "Deployment request sent",
      description:
        action === "start"
          ? `Deploying dataset "${selectedDataset}".`
          : `Stopping deployment for dataset "${selectedDataset}".`,
    });
  };

  const handleForceStopDeploy = () => {
    const datasetToStop = deployDatasetId ?? selectedDataset;

    const sent = session.sendControl({
      type: "deploy",
      payload: {
        action: "stop",
        datasetId: datasetToStop,
      },
    });

    if (!sent) {
      toast({
        title: "Error",
        description: "Failed to send stop request to robot",
        variant: "destructive",
      });
      return;
    }

    // Close popup and reset state
    setDeployStatusPopupOpen(false);
    setDeployStatusMessage(null);
    setIsDeploying(false);
    setDeployDatasetId(null);
    setDeployRequestPending(false);

    toast({
      title: "Force stop sent",
      description: `Stopping deployment for dataset "${datasetToStop}".`,
    });
  };

  useEffect(() => {
    const unsubscribe = session.onTelemetry((payload) => {
      if (!payload || typeof payload !== "object") {
        return;
      }

      const record = payload as Record<string, unknown>;
      const type = typeof record.type === "string" ? record.type : null;

      // Handle dataset collection responses
      if (type === "dataset") {
        // console.log(payload, "obtained from the robot backend");
        const rawPayload = record.payload;
        if (!rawPayload || typeof rawPayload !== "object") {
          return;
        }
        const datasetPayload = rawPayload as Record<string, unknown>;
        const action =
          typeof datasetPayload.action === "string"
            ? datasetPayload.action.toLowerCase()
            : null;
        const status =
          typeof datasetPayload.status === "string"
            ? datasetPayload.status
            : null;
        const message =
          typeof datasetPayload.message === "string"
            ? datasetPayload.message
            : null;
        const datasetId =
          typeof datasetPayload.datasetId === "string"
            ? datasetPayload.datasetId
            : typeof datasetPayload.dataset_id === "string"
              ? datasetPayload.dataset_id
              : null;

        if (action === "collection_start_ack") {
          toast({
            title: "Recording started",
            description: datasetId
              ? `Recording episode for dataset "${datasetId}"`
              : "Episode recording has started",
          });
          return;
        }

        if (action === "collection_start_nack") {
          setIsRecording(false);
          setCurrentEpisodeId(null);
          setMode(AppMode.TRAINING);
          toast({
            title: "Failed to start recording",
            description: message
              ? `${message.charAt(0).toUpperCase() + message.slice(1)}${datasetId ? ` (Dataset: ${datasetId})` : ""}`
              : datasetId
                ? `Could not start recording for dataset "${datasetId}"`
                : "Could not start recording. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (action === "collection_stop_ack") {
          setIsSavingEpisode(false);
          fetchEpisodes(datasetId ?? undefined);
          toast({
            title: "Recording stopped",
            description: datasetId
              ? `Episode saved for dataset "${datasetId}"`
              : "Episode recording has been saved",
          });
          return;
        }

        if (action === "collection_stop_nack") {
          setIsSavingEpisode(false);
          toast({
            title: "Failed to stop recording",
            description: message
              ? `${message}${datasetId ? ` (Dataset: ${datasetId})` : ""}`
              : datasetId
                ? `Could not stop recording for dataset "${datasetId}"`
                : "Could not stop recording. Please try again.",
            variant: "destructive",
          });
          return;
        }

        return;
      }

      // Handle deploy responses
      if (type !== "deploy") {
        return;
      }
      //println!("Deploy payload: {:?}", payload);
      console.log(payload, "obtained from the robot backend");

      const rawPayload = record.payload;
      if (!rawPayload || typeof rawPayload !== "object") {
        return;
      }
      const deployPayload = rawPayload as Record<string, unknown>;
      const action =
        typeof deployPayload.action === "string"
          ? deployPayload.action.toLowerCase()
          : null;
      const status =
        typeof deployPayload.status === "string"
          ? deployPayload.status.toLowerCase()
          : null;
      const message =
        typeof deployPayload.message === "string"
          ? deployPayload.message
          : null;
      const datasetId =
        typeof deployPayload.datasetId === "string"
          ? deployPayload.datasetId
          : typeof deployPayload.dataset_id === "string"
            ? deployPayload.dataset_id
            : null;

      const resolvedDataset =
        datasetId ??
        deployDatasetRef.current ??
        selectedDatasetRef.current ??
        undefined;

      setDeployRequestPending(false);

      if (action === "deploy_ack") {
        console.log("Response deployment webrtc", deployPayload);
        const active = status === "deploying";
        setIsDeploying(active);
        setDeployDatasetId(datasetId ?? selectedDatasetRef.current ?? null);
        toast({
          title: active ? "Deployment accepted" : "Deployment updated",
          description:
            message ??
            (resolvedDataset
              ? `Dataset "${resolvedDataset}" status: ${status ?? "updated"}.`
              : `Deployment status: ${status ?? "updated"}.`),
        });
        return;
      }

      if (action === "deploy_nack" || status === "error") {
        //if message is "no active deployment" then set isDeploying to false else  Don't change isDeploying state on error - keep button in current state
        if (message?.toLowerCase() === "no active deployment") {
          setIsDeploying(false);
          setDeployDatasetId(null);
        }
        toast({
          title: "Deployment failed",
          description:
            message ??
            "Deployment request was rejected. Check deployment services and try again.",
          variant: "destructive",
        });

        return;
      }
      if (action === "deploy_stop_ack" || status === "stopped") {
        setIsDeploying(false);
        setDeployDatasetId(null);

        toast({
          title: "Deployment stopped",
          description: message ?? "Deployment has been stopped successfully.",
          variant: "default",
        });

        return;
      }

      if (action === "deploy_status") {
        const deployingDataset =
          datasetId ??
          deployDatasetRef.current ??
          selectedDatasetRef.current ??
          undefined;

        if (status === "deploying") {
          setIsDeploying(true);
          setDeployDatasetId(deployingDataset ?? null);
          setDeployStatusMessage(message ?? "Waiting for checkpoint...");
          setDeployStatusPopupOpen(true);
          toast({
            title: "Deployment in progress",
            description:
              message ?? `Deploying dataset "${deployingDataset}"...`,
          });
        } else if (status === "deployed") {
          setDeployStatusPopupOpen(false);
          setDeployStatusMessage(null);
          setIsDeploying(true);
          setDeployDatasetId(deployingDataset ?? null);
          toast({
            title: "Deployment complete",
            description:
              message ?? `Dataset "${deployingDataset}" deployed successfully.`,
          });
        }
        return;
      }
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, setIsRecording, setCurrentEpisodeId, setIsSavingEpisode]);

  // Additional episode management functions
  const promptDeleteEpisode = (datasetId: string, episodeId: string) => {
    setEpisodeToDelete({ datasetId, episodeId });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEpisode = async () => {
    if (!episodeToDelete) return;

    const { datasetId, episodeId } = episodeToDelete;
    setIsDeleting(true);

    try {
      await episodeApi.deleteEpisode(datasetId, episodeId);

      toast({
        title: "Success",
        description: "Episode deleted successfully",
      });
      fetchEpisodes(datasetId);
      setDeleteConfirmOpen(false);
      setEpisodeToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete episode",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const promptDeleteDataset = async (datasetId: string) => {
    try {
      // Fetch episodes for this dataset to show in confirmation
      const response = await episodeApi.listEpisodes(datasetId);
      setDatasetEpisodesToShow(response.episodes);
      setDatasetToDelete(datasetId);
      setDeleteDatasetConfirmOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load episodes for dataset",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteDataset = async () => {
    if (!datasetToDelete) return;

    setIsDeleting(true);
    try {
      // Delete the dataset using the API
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DATASETS}/${datasetToDelete}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete dataset");
      }

      toast({
        title: "Success",
        description: `Dataset "${datasetToDelete}" deleted successfully`,
      });

      // Reload datasets
      await loadDatasets();

      // Clear selection if the deleted dataset was selected
      if (selectedDataset === datasetToDelete) {
        setSelectedDataset("");
        setEpisodes([]);
      }

      setDeleteDatasetConfirmOpen(false);
      setDatasetToDelete(null);
      setDatasetEpisodesToShow([]);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete dataset",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <section className="relative  flex  h-screen  flex-1 flex-col p-1">
        <div className="flex flex-1 min-h-0 gap-2 ">
          <div className="relative flex-1 overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_25px_70px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
            {/* <div className="absolute left-5 top-5 z-20 rounded-lg border border-border bg-card/85 px-3 py-1 text-[11px]  uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur">
             { mainSlot?.title}
            </div> */}

            <div className="absolute left-5 top-26 z-20">
              <ActionVarianceChart
                title="2 sec future"
                overlay
                compact
                showTitle={false}
              />
            </div>

            <div className="absolute right-5 top-5 z-20 flex flex-col items-end gap-2 bg-transparent text-xs transition-opacity hover:opacity-100">
              {/* Recording Timer */}
              {isRecording && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 shadow-lg backdrop-blur animate-in fade-in slide-in-from-right-2 duration-300">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                  </span>
                  <span className="font-mono text-lg font-semibold text-red-500">
                    {formatElapsedTime(elapsedTime)}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-red-400">
                    REC
                  </span>
                </div>
              )}
              {/* 
              todo: add session status indicators back
              <div className="rounded-xl border border-border bg-card/85 px-3 py-2 text-muted-foreground shadow-lg backdrop-blur">
                <div>
                  <span className="text-muted-foreground/80">Signaling:</span>{" "}
                  <span
                    className={
                      session.signalingConnected
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }
                  >
                    {session.signalingConnected ? "connected" : "connecting"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground/80">Peer:</span>{" "}
                  <span className="text-primary">
                    {session.connectionState}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground/80">Telemetry:</span>{" "}
                  <span
                    className={
                      session.telemetryOpen
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }
                  >
                    {session.telemetryOpen ? "open" : "pending"}
                  </span>
                </div>
              </div> */}
              {cameraLoading && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] text-primary shadow">
                  Loading camera config…
                </span>
              )}
              {cameraError && (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] text-amber-700 shadow dark:border-amber-500/50 dark:bg-amber-900/40 dark:text-amber-100">
                  {cameraError}
                </span>
              )}
            </div>

            {/* Show Episode Viewer OR Camera View in main area */}
            {episodeViewerState.isOpen ? (
              <EpisodeViewerPanel className="h-full" />
            ) : (
              <CameraView
                key={mainSlot?.key ?? "main"}
                title={mainSlot?.title ?? "Main Camera"}
                stream={mainSlot?.stream ?? null}
                fallbackImage={fallbackImageForPosition(
                  mainSlot?.position ?? "main",
                )}
                position={mainSlot?.position ?? "main"}
                isConnected={Boolean(mainSlot?.stream)}
                showTitle={true}
                className="h-full rounded-[32px] border-none bg-transparent"
              />
            )}

            {fixedLeftSlot && (
              <div className="absolute bottom-4 left-4 z-30  overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
                <CameraView
                  key={fixedLeftSlot.key}
                  title={fixedLeftSlot.title ?? "Left Camera"}
                  stream={fixedLeftSlot.stream ?? mainSlot?.stream ?? null}
                  fallbackImage={fallbackImageForPosition("left")}
                  position="left"
                  isConnected={Boolean(
                    fixedLeftSlot.stream ?? mainSlot?.stream,
                  )}
                  className="h-full w-full"
                />
              </div>
            )}

            {fixedRightSlot && (
              <div className="absolute bottom-4 right-4 z-30  overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
                <CameraView
                  key={fixedRightSlot.key}
                  title={fixedRightSlot.title}
                  stream={fixedRightSlot.stream ?? mainSlot?.stream}
                  fallbackImage={fallbackImageForPosition("right")}
                  position="right"
                  isConnected={Boolean(
                    fixedRightSlot.stream ?? mainSlot?.stream,
                  )}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>

          <div className="flex  w-[360px] h-[calc(100vh_-_10px)] min-w-[320px] max-w-[380px] flex-col gap-3 rounded-[28px] border border-border bg-card/90 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <RecordingControls
              isRecording={isRecording}
              isLoading={isLoading}
              currentEpisodeId={currentEpisodeId}
              isDeploying={isDeploying}
              isDeployingRequest={deployRequestPending}
              onStart={startEpisode}
              onStop={endEpisode}
              onRewind={rewindEpisode}
              onDeploy={handleDeploy}
              style={RecordingControlStyle.COMPACT}
            />
            <SidebarTabs
              tab={sidebarTab}
              onTabChange={handleTabChange}
              secondaryContent={renderSecondaryStack(sidebarSlots, "extra")}
              episodeManagementProps={{
                datasets,
                selectedDataset,
                isLoadingDatasets,
                episodes,
                isDeleting,
                formatDuration,
                onSelectDataset: setSelectedDataset,
                onRequestCreateDataset: () => setIsCreateDialogOpen(true),
                onRequestDeleteDataset: promptDeleteDataset,
                onPromptDeleteEpisode: promptDeleteEpisode,
                accentColor: "accent",
                robotId,
                isRecording,
                recordingElapsedTime: elapsedTime,
                isSavingEpisode,
              }}
            />
          </div>
        </div>
      </section>

      <HelpDialog className="h-10 rounded-t-2xl border-primary/40 px-6 text-sm font-semibold shadow-[0_12px_30px_rgba(15,23,42,0.22)]">
        Help
      </HelpDialog>

      <CreateDatasetDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        newDatasetName={newDatasetName}
        isCreating={isCreatingDataset}
        onNameChange={setNewDatasetName}
        onSubmit={handleCreateDataset}
        onCancel={() => {
          setIsCreateDialogOpen(false);
          setNewDatasetName("");
        }}
      />

      <DeleteEpisodeDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        episodeLabel={episodeToDelete?.episodeId ?? null}
        onConfirm={confirmDeleteEpisode}
        isDeleting={isDeleting}
      />

      <DeleteDatasetDialog
        open={deleteDatasetConfirmOpen}
        onOpenChange={setDeleteDatasetConfirmOpen}
        datasetName={datasetToDelete}
        episodesPreview={datasetEpisodesToShow}
        onConfirm={confirmDeleteDataset}
        isDeleting={isDeleting}
      />

      {/* Deploy Status Popup - Unclosable while deploying */}
      <AlertDialog open={deployStatusPopupOpen}>
        <AlertDialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="sm:max-w-md"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
              </span>
              Deploying...
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {deployStatusMessage ?? "Waiting for checkpoint..."}
              {deployDatasetId && (
                <span className="mt-2 block text-sm text-muted-foreground">
                  Dataset:{" "}
                  <span className="font-medium">{deployDatasetId}</span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="destructive"
              onClick={handleForceStopDeploy}
              className="w-full sm:w-auto"
            >
              Force Stop
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
