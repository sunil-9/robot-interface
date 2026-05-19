import { AppMode } from "@/context/ModeContextDef";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useBridgeData } from "@/hooks/useBridgeData";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { useEpisodesWebSocket } from "@/hooks/useEpisodesWebSocket";
import { useModeContext } from "@/hooks/useModeContext";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import {
  createDataset,
  deleteDataset,
  type DatasetListItem,
  fetchDatasets,
  fetchRobotCameras,
  type RobotCameraConfig,
  updateDatasetDescription,
} from "@/lib/api";
import * as episodeApi from "@/services/episodeApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ActionVarianceChart } from "./ActionVarianceChart";
import { CameraView } from "./CameraView";
import { HelpDialog } from "./HelpDialog";
import { RecordingControls, RecordingControlStyle } from "./RecordingControls";
import { MemoriseRestorePose } from "./MemoriseRestorePose";
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
  const { user } = useAuthSession();
  const { viewerState: episodeViewerState } = useEpisodeViewer();

  // Use shared episode control context
  const episodeControl = useEpisodeControlContext();
  const {
    isRecording,
    isLoading: episodeLoading,
    isSavingEpisode,
    selectedDataset,
    isDeploying,
    deployRequestPending,
    deployDatasetId,
    deployStatusPopupOpen,
    deployStatusMessage,
    startEpisode: contextStartEpisode,
    endEpisode: contextEndEpisode,
    handleDeploy: contextHandleDeploy,
    handleForceStopDeploy: contextHandleForceStopDeploy,
    setSelectedDataset,
    setSelectedDatasetId,
    setSession,
    setRobotId,
    setControllerId,
    setIsSavingEpisode,
    setIsRecording,
    setIsDeploying,
    setDeployRequestPending,
    setDeployDatasetId,
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

  // Fetch memorised pose when telemetry channel opens
  useEffect(() => {
    if (session.telemetryOpen) {
      void handleGetPose();
    }
  }, [session.telemetryOpen, handleGetPose]);

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
    datasetId: string | number;
    episodeId: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null);
  const [datasetStatus, setDatasetStatus] = useState<string | null>(null);

  // Dataset management state
  const [datasets, setDatasets] = useState<string[]>([]);
  const [datasetItems, setDatasetItems] = useState<DatasetListItem[]>([]);
  // selectedDataset and setSelectedDataset come from episodeControl context
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [newDatasetDescription, setNewDatasetDescription] = useState("");
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [deleteDatasetConfirmOpen, setDeleteDatasetConfirmOpen] =
    useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const [datasetToDeleteId, setDatasetToDeleteId] = useState<number | null>(null);
  const [datasetEpisodesToShow, setDatasetEpisodesToShow] = useState<
    episodeApi.Episode[]
  >([]);
  // isDeploying, deployRequestPending, deployDatasetId, deployStatusPopupOpen, deployStatusMessage
  // come from episodeControl context
  const { setMode } = useModeContext();
  const episodePanelActive = isSidebarOpen || sidebarTab === "episodes";
  const selectedDatasetRef = useRef<string | null>(selectedDataset);
  const selectedDatasetRouteIdRef = useRef<string | null>(null);
  const datasetNameByIdRef = useRef<Map<string, string>>(new Map());
  const deployDatasetRef = useRef<string | null>(deployDatasetId);
  const episodesTotalRef = useRef<number | null>(null);
  const datasetIdByName = useMemo(
    () => new Map(datasetItems.map((item) => [item.name, item.id])),
    [datasetItems],
  );
  const datasetNameById = useMemo(
    () => new Map(datasetItems.map((item) => [String(item.id), item.name])),
    [datasetItems],
  );
  const selectedDatasetDbId = useMemo(() => {
    if (!selectedDataset) {
      return null;
    }
    return datasetIdByName.get(selectedDataset) ?? null;
  }, [datasetIdByName, selectedDataset]);
  const selectedDatasetRouteId = useMemo(
    () => (selectedDatasetDbId !== null ? String(selectedDatasetDbId) : null),
    [selectedDatasetDbId],
  );

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
    episodesTotalRef.current = null;
  }, [selectedDataset]);

  useEffect(() => {
    selectedDatasetRouteIdRef.current = selectedDatasetRouteId;
  }, [selectedDatasetRouteId]);

  useEffect(() => {
    datasetNameByIdRef.current = datasetNameById;
  }, [datasetNameById]);

  useEffect(() => {
    setSelectedDatasetId(selectedDatasetRouteId);
  }, [selectedDatasetRouteId, setSelectedDatasetId]);

  const episodesWsEnabled = episodePanelActive && Boolean(selectedDatasetRouteId);

  const handleEpisodesSnapshot = useCallback(
    (message: {
      dataset_id: string;
      dataset_status?: string;
      episodes: episodeApi.Episode[];
      total_count: number;
    }) => {
      const activeDatasetId =
        selectedDatasetRouteIdRef.current ?? selectedDatasetRouteId ?? "";
      if (!activeDatasetId || String(message.dataset_id) !== activeDatasetId) {
        return;
      }

      if (message.dataset_status !== undefined) {
        setDatasetStatus(message.dataset_status);
      }

      const normalizedEpisodes = message.episodes.map((episode) => ({
        ...episode,
        dataset_id: message.dataset_id,
        episode_index: `${episode.episode_index}`,
      }));
      setEpisodes(normalizedEpisodes);

      const previousTotal = episodesTotalRef.current;
      episodesTotalRef.current = message.total_count;
      if (
        typeof previousTotal === "number" &&
        message.total_count > previousTotal &&
        isSavingEpisode
      ) {
        setIsSavingEpisode(false);
      }
    },
    [isSavingEpisode, selectedDatasetRouteId, setIsSavingEpisode],
  );

  const handleDatasetDeleted = useCallback(
    (message: { dataset_id: string }) => {
      const activeDatasetId =
        selectedDatasetRouteIdRef.current ?? selectedDatasetRouteId ?? "";
      if (String(message.dataset_id) !== activeDatasetId) {
        return;
      }
      setEpisodes([]);
      toast({
        title: "Dataset removed",
        description: selectedDatasetRef.current
          ? `Dataset "${selectedDatasetRef.current}" was deleted.`
          : `Dataset "${message.dataset_id}" was deleted.`,
      });
    },
    [selectedDatasetRouteId],
  );

  const handleEpisodeSaveError = useCallback(
    (message: { dataset_id: string; message?: string }) => {
      const activeDatasetId =
        selectedDatasetRouteIdRef.current ?? selectedDatasetRouteId ?? "";
      if (!activeDatasetId || String(message.dataset_id) !== activeDatasetId) {
        return;
      }
      setIsSavingEpisode(false);
      toast({
        title: "Episode save failed",
        description:
          message.message ??
          `Episode save failed for dataset: ${message.dataset_id}".`,
        variant: "destructive",
      });
    },
    [selectedDatasetRouteId, setIsSavingEpisode],
  );
  useEffect(() => {
    if (!selectedDatasetRouteId || !session.telemetryOpen) {
      return;
    }
    if (typeof user?.userId !== "number") {
      // Wait for the auth session to hydrate before activating; otherwise the
      // robot-backend would receive userId="undefined" and the Lambda ingest
      // would write objects under s3://.../incoming/undefined/…
      return;
    }
    session.sendControl({
      type: "dataset",
      payload: {
        action: "activate",
        datasetId: selectedDatasetRouteId,
        userId: String(user.userId),
      },
    });
  }, [selectedDatasetRouteId, session.telemetryOpen, session, user?.userId]);

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

    const mainSlot = slots.find((slot) => slot.position === "main") ?? null;

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

  const fixedLeftSlot = leftSlots[0] ?? null;
  const fixedRightSlot = rightSlots[0] ?? null;
  const sidebarSlots = extraSlots;
  const visibleCameraSlots = useMemo(
    () =>
      [mainSlot, fixedLeftSlot, fixedRightSlot, ...sidebarSlots].filter(
        (slot): slot is CameraSlot => Boolean(slot),
      ),
    [fixedLeftSlot, fixedRightSlot, mainSlot, sidebarSlots],
  );
  const [promotedCameraKey, setPromotedCameraKey] = useState<string | null>(
    null,
  );
  const promotedCameraSlot =
    visibleCameraSlots.find((slot) => slot.key === promotedCameraKey) ?? null;
  const displayMainSlot = promotedCameraSlot ?? mainSlot;
  const displacedMainSlot = promotedCameraSlot && mainSlot ? mainSlot : null;

  useEffect(() => {
    if (
      promotedCameraKey &&
      !visibleCameraSlots.some((slot) => slot.key === promotedCameraKey)
    ) {
      setPromotedCameraKey(null);
    }
  }, [promotedCameraKey, visibleCameraSlots]);

  const handleSwapCameraWithMain = useCallback((cameraKey: string) => {
    setPromotedCameraKey((current) =>
      current === cameraKey ? null : cameraKey,
    );
  }, []);

  const displaySlotForSecondarySlot = (slot: CameraSlot) =>
    promotedCameraSlot?.key === slot.key ? displacedMainSlot : slot;

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
          (() => {
            const displaySlot = displaySlotForSecondarySlot(slot);
            if (!displaySlot) {
              return null;
            }
            return (
              <CameraView
                key={`${slot.key}-${displaySlot.key}`}
                title={displaySlot.title}
                stream={displaySlot.stream}
                fallbackImage={fallbackImageForPosition(displaySlot.position)}
                position={
                  slot.position === "extra" ? fallbackPosition : slot.position
                }
                isConnected={Boolean(displaySlot.stream)}
                className="h-[170px] rounded-2xl border border-border bg-card/80 shadow-sm"
                onSwapWithMain={() => handleSwapCameraWithMain(slot.key)}
              />
            );
          })()
        ))}
      </div>
    );
  };

  // Load datasets
  const loadDatasets = useCallback(async () => {
    setIsLoadingDatasets(true);
    try {
      const datasetList = await fetchDatasets(robotId);
      setDatasets(datasetList.datasets);
      setDatasetItems(datasetList.datasetItems);

      const activeDataset = selectedDatasetRef.current ?? "";
      if (datasetList.datasets.length === 0) {
        setEpisodes([]);
        if (activeDataset) {
          setSelectedDataset("");
        }
        return;
      }

      // Set first dataset as default if none selected OR if selected dataset doesn't exist
      if (!activeDataset || !datasetList.datasets.includes(activeDataset)) {
        setSelectedDataset(datasetList.datasets[0]);
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
  }, [robotId, setSelectedDataset]);

  // Fetch episodes when sidebar opens or selected dataset changes
  useEffect(() => {
    const loadData = async () => {
      setDatasetStatus(null);
      if (episodePanelActive && selectedDatasetRouteId && !episodesWsEnabled) {
        fetchEpisodes();
      }
      if (episodePanelActive) {
        await loadDatasets();
      }
    };
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodePanelActive, robotId, selectedDatasetRouteId]);

  const { isConnected: episodesWsConnected } = useEpisodesWebSocket({
    datasetId: selectedDatasetRouteId,
    enabled: episodesWsEnabled,
    onSnapshot: handleEpisodesSnapshot,
    onDatasetDeleted: handleDatasetDeleted,
    onEpisodeSaveError: handleEpisodeSaveError,
  });

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

    if (!robotId) {
      toast({
        title: "Error",
        description: "Select a robot before creating a dataset.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDataset(true);
    try {
      await createDataset(
        newDatasetName.trim(),
        robotId,
        newDatasetDescription.trim(),
      );
      toast({
        title: "Success",
        description: `Dataset "${newDatasetName}" created successfully`,
      });
      setNewDatasetName("");
      setNewDatasetDescription("");
      setIsCreateDialogOpen(false);
      // Reload datasets and select the new one
      await loadDatasets();
      setSelectedDataset(newDatasetName.trim());
    } catch (error) {
      console.log(error.message);
      toast({
        title: "Error",
        description: `Failed to create dataset: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingDataset(false);
    }
  };

  const handleDatasetDescriptionSave = async (
    datasetId: string | number,
    description: string,
  ) => {
    try {
      await updateDatasetDescription(datasetId, description);
      setDatasetItems((items) =>
        items.map((item) =>
          String(item.id) === String(datasetId)
            ? { ...item, description }
            : item,
        ),
      );
      toast({
        title: "Description updated",
        description: "Dataset description saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update dataset description: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Fetch episodes
  const fetchEpisodes = async (datasetIdOverride?: string | number) => {
    const datasetId =
      datasetIdOverride ??
      selectedDatasetRouteIdRef.current ??
      selectedDatasetRouteId;
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
      // Mode is now set by EpisodeControlContext
      // Update episodes list if episode management UI is visible
      if (episodePanelActive && !episodesWsEnabled) {
        fetchEpisodes();
      }
    }
  };

  const endEpisode = async () => {
    // Mode is now set by EpisodeControlContext
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

  // handleDeploy and handleForceStopDeploy are now provided by episodeControl context
  // Wrap them for the UI handlers
  const onDeploy = () => {
    contextHandleDeploy();
  };

  const onForceStopDeploy = () => {
    contextHandleForceStopDeploy();
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
        const datasetName = datasetId
          ? datasetNameByIdRef.current.get(datasetId) ?? null
          : null;
        const datasetLabel =
          datasetName ?? selectedDatasetRef.current ?? datasetId ?? null;

        if (datasetName && selectedDatasetRef.current !== datasetName) {
          setSelectedDataset(datasetName);
          selectedDatasetRef.current = datasetName;
        }

        if (action === "collection_start_ack") {
          console.log("started with", datasetPayload.datasetId);
          if (!isRecording) {
            setIsRecording(true);
            setMode(AppMode.RECORDING);
          }
          toast({
            title: "Recording started",
            description: datasetLabel
              ? `Recording episode for dataset "${datasetLabel}"`
              : "Episode recording has started",
          });
          return;
        }

        if (action === "collection_start_nack") {
          setIsRecording(false);
          setMode(AppMode.EXPLORATION);
          toast({
            title: "Failed to start recording",
            description: message
              ? `${message.charAt(0).toUpperCase() + message.slice(1)}${datasetLabel ? ` (Dataset: ${datasetLabel})` : ""}`
              : datasetLabel
                ? `Could not start recording for dataset "${datasetLabel}"`
                : "Could not start recording. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (action === "collection_stop_ack") {
         

          // if (isRecording) {
          setIsRecording(false);
          setMode(AppMode.EXPLORATION);
          // }

          if (!isSavingEpisode) {
            setIsSavingEpisode(true);
          }

          if (!episodesWsEnabled) {
            setIsSavingEpisode(false);
            fetchEpisodes(datasetId ?? undefined);
          }
          toast({
            title: "Recording stopped",
            description: datasetLabel
              ? `Episode will be saved for dataset "${datasetLabel}"`
              : "Episode recording will be saved",
          });
          return;
        }

        if (action === "collection_stop_nack") {
          setIsSavingEpisode(false);
          toast({
            title: "Failed to stop recording",
            description: message
              ? `${message}${datasetLabel ? ` (Dataset: ${datasetLabel})` : ""}`
              : datasetLabel
                ? `Could not stop recording for dataset "${datasetLabel}"`
                : "Could not stop recording. Please try again.",
            variant: "destructive",
          });
          return;
        }

        return;
      }

      // Handle deploy responses
      if (type !== "deploy" && type !== "pose") {
        return;
      }
      //println!("Deploy payload: {:?}", payload);

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
      const datasetName = datasetId
        ? datasetNameByIdRef.current.get(datasetId) ?? null
        : null;

      const resolvedDataset =
        datasetName ??
        (deployDatasetRef.current
          ? datasetNameByIdRef.current.get(deployDatasetRef.current) ??
            deployDatasetRef.current
          : null) ??
        selectedDatasetRef.current ??
        datasetId ??
        undefined;

      setDeployRequestPending(false);

      if (action === "deploy_ack") {
        console.log("Response deployment webrtc", deployPayload);
        const active = status === "deploying";
        setIsDeploying(active);
        setDeployDatasetId(datasetId ?? selectedDatasetRouteIdRef.current ?? null);
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
          datasetName ??
          (deployDatasetRef.current
            ? datasetNameByIdRef.current.get(deployDatasetRef.current) ??
              deployDatasetRef.current
            : null) ??
          selectedDatasetRef.current ??
          datasetId ??
          undefined;

        if (status === "deploying") {
          setIsDeploying(true);
          setDeployDatasetId(datasetId ?? deployDatasetRef.current ?? null);
          setDeployStatusMessage(message ?? "Downloading checkpoint...");
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
          setDeployDatasetId(datasetId ?? deployDatasetRef.current ?? null);
          toast({
            title: "Deployment complete",
            description:
              message ?? `Dataset "${deployingDataset}" deployed successfully.`,
          });
        }
        return;
      }

      // Handle pose responses
      if (type === "pose") {
        const rawPayload = record.payload;
        if (!rawPayload || typeof rawPayload !== "object") return;
        const posePayload = rawPayload as Record<string, unknown>;
        const action = typeof posePayload.action === "string" ? posePayload.action : null;
        const poseMsg = typeof posePayload.message === "string" ? posePayload.message : null;

        if (action === "pose_memorise_ack") {
          const poseData = posePayload.pose as { topics: Record<string, unknown> } | null | undefined;
          console.log("[pose] memorise_ack, pose=", poseData);
          if (poseData) setMemorisedPose(poseData);
          toast({ title: "Pose memorised", description: `Saved successfully` });
          return;
        }
        if (action === "pose_get_ack") {
          const poseData = posePayload.pose as { topics: Record<string, unknown> } | null | undefined;
          console.log("[pose] get_ack, pose=", poseData);
          setMemorisedPose(poseData ?? null);
          return;
        }
        if (action === "pose_clear_ack") {
          console.log("[pose] clear_ack");
          toast({ title: "Pose cleared" });
          return;
        }
        if (action === "pose_restore_ack") {
          const result = posePayload.result as Record<string, unknown> | undefined;
          console.log("[pose] restore_ack, msg=", poseMsg, "max_error_rad=", result?.max_abs_error_rad, "final_positions=", result?.final_positions);
          setIsRestoring(false);
          toast({ title: "Pose restored", description: poseMsg ?? "Robot returned to memorised pose" });
          return;
        }
        if (action?.endsWith("_nack")) {
          console.log("[pose] nack, action=", action, "msg=", poseMsg, "full=", posePayload);
          setIsRestoring(false);
          toast({ title: "Pose error", description: poseMsg ?? "Pose action failed", variant: "destructive" });
          return;
        }
        console.log("[pose] unhandled action=", action, "full=", posePayload);
        return;
      }
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, setIsRecording, setIsSavingEpisode, setMemorisedPose, setIsRestoring]);

  // Additional episode management functions
  const promptDeleteEpisode = (datasetId: string | number, episodeId: string) => {
    setEpisodeToDelete({ datasetId, episodeId });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEpisode = async () => {
    if (!episodeToDelete) return;

    const { datasetId, episodeId } = episodeToDelete;
    setIsDeleting(true);
    setDeletingEpisodeId(episodeId);
    setDeleteConfirmOpen(false);
    setEpisodeToDelete(null);

    try {
      await episodeApi.deleteEpisode(datasetId, episodeId);

      toast({
        title: "Success",
        description: "Episode deleted successfully",
      });
      if (!episodesWsEnabled && !episodesWsConnected) {
        fetchEpisodes(datasetId);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete episode",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingEpisodeId(null);
    }
  };

  const promptDeleteDataset = async (datasetName: string) => {
    const datasetId = datasetIdByName.get(datasetName);
    if (datasetId === undefined) {
      toast({
        title: "Error",
        description: `Could not resolve dataset id for "${datasetName}"`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch episodes for this dataset to show in confirmation
      const response = await episodeApi.listEpisodes(datasetId);
      setDatasetEpisodesToShow(response.episodes);
      setDatasetToDelete(datasetName);
      setDatasetToDeleteId(datasetId);
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
    if (!datasetToDelete || datasetToDeleteId === null) return;

    setIsDeleting(true);
    try {
      await deleteDataset(datasetToDeleteId);

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
      setDatasetToDeleteId(null);
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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <section className="relative flex min-h-0 flex-1 flex-col p-1">
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
                key={displayMainSlot?.key ?? "main"}
                title={displayMainSlot?.title ?? "Main Camera"}
                stream={displayMainSlot?.stream ?? null}
                fallbackImage={fallbackImageForPosition(
                  displayMainSlot?.position ?? "main",
                )}
                position="main"
                isConnected={Boolean(displayMainSlot?.stream)}
                showTitle={true}
                className="h-full rounded-[32px] border-none bg-transparent"
              />
            )}

            {fixedLeftSlot && (
              <div className="absolute bottom-4 left-4 z-30  overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
                {(() => {
                  const displaySlot =
                    displaySlotForSecondarySlot(fixedLeftSlot);
                  if (!displaySlot) {
                    return null;
                  }
                  return (
                    <CameraView
                      key={`${fixedLeftSlot.key}-${displaySlot.key}`}
                      title={displaySlot.title ?? "Left Camera"}
                      stream={displaySlot.stream ?? null}
                      fallbackImage={fallbackImageForPosition(
                        displaySlot.position,
                      )}
                      position="left"
                      isConnected={Boolean(displaySlot.stream)}
                      className="h-full w-full"
                      onSwapWithMain={() =>
                        handleSwapCameraWithMain(fixedLeftSlot.key)
                      }
                    />
                  );
                })()}
              </div>
            )}

            {fixedRightSlot && (
              <div className="absolute bottom-4 right-4 z-30  overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
                {(() => {
                  const displaySlot =
                    displaySlotForSecondarySlot(fixedRightSlot);
                  if (!displaySlot) {
                    return null;
                  }
                  return (
                    <CameraView
                      key={`${fixedRightSlot.key}-${displaySlot.key}`}
                      title={displaySlot.title ?? "Right Camera"}
                      stream={displaySlot.stream ?? null}
                      fallbackImage={fallbackImageForPosition(
                        displaySlot.position,
                      )}
                      position="right"
                      isConnected={Boolean(displaySlot.stream)}
                      className="h-full w-full"
                      onSwapWithMain={() =>
                        handleSwapCameraWithMain(fixedRightSlot.key)
                      }
                    />
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex h-full w-[360px] min-w-[320px] max-w-[380px] flex-col gap-3 rounded-[28px] border border-border bg-card/90 p-1 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <RecordingControls
              isRecording={isRecording}
              isLoading={isLoading}
              isDeploying={isDeploying}
              isDeployingRequest={deployRequestPending}
              onStart={startEpisode}
              onStop={endEpisode}
              onRewind={rewindEpisode}
              onDeploy={onDeploy}
              style={RecordingControlStyle.COMPACT}
            >
              <MemoriseRestorePose
                memorisedPose={memorisedPose}
                isLoading={poseLoading}
                isRestoring={isRestoring}
                isCompact
                onMemorise={handleMemorisePose}
                onRestore={handleRestorePose}
                onClear={handleClearPose}
              />
            </RecordingControls>
            <SidebarTabs
              tab={sidebarTab}
              onTabChange={handleTabChange}
              secondaryContent={renderSecondaryStack(sidebarSlots, "extra")}
              selectedDatasetDbId={selectedDatasetDbId}
              episodeManagementProps={{
                datasets,
                datasetItems,
                isLoadingDatasets,
                episodes,
                isDeleting,
                deletingEpisodeId,
                formatDuration,
                onRequestCreateDataset: () => setIsCreateDialogOpen(true),
                onRequestDeleteDataset: promptDeleteDataset,
                onDatasetDescriptionSave: handleDatasetDescriptionSave,
                onPromptDeleteEpisode: promptDeleteEpisode,
                selectedDatasetRouteId,
                robotId,
                isRecording,
                recordingElapsedTime: elapsedTime,
                isSavingEpisode,
                isDatasetLocked: datasetStatus === "processing",
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
        newDatasetDescription={newDatasetDescription}
        selectedRobotId={robotId}
        isCreating={isCreatingDataset}
        onNameChange={setNewDatasetName}
        onDescriptionChange={setNewDatasetDescription}
        onSubmit={handleCreateDataset}
        onCancel={() => {
          setIsCreateDialogOpen(false);
          setNewDatasetName("");
          setNewDatasetDescription("");
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
        isDatasetLocked={
          datasetToDelete === selectedDataset &&
          datasetStatus === "processing"
        }
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
              onClick={onForceStopDeploy}
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
