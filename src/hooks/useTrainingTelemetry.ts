import type { DeployAvailabilityState } from "@/context/EpisodeControlContext";
import { AppMode } from "@/context/ModeContextDef";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import { requestTrainingSidebarTab } from "@/lib/trainingSidebarTab";
import { type MemorisedPose } from "@/types/pose";
import { useEffect, useRef } from "react";
import { toast } from "../components/ui/use-toast";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readPoseList = (value: unknown): MemorisedPose[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((pose): pose is MemorisedPose => {
    if (!isRecord(pose)) {
      return false;
    }
    return (
      typeof pose.id === "string" &&
      pose.id.trim().length > 0 &&
      typeof pose.name === "string" &&
      pose.name.trim().length > 0 &&
      typeof pose.created_at === "string" &&
      pose.created_at.trim().length > 0 &&
      isRecord(pose.topics)
    );
  });
};

const readIdField = (
  record: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
) => {
  const value = record[camelKey] ?? record[snakeKey];
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
};

const describeDeployTarget = (
  dataset: string | null | undefined,
  modelId: string | null | undefined,
) => {
  if (modelId) {
    return dataset
      ? `model #${modelId} from dataset "${dataset}"`
      : `model #${modelId}`;
  }
  return dataset ? `dataset "${dataset}"` : "deployment";
};

