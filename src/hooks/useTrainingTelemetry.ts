import { AppMode } from "@/context/ModeContextDef";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import { createElement, useEffect, useRef } from "react";
import { Progress } from "../components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { toast } from "../components/ui/use-toast";

type MemorisedPose = { topics: Record<string, unknown> } | null;

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
    return dataset ? `model #${modelId} from dataset "${dataset}"` : `model #${modelId}`;
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

const formatBytes = (bytes: number | null) => {
  if (bytes === null || bytes < 0) {
    return null;
  }
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

const createDownloadToastDescription = ({
  message,
  progressPercent,
  downloadedBytes,
  totalBytes,
}: {
  message: string;
  progressPercent: number | null;
  downloadedBytes: number | null;
  totalBytes: number | null;
}) => {
  const boundedPercent =
    progressPercent === null
      ? null
      : Math.max(0, Math.min(100, progressPercent));
  const percentLabel =
    boundedPercent === null ? null : `${Math.round(boundedPercent)}%`;
  const downloadedLabel = formatBytes(downloadedBytes);
  const totalLabel = formatBytes(totalBytes);
  const detail =
    downloadedLabel && totalLabel
      ? `${downloadedLabel} of ${totalLabel}`
      : downloadedLabel;

  return createElement(
    "div",
    { className: "min-w-[260px] space-y-2" },
    createElement("div", { className: "text-sm" }, message),
    createElement(
      "div",
      { className: "flex items-center gap-2" },
      createElement(Progress, {
        value: boundedPercent ?? 100,
        className:
          boundedPercent === null
            ? "h-2 flex-1 animate-pulse"
            : "h-2 flex-1",
      }),
      percentLabel
        ? createElement(
            Tooltip,
            null,
            createElement(
              TooltipTrigger,
              { asChild: true },
              createElement(
                "span",
                {
                  className:
                    "w-10 shrink-0 cursor-default text-right text-xs font-medium tabular-nums",
                },
                percentLabel,
              ),
            ),
            createElement(
              TooltipContent,
              null,
              detail ?? `${percentLabel} downloaded`,
            ),
          )
        : null,
    ),
    detail
      ? createElement(
          "div",
          { className: "text-xs text-muted-foreground" },
          detail,
        )
      : null,
  );
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
  setMemorisedPose: (pose: MemorisedPose) => void;
  setIsRestoring: (restoring: boolean) => void;
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
  setMemorisedPose,
  setIsRestoring,
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
  const deployDownloadToastRef = useRef<ReturnType<typeof toast> | null>(null);

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
          typeof posePayload.action === "string" ? posePayload.action : null;
        const poseMsg =
          typeof posePayload.message === "string" ? posePayload.message : null;

        if (action === "pose_memorise_ack") {
          const poseData = posePayload.pose as
            | { topics: Record<string, unknown> }
            | null
            | undefined;
          console.log("[pose] memorise_ack, pose=", poseData);
          if (poseData) setMemorisedPose(poseData);
          toast({ title: "Pose memorised", description: "Saved successfully" });
          return;
        }
        if (action === "pose_get_ack") {
          const poseData = posePayload.pose as
            | { topics: Record<string, unknown> }
            | null
            | undefined;
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
          setIsRestoring(false);
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
          setIsRestoring(false);
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

      if (action === "deploy_ack" || action === "deploy_start_ack") {
        console.log("Response deployment webrtc", deployPayload);
        const active = status === "deploying" || status === "deployed";
        setIsDeploying(active);
        setDeployDatasetId(
          datasetId ?? selectedDatasetRouteIdRef.current ?? null,
        );
        setDeployModelId(resolvedModelId ?? null);
        toast({
          title: active ? "Deployment accepted" : "Deployment updated",
          description:
            message ??
            `${resolvedTarget} status: ${status ?? "updated"}.`,
        });
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
        deployDownloadToastRef.current?.dismiss();
        deployDownloadToastRef.current = null;
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
        setDeployModelId(null);
        deployDownloadToastRef.current?.dismiss();
        deployDownloadToastRef.current = null;

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

        if (status === "deploying" || status === "downloading_checkpoints") {
          const statusMessage =
            message ??
            (status === "downloading_checkpoints"
              ? `Downloading checkpoint for ${deployingTarget}...`
              : `Deploying ${deployingTarget}...`);
          setIsDeploying(true);
          setDeployDatasetId(datasetId ?? deployDatasetRef.current ?? null);
          setDeployModelId(deployingModelId ?? null);
          setDeployStatusMessage(statusMessage);
          if (status === "downloading_checkpoints") {
            const description = createDownloadToastDescription({
              message: statusMessage,
              progressPercent,
              downloadedBytes,
              totalBytes,
            });
            if (deployDownloadToastRef.current) {
              deployDownloadToastRef.current.update({
                title: "Downloading checkpoint",
                description,
                dismissible: false,
                duration: 2147483647,
              });
            } else {
              deployDownloadToastRef.current = toast({
                title: "Downloading checkpoint",
                description,
                dismissible: false,
                duration: 2147483647,
              });
            }
          } else {
            toast({
              title: "Deployment in progress",
              description: statusMessage,
            });
          }
        } else if (status === "deployed") {
          setDeployStatusPopupOpen(false);
          setDeployStatusMessage(null);
          setIsDeploying(true);
          setDeployDatasetId(datasetId ?? deployDatasetRef.current ?? null);
          setDeployModelId(deployingModelId ?? null);
          deployDownloadToastRef.current?.dismiss();
          deployDownloadToastRef.current = null;
          toast({
            title: "Deployment complete",
            description:
              message ?? `${deployingTarget} deployed successfully.`,
          });
        }
      }
    });

    return () => {
      unsubscribe();
      deployDownloadToastRef.current?.dismiss();
      deployDownloadToastRef.current = null;
    };
  }, [
    session,
    setDeployDatasetId,
    setDeployModelId,
    setDeployRequestPending,
    setDeployStatusMessage,
    setDeployStatusPopupOpen,
    setIsDeploying,
    setIsRecording,
    setIsRestoring,
    setIsSavingEpisode,
    setMemorisedPose,
    setMode,
    setSelectedDataset,
  ]);
}
