import { API_CONFIG } from "@/config/api";
import { useBridgeData } from "@/hooks/useBridgeData";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import {
  createDataset,
  fetchDatasets,
  fetchRobotCameras,
  type RobotCameraConfig,
} from "@/lib/api";
import * as episodeApi from "@/services/episodeApi";
import { Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CameraView } from "./CameraView";
import { MockActionVarianceChart } from "./MockActionVarianceChart";
import { EpisodeManagementSidebar } from "./training/EpisodeManagementSidebar";
import { CreateDatasetDialog } from "./training/dialogs/CreateDatasetDialog";
import { DeleteDatasetDialog } from "./training/dialogs/DeleteDatasetDialog";
import { DeleteEpisodeDialog } from "./training/dialogs/DeleteEpisodeDialog";
import { Button } from "./ui/button";
import { toast } from "./ui/use-toast";

interface TrainingInterfaceProps {
  robotId: string | null;
  controllerId: string | null;
  session: WebRTCSession;
}

export const TrainingInterface = ({
  robotId,
  session,
}: TrainingInterfaceProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [episodes, setEpisodes] = useState<episodeApi.Episode[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  const [selectedDataset, setSelectedDataset] = useState<string>("");
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
          configs.length === 0 ? "No cameras configured for this robot." : null
        );
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCameraConfigs([]);
        setCameraError(
          error instanceof Error
            ? error.message
            : "Failed to load camera configuration."
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
      value: unknown
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
            !consumed.has(item.index) && item.normalized === normalizedLabel
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
          : undefined
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
  const extrasForRight = extraSlots.filter(
    (slot) => slot.key !== mainSlot?.key
  );
  const rightColumnSlots = [...rightSlots, ...extrasForRight];

  const fallbackImageForPosition = (
    position: "main" | "left" | "right" | "extra"
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

  const renderColumn = (
    slots: CameraSlot[],
    fallbackPosition: "left" | "right"
  ) => {
    if (slots.length === 0) {
      return (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-purple-900/40 bg-black/40 text-xs text-gray-500">
          No {fallbackPosition} cameras
        </div>
      );
    }

    return (
      <div className="grid h-full auto-rows-fr gap-2">
        {slots.map((slot) => (
          <CameraView
            key={slot.key}
            title={slot.title}
            stream={slot.stream}
            fallbackImage={fallbackImageForPosition(
              slot.position === "extra" ? fallbackPosition : slot.position
            )}
            position={slot.position}
            isConnected={Boolean(slot.stream)}
            className="rounded-lg border border-purple-900/40 bg-gray-950/40"
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
  }, [selectedDataset]);

  // Fetch episodes when sidebar opens or selected dataset changes
  useEffect(() => {
    if (isSidebarOpen && selectedDataset) {
      fetchEpisodes();
    }
    if (isSidebarOpen) {
      loadDatasets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarOpen, selectedDataset]);

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
  const fetchEpisodes = async () => {
    if (!selectedDataset) {
      return;
    }

    try {
      const response = await episodeApi.listEpisodes(selectedDataset);
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
    if (!selectedDataset) {
      toast({
        title: "Error",
        description: "Select a dataset before starting an episode",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const sent = session.sendControl({
        type: "dataset",
        payload: {
          action: "start",
          datasetId: selectedDataset,
        },
      });

      if (!sent) {
        toast({
          title: "Error",
          description: "Failed to send start request to robot",
          variant: "destructive",
        });
        return;
      }

      setCurrentEpisodeId((prev) => prev ?? "pending");
      setIsRecording(true);
      // Update episodes list if sidebar is open
      if (isSidebarOpen) {
        fetchEpisodes();
      }
    } catch (error) {
      console.error("Failed to start episode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const endEpisode = async () => {
    if (!selectedDataset) {
      toast({
        title: "Error",
        description: "Select a dataset before starting an episode",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const sent = session.sendControl({
        type: "dataset",
        payload: {
          action: "stop",
          datasetId: selectedDataset,
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

      setIsRecording(false);
      setCurrentEpisodeId(null);
      // Update episodes list if sidebar is open
      if (isSidebarOpen) {
        fetchEpisodes();
      }
    } catch (error) {
      console.error("Failed to end episode:", error);
    } finally {
      setIsLoading(false);
    }
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
    } catch (error) {
      console.error("Failed to rewind episode:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
      fetchEpisodes();
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
        }
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
    <div className="h-screen w-screen overflow-hidden bg-black text-white">
      <main className="grid h-full grid-rows-[60%_40%]">
        <div className="relative h-full">
          <CameraView
            key={mainSlot?.key ?? "main"}
            title={mainSlot?.title ?? "Main Camera"}
            stream={mainSlot?.stream ?? null}
            fallbackImage={fallbackImageForPosition(
              mainSlot?.position ?? "main"
            )}
            position={mainSlot?.position ?? "main"}
            isConnected={Boolean(mainSlot?.stream)}
            className="h-full rounded-none border border-purple-900/40 bg-black"
          />

          <div className="absolute top-10 left-4 z-10 w-[260px] opacity-90 transition-opacity hover:opacity-100">
            <MockActionVarianceChart
              title="2 sec future"
              overlay
              compact
              showTitle={false}
            />
          </div>

          <div className="absolute top-8 right-4 z-10 flex flex-col items-end gap-2 text-xs">
            <div className="rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 shadow-lg">
              <div>
                <span className="text-gray-400">Signaling:</span>{" "}
                <span
                  className={
                    session.signalingConnected
                      ? "text-green-300"
                      : "text-yellow-200"
                  }
                >
                  {session.signalingConnected ? "connected" : "connecting"}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Peer:</span>{" "}
                <span className="text-purple-200">
                  {session.connectionState}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Telemetry:</span>{" "}
                <span
                  className={
                    session.telemetryOpen ? "text-green-300" : "text-yellow-200"
                  }
                >
                  {session.telemetryOpen ? "open" : "pending"}
                </span>
              </div>
            </div>
            {cameraLoading && (
              <span className="rounded bg-purple-900/60 px-2 py-1 text-[11px] text-purple-100 shadow">
                Loading camera config…
              </span>
            )}
            {cameraError && (
              <span className="rounded bg-yellow-900/60 px-2 py-1 text-[11px] text-yellow-200 shadow">
                {cameraError}
              </span>
            )}
          </div>
          <EpisodeManagementSidebar
            isOpen={isSidebarOpen}
            onOpenChange={setIsSidebarOpen}
            datasets={datasets}
            selectedDataset={selectedDataset}
            isLoadingDatasets={isLoadingDatasets}
            episodes={episodes}
            isDeleting={isDeleting}
            formatDuration={formatDuration}
            onSelectDataset={setSelectedDataset}
            onRequestCreateDataset={() => setIsCreateDialogOpen(true)}
            onRequestDeleteDataset={promptDeleteDataset}
            onPromptDeleteEpisode={promptDeleteEpisode}
          />
        </div>

        <div className="grid h-full grid-cols-7 gap-2 border-t border-purple-900/40 bg-gray-950/40 p-2">
          <div className="col-span-3">{renderColumn(leftSlots, "left")}</div>

          <div className="col-span-1 flex flex-col items-center justify-center gap-2">
            <Button
              onClick={isRecording ? endEpisode : startEpisode}
              disabled={isLoading}
              className={`w-full ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } text-white`}
            >
              {isRecording ? (
                <Square className="mr-1 h-4 w-4" />
              ) : (
                <Play className="mr-1 h-4 w-4" />
              )}
              {isRecording ? "End" : "Start"}
            </Button>

            <Button
              onClick={rewindEpisode}
              disabled={isLoading || !currentEpisodeId}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Rewind
            </Button>
          </div>

          <div className="col-span-3">
            {renderColumn(rightColumnSlots, "right")}
          </div>
        </div>
      </main>

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
    </div>
  );
};