const readNumberField = (
  record: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
) => {
  const value = record[camelKey] ?? record[snakeKey];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const readBooleanField = (
  record: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
) => {
  const value = record[camelKey] ?? record[snakeKey];
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
};

interface UseTrainingTelemetryOptions {
  session: WebRTCSession;
  userId?: number;
  selectedDataset: string;
  selectedDatasetRouteId: string | null;
  datasetNameById: Map<string, string>;
  deployDatasetId: string | null;
  deployModelId: string | null;
  isRecording: boolean;
  isSavingEpisode: boolean;
  episodesWsEnabled: boolean;
  fetchEpisodes: (datasetIdOverride?: string | number) => Promise<void>;
  setMode: (mode: AppMode) => void;
  setSelectedDataset: (datasetName: string) => void;
  setIsRecording: (recording: boolean) => void;
  setIsSavingEpisode: (saving: boolean) => void;
  setIsDeploying: (deploying: boolean) => void;
  setDeployRequestPending: (pending: boolean) => void;
  setDeployDatasetId: (datasetId: string | null) => void;
  setDeployModelId: (modelId: string | null) => void;
  setDeployStatusPopupOpen: (open: boolean) => void;
  setDeployStatusMessage: (message: string | null) => void;
  setDeployProgress: (progress: {
    progressPercent?: number | null;
    downloadedBytes?: number | null;
    totalBytes?: number | null;
  }) => void;
  setDeployAvailabilityForModel: (
    modelId: string | null,
    state: DeployAvailabilityState,
  ) => void;
  setMemorisedPoses: (poses: MemorisedPose[]) => void;
  setPoseLoading: (loading: boolean) => void;
  setRestoringPoseId: (poseId: string | null) => void;
}

export function useTrainingTelemetry({
  session,
  userId,
  selectedDataset,
  selectedDatasetRouteId,
  datasetNameById,
  deployDatasetId,
  deployModelId,
  isRecording,
  isSavingEpisode,
  episodesWsEnabled,
  fetchEpisodes,
  setMode,
  setSelectedDataset,
  setIsRecording,
  setIsSavingEpisode,
  setIsDeploying,
  setDeployRequestPending,
  setDeployDatasetId,
  setDeployModelId,
  setDeployStatusPopupOpen,
  setDeployStatusMessage,
  setDeployProgress,
  setDeployAvailabilityForModel,
  setMemorisedPoses,
  setPoseLoading,
  setRestoringPoseId,
}: UseTrainingTelemetryOptions) {
  const selectedDatasetRef = useRef(selectedDataset);
  const selectedDatasetRouteIdRef = useRef<string | null>(
    selectedDatasetRouteId,
  );
  const datasetNameByIdRef = useRef(datasetNameById);
  const deployDatasetRef = useRef<string | null>(deployDatasetId);
  const deployModelRef = useRef<string | null>(deployModelId);
  const isRecordingRef = useRef(isRecording);
  const isSavingEpisodeRef = useRef(isSavingEpisode);
  const episodesWsEnabledRef = useRef(episodesWsEnabled);
  const fetchEpisodesRef = useRef(fetchEpisodes);
  const downloadNotificationActiveRef = useRef(false);

  useEffect(() => {
    selectedDatasetRef.current = selectedDataset;
  }, [selectedDataset]);

  useEffect(() => {
    selectedDatasetRouteIdRef.current = selectedDatasetRouteId;
  }, [selectedDatasetRouteId]);

  useEffect(() => {
    datasetNameByIdRef.current = datasetNameById;
  }, [datasetNameById]);

  useEffect(() => {
    deployDatasetRef.current = deployDatasetId;
  }, [deployDatasetId]);

  useEffect(() => {
    deployModelRef.current = deployModelId;
  }, [deployModelId]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isSavingEpisodeRef.current = isSavingEpisode;
  }, [isSavingEpisode]);

  useEffect(() => {
    episodesWsEnabledRef.current = episodesWsEnabled;
  }, [episodesWsEnabled]);

  useEffect(() => {
    fetchEpisodesRef.current = fetchEpisodes;
  }, [fetchEpisodes]);

  useEffect(() => {
    if (!selectedDatasetRouteId || !session.telemetryOpen) {
      return;
    }
    if (typeof userId !== "number") {
      return;
    }
    session.sendControl({
      type: "dataset",
      payload: {
        action: "activate",
        datasetId: selectedDatasetRouteId,
        userId: String(userId),
      },
    });
  }, [selectedDatasetRouteId, session, session.telemetryOpen, userId]);

  useEffect(() => {
    const unsubscribe = session.onTelemetry((payload) => {
      if (!payload || typeof payload !== "object") {
        return;
      }

      const record = payload as Record<string, unknown>;
      const type = typeof record.type === "string" ? record.type : null;
      const rawPayload = record.payload;
      if (!rawPayload || typeof rawPayload !== "object") {
        return;
      }

      if (type === "dataset") {
        const datasetPayload = rawPayload as Record<string, unknown>;
        const action =
          typeof datasetPayload.action === "string"
            ? datasetPayload.action.toLowerCase()
            : null;
        const message =
          typeof datasetPayload.message === "string"
            ? datasetPayload.message
            : null;
        const status =
          typeof datasetPayload.status === "string"
            ? datasetPayload.status
            : null;
        const datasetId =
          typeof datasetPayload.datasetId === "string"
            ? datasetPayload.datasetId
            : typeof datasetPayload.dataset_id === "string"
              ? datasetPayload.dataset_id
              : null;
        const datasetName = datasetId
          ? (datasetNameByIdRef.current.get(datasetId) ?? null)
          : null;
        const datasetLabel =
          datasetName ?? selectedDatasetRef.current ?? datasetId ?? null;

        if (datasetName && selectedDatasetRef.current !== datasetName) {
          setSelectedDataset(datasetName);
          selectedDatasetRef.current = datasetName;
        }

        if (action === "collection_start_ack") {
          console.log("started with", datasetPayload.datasetId);
          if (!isRecordingRef.current) {
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
          if (status?.toLowerCase() === "busy") {
            setIsRecording(true);
            setMode(AppMode.RECORDING);
            toast({
              title: "Recording already active",
              description: datasetLabel
                ? `Recording is already running for dataset "${datasetLabel}". Use Stop to finish the episode.`
                : "Recording is already running. Use Stop to finish the episode.",
            });
            return;
          }

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
          setIsRecording(false);
          setMode(AppMode.EXPLORATION);

          if (!isSavingEpisodeRef.current) {
            setIsSavingEpisode(true);
          }

          if (!episodesWsEnabledRef.current) {
            setIsSavingEpisode(false);
            void fetchEpisodesRef.current(datasetId ?? undefined);
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
        }
        return;
      }

      if (type === "pose") {
        const posePayload = rawPayload as Record<string, unknown>;
        const action =
          typeof posePayload.action === "string"
            ? posePayload.action.toLowerCase()
            : null;
        const poseMsg =
          typeof posePayload.message === "string" ? posePayload.message : null;

        if (action === "pose_memorise_ack") {
          const poses = readPoseList(posePayload.poses);
          const poseId = readIdField(posePayload, "poseId", "pose_id");
          const memorisedPose = poses.find((pose) => pose.id === poseId);
          console.log("[pose] memorise_ack, poses=", poses);
          setMemorisedPoses(poses);
          setPoseLoading(false);
          toast({
            title: "Pose memorised",
            description: memorisedPose
              ? `Saved as “${memorisedPose.name}”`
              : "Saved successfully",
          });
          return;
        }
        if (action === "pose_get_ack") {
          const poses = readPoseList(posePayload.poses);
          console.log("[pose] get_ack, poses=", poses);
          setMemorisedPoses(poses);
          setPoseLoading(false);
          return;
        }
        if (action === "pose_rename_ack") {
          const poses = readPoseList(posePayload.poses);
          console.log("[pose] rename_ack, poses=", poses);
          setMemorisedPoses(poses);
          setPoseLoading(false);
          toast({ title: "Pose renamed" });
          return;
        }
        if (action === "pose_delete_ack") {
          const poses = readPoseList(posePayload.poses);
          console.log("[pose] delete_ack, poses=", poses);
          setMemorisedPoses(poses);
          setPoseLoading(false);
          toast({ title: "Pose deleted" });
          return;
        }
        if (action === "pose_restore_ack") {
          const result = posePayload.result as
            | Record<string, unknown>
            | undefined;
          console.log(
            "[pose] restore_ack, msg=",
            poseMsg,
            "max_error_rad=",
            result?.max_abs_error_rad,
            "final_positions=",
            result?.final_positions,
          );
          setPoseLoading(false);
          setRestoringPoseId(null);
          toast({
            title: "Pose restored",
            description: poseMsg ?? "Robot returned to memorised pose",
          });
          return;
        }
        if (action?.endsWith("_nack")) {
          console.log(
            "[pose] nack, action=",
            action,
            "msg=",
            poseMsg,
            "full=",
            posePayload,
          );
          setPoseLoading(false);
          setRestoringPoseId(null);
          toast({
            title: "Pose error",
            description: poseMsg ?? "Pose action failed",
            variant: "destructive",
          });
          return;
        }
        console.log("[pose] unhandled action=", action, "full=", posePayload);
        return;
      }

      if (type !== "deploy") {
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
      const progressPercent = readNumberField(
        deployPayload,
        "progressPercent",
        "progress_percent",
      );
      const downloadedBytes = readNumberField(
        deployPayload,
        "downloadedBytes",
        "downloaded_bytes",
      );
      const totalBytes = readNumberField(
        deployPayload,
        "totalBytes",
        "total_bytes",
      );
      const checkpointAvailable = readBooleanField(
        deployPayload,
        "checkpointAvailable",
        "checkpoint_available",
      );
      const defaultModelStatus = readBooleanField(
        deployPayload,
        "defaultModel",
        "default_model",
      );
      const datasetId = readIdField(deployPayload, "datasetId", "dataset_id");
      const modelId = readIdField(deployPayload, "modelId", "model_id");
      const datasetName = datasetId
        ? (datasetNameByIdRef.current.get(datasetId) ?? null)
        : null;
      const resolvedModelId = modelId ?? deployModelRef.current;

      const resolvedDataset =
        datasetName ??
        (deployDatasetRef.current
          ? (datasetNameByIdRef.current.get(deployDatasetRef.current) ??
            deployDatasetRef.current)
          : null) ??
        selectedDatasetRef.current ??
        datasetId ??
        undefined;
      const resolvedTarget = describeDeployTarget(
        resolvedDataset,
        resolvedModelId,
      );

      setDeployRequestPending(false);

      const updateAvailability = (state: DeployAvailabilityState) => {
        setDeployAvailabilityForModel(
          defaultModelStatus ? null : (resolvedModelId ?? null),
          state,
        );
      };

      if (action === "deploy_ack" || action === "deploy_start_ack") {
        console.log("Response deployment webrtc", deployPayload);
        const active = status === "deploying" || status === "deployed";
        setIsDeploying(active);
        setDeployDatasetId(
          datasetId ?? selectedDatasetRouteIdRef.current ?? null,
        );
        setDeployModelId(resolvedModelId ?? null);
        updateAvailability(active ? "deployed" : "unknown");
        return;
      }

      if (
        action === "deploy_nack" ||
        action === "deploy_start_nack" ||
        action === "deploy_stop_nack" ||
        status === "error"
      ) {
        const noActiveDeployment =
          message?.toLowerCase() === "no active deployment";
        const shouldClearDeployState =
          status === "error" ||
          noActiveDeployment ||
          action === "deploy_nack" ||
          (action === "deploy_start_nack" && status !== "busy");
        setDeployStatusPopupOpen(false);
        setDeployStatusMessage(null);
        if (shouldClearDeployState) {
          setIsDeploying(false);
          setDeployDatasetId(null);
          setDeployModelId(null);
        }
        updateAvailability("unknown");
        downloadNotificationActiveRef.current = false;
        setDeployStatusPopupOpen(false);
        setDeployProgress({
          progressPercent: null,
          downloadedBytes: null,
          totalBytes: null,
        });
        toast({
          title: "Deployment failed",
          description:
            message ??
            "Deployment request was rejected. Check deployment services and try again.",
          variant: "destructive",
        });
        requestTrainingSidebarTab("models");

        return;
      }
      if (action === "deploy_stop_ack" || status === "stopped") {
        setIsDeploying(false);
        setDeployDatasetId(null);
        setDeployModelId(null);
        updateAvailability(
          checkpointAvailable === false ? "missing" : "available",
        );
        downloadNotificationActiveRef.current = false;
        setDeployStatusPopupOpen(false);
        setDeployProgress({
          progressPercent: null,
          downloadedBytes: null,
          totalBytes: null,
        });

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
            ? (datasetNameByIdRef.current.get(deployDatasetRef.current) ??
              deployDatasetRef.current)
            : null) ??
          selectedDatasetRef.current ??
          datasetId ??
          undefined;
        const deployingModelId = modelId ?? deployModelRef.current;
        const deployingTarget = describeDeployTarget(
          deployingDataset,
          deployingModelId,
        );

        if (status === "available" || status === "missing") {
          setDeployStatusMessage(null);
          updateAvailability(status === "available" ? "available" : "missing");
          return;
        }

        if (status === "deploying" || status === "downloading_checkpoints") {
          const statusMessage =
            message ??
            (status === "downloading_checkpoints"
              ? `Updating model for ${deployingTarget}...`
              : `Compressing model for ${deployingTarget}...`);
          setIsDeploying(true);
          setDeployDatasetId(datasetId ?? deployDatasetRef.current ?? null);
          setDeployModelId(deployingModelId ?? null);
          setDeployStatusMessage(statusMessage);
          if (status === "downloading_checkpoints") {
            updateAvailability("downloading");
            downloadNotificationActiveRef.current = true;
            setDeployStatusPopupOpen(true);
            setDeployProgress({
              progressPercent,
              downloadedBytes,
              totalBytes,
            });
          } else {
            updateAvailability("downloading");
            downloadNotificationActiveRef.current = true;
            setDeployStatusPopupOpen(true);
            setDeployProgress({
              progressPercent: null,
              downloadedBytes: null,
              totalBytes: null,
            });
          }
        } else if (status === "deployed") {
          setDeployStatusMessage(null);
          setIsDeploying(true);
          setDeployDatasetId(datasetId ?? deployDatasetRef.current ?? null);
          setDeployModelId(deployingModelId ?? null);
          updateAvailability("deployed");
          if (downloadNotificationActiveRef.current) {
            downloadNotificationActiveRef.current = false;
            setDeployStatusPopupOpen(true);
            setDeployStatusMessage(
              message ?? `${deployingTarget} downloaded and deployed.`,
            );
            setDeployProgress({
              progressPercent: 100,
            });
          } else {
            console.log("deploy status is ", status);
            // toast({
            //   title: "Deployment complete",
            //   description:
            //     message ?? `${deployingTarget} deployed successfully.`,
            //   duration: 2147483647,
            // });
          }
        }
      }
    });

    return () => {
      unsubscribe();
      downloadNotificationActiveRef.current = false;
    };
  }, [
    session,
    setDeployDatasetId,
    setDeployModelId,
    setDeployRequestPending,
    setDeployStatusMessage,
    setDeployStatusPopupOpen,
    setDeployProgress,
    setDeployAvailabilityForModel,
    setIsDeploying,
    setIsRecording,
    setIsSavingEpisode,
    setMemorisedPoses,
    setMode,
    setPoseLoading,
    setRestoringPoseId,
    setSelectedDataset,
  ]);
}
