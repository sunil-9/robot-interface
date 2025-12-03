import { API_CONFIG } from "@/config/api";
import { AppMode } from "@/context/ModeContextDef";
import { useBridgeData } from "@/hooks/useBridgeData";
import { useModeContext } from "@/hooks/useModeContext";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import {
  createDataset,
  fetchDatasets,
  fetchRobotCameras,
  type RobotCameraConfig,
} from "@/lib/api";
import * as episodeApi from "@/services/episodeApi";
import { DatabaseBackup, Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionVarianceChart } from "./ActionVarianceChart";
import { CameraView } from "./CameraView";
import {
  EpisodeManagementContent,
  EpisodeManagementSidebar,
} from "./training/EpisodeManagementSidebar";
import { CreateDatasetDialog } from "./training/dialogs/CreateDatasetDialog";
import { DeleteDatasetDialog } from "./training/dialogs/DeleteDatasetDialog";
import { DeleteEpisodeDialog } from "./training/dialogs/DeleteEpisodeDialog";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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
  const [sidebarTab, setSidebarTab] = useState<"secondary" | "episodes">(
    "secondary"
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
  const { setMode } = useModeContext();
  const episodePanelActive = isSidebarOpen || sidebarTab === "episodes";

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
  const secondarySlots = [...leftSlots, ...rightColumnSlots];

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

  const renderSecondaryStack = (
    slots: CameraSlot[],
    fallbackPosition: "left" | "right"
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
              slot.position === "extra" ? fallbackPosition : slot.position
            )}
            position={slot.position}
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
  }, [selectedDataset]);

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
      // Update episodes list if episode management UI is visible
      if (episodePanelActive) {
        fetchEpisodes();
      }
    } catch (error) {
      console.error("Failed to start episode:", error);
    } finally {
      setMode(AppMode.RECORDING);
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
    setMode(AppMode.TRAINING);
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
      // Update episodes list if episode management UI is visible
      if (episodePanelActive) {
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
    toast({
      title: "Info",
      description: "Deploy functionality is not implemented yet",
    });
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
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <section className="relative  flex  h-screen  flex-1 flex-col p-4 ">
        <div className="flex flex-1 min-h-0 gap-2 pr-4">
          <div className="relative flex-1 overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_25px_70px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
            <div className="absolute left-5 top-5 z-20 rounded-lg border border-border bg-card/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur">
              Primary View
            </div>

            <div className="absolute left-5 top-16 z-20">
              <div className="shadow-lg backdrop-blur p-0">
                <ActionVarianceChart
                  title="2 sec future"
                  overlay
                  compact
                  showTitle={false}
                />
              </div>
            </div>

            <div className="absolute right-5 top-5 z-20 flex flex-col items-end gap-2 bg-transparent text-xs opacity-50 transition-opacity hover:opacity-100">
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
              </div>
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

            <CameraView
              key={mainSlot?.key ?? "main"}
              title={mainSlot?.title ?? "Main Camera"}
              stream={mainSlot?.stream ?? null}
              fallbackImage={fallbackImageForPosition(
                mainSlot?.position ?? "main"
              )}
              position={mainSlot?.position ?? "main"}
              isConnected={Boolean(mainSlot?.stream)}
              showTitle={false}
              className="h-full rounded-[32px] border-none bg-transparent"
            />

            {/* <EpisodeManagementSidebar
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
              accentColor="emerald"
            /> */}
          </div>

          <div className="flex h-full w-[360px] min-w-[320px] max-w-[380px] flex-col gap-3 rounded-[28px] border border-border bg-card/90 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <Tabs
              value={sidebarTab}
              onValueChange={(value) =>
                setSidebarTab(value as "secondary" | "episodes")
              }
              className="flex h-full flex-col"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/60 p-1">
                <TabsTrigger
                  value="secondary"
                  className="rounded-xl text-[11px] font-semibold uppercase tracking-wide"
                >
                  Secondary
                </TabsTrigger>
                <TabsTrigger
                  value="episodes"
                  className="rounded-xl text-[11px] font-semibold uppercase tracking-wide"
                >
                  Episodes
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="secondary"
                className="flex-1 focus-visible:outline-none"
              >
                <div className="mt-2 flex h-full flex-col gap-3">
                  <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Secondary Cameras
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {renderSecondaryStack(secondarySlots, "right")}
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="episodes"
                className="flex-1 focus-visible:outline-none"
              >
                <div className="mt-2 h-full overflow-hidden rounded-2xl border border-border bg-muted/50 dark:bg-muted/20">
                  <EpisodeManagementContent
                    isActive={sidebarTab === "episodes"}
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
                    accentColor="emerald"
                    className="h-full"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.2)] backdrop-blur dark:shadow-[0_18px_45px_rgba(0,0,0,0.4)]">
          <Button
            onClick={isRecording ? endEpisode : startEpisode}
            disabled={isLoading}
            className={`rounded-full px-5 ${
              isRecording
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-emerald-500 hover:bg-emerald-600"
            } text-white shadow-sm`}
          >
            {isRecording ? (
              <Square className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isRecording ? "End" : "Start"}
          </Button>

          <Button
            onClick={rewindEpisode}
            disabled={isLoading || !currentEpisodeId}
            variant="outline"
            className="rounded-full border-border bg-muted text-foreground hover:bg-muted/80"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Rewind
          </Button>
          <Button
            onClick={handleDeploy}
            variant="outline"
            className="rounded-full border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <DatabaseBackup className="mr-2 h-4 w-4" />
            Deploy
          </Button>
        </div>
      </div>

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
