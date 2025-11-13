import { API_CONFIG } from "@/config/api";
import { parseCloudApiResponse } from "@/utils/apiResponse";
import { useBridgeData } from "@/hooks/useBridgeData";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import {
  createDataset,
  fetchDatasets,
  fetchRobotCameras,
  type RobotCameraConfig,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import * as episodeApi from "@/services/episodeApi";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  FolderPlus,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CameraView } from "./CameraView";
import { MockActionVarianceChart } from "./MockActionVarianceChart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { toast } from "./ui/use-toast";

// Old Episode interface kept for mock episode controls (start/end/rewind)
// These are separate from the persisted episodes managed by the API
interface MockEpisode {
  id: string;
  name: string;
  status:
    | "idle"
    | "recording"
    | "paused"
    | "completed"
    | "replaying"
    | "rewinding";
  start_time?: string;
  end_time?: string;
  duration?: number;
  data_count: number;
  created_at: string;
  updated_at: string;
}

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
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<string>>(
    new Set()
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<{
    datasetId: string;
    episodeId: string;
  } | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
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

  // Episode recording session controls API
  const EPISODES_API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EPISODES}`;

  // Simplified API calls for episode control
  const startEpisode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${EPISODES_API_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Episode ${new Date().toLocaleTimeString()}`,
        }),
      });
      const data = await parseCloudApiResponse<{
        success?: boolean;
        episode?: { id: string };
      }>(response);
      if (data.success && data.episode) {
        setCurrentEpisodeId(data.episode.id);
        setIsRecording(true);
        // Update episodes list if sidebar is open
        if (isSidebarOpen) {
          fetchEpisodes();
        }
      }
    } catch (error) {
      console.error("Failed to start episode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const endEpisode = async () => {
    setIsLoading(true);
    try {
      await fetch(`${EPISODES_API_URL}/end`, { method: "POST" });
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
      await fetch(`${EPISODES_API_URL}/rewind`, { method: "POST" });
      // Update episodes list if sidebar is open
      if (isSidebarOpen) {
        fetchEpisodes();
      }
    } catch (error) {
      console.error("Failed to rewind episode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Additional episode management functions
  const replayEpisode = async (datasetId: string, episodeId: string) => {
    setIsLoading(true);
    try {
      const response = await episodeApi.replayEpisode(datasetId, episodeId);
      toast({
        title: "Success",
        description: response.message,
      });
      fetchEpisodes();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to replay episode",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      setSelectedEpisodes(new Set());
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

  const promptBulkDelete = () => {
    if (!selectedDataset || selectedEpisodes.size === 0) {
      toast({
        title: "Error",
        description: "No episodes selected",
        variant: "destructive",
      });
      return;
    }
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (!selectedDataset || selectedEpisodes.size === 0) return;

    setIsDeleting(true);

    try {
      const response = await episodeApi.bulkDeleteEpisodes({
        dataset_id: selectedDataset,
        episode_ids: Array.from(selectedEpisodes),
      });

      toast({
        title: "Success",
        description: response.message,
      });

      fetchEpisodes();
      setSelectedEpisodes(new Set());
      setBulkDeleteConfirmOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete episodes",
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

  const toggleEpisodeSelection = (episodeId: string) => {
    const newSelection = new Set(selectedEpisodes);
    if (newSelection.has(episodeId)) {
      newSelection.delete(episodeId);
    } else {
      newSelection.add(episodeId);
    }
    setSelectedEpisodes(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedEpisodes.size === episodes.length) {
      setSelectedEpisodes(new Set());
    } else {
      setSelectedEpisodes(new Set(episodes.map((ep) => ep.episode_id)));
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recording":
        return "bg-red-500";
      case "completed":
        return "bg-green-500";
      case "replaying":
        return "bg-blue-500";
      case "rewinding":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
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
          <div className="fixed inset-y-0 right-0 flex items-center z-30">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-16 w-6 rounded-full border border-purple-600/70 bg-gray-950/80 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-300 flex items-center justify-center",
                    "hover:bg-purple-900/40 hover:scale-110 hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                  )}
                >
                  {isSidebarOpen ? (
                    <ArrowRight className="h-16 w-16 stroke-[2.5]" />
                  ) : (
                    <ArrowLeft className="h-16 w-16 stroke-[2.5]" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="h-full w-[400px] bg-gray-900 p-0 sm:w-[540px]">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-gray-800 p-4">
                    <h2 className="text-xl font-bold text-white">
                      Episode Management
                    </h2>
                  </div>

                  {/* Dataset Selection */}
                  <div className="border-b border-gray-800 p-4">
                    <Label
                      htmlFor="dataset-select"
                      className="mb-2 block text-sm font-medium text-gray-300"
                    >
                      Dataset
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedDataset}
                        onValueChange={(value) => {
                          if (value === "__create_new__") {
                            setIsCreateDialogOpen(true);
                          } else {
                            setSelectedDataset(value);
                          }
                        }}
                        disabled={isLoadingDatasets}
                      >
                        <SelectTrigger
                          id="dataset-select"
                          className="flex-1 bg-gray-800 border-gray-700 text-white"
                        >
                          <SelectValue
                            placeholder={
                              isLoadingDatasets
                                ? "Loading datasets..."
                                : "Select a dataset"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {datasets.map((dataset) => (
                            <div
                              key={dataset}
                              className="flex items-center justify-between hover:bg-gray-700 group"
                            >
                              <SelectItem
                                value={dataset}
                                className="flex-1 text-white focus:bg-gray-700"
                              >
                                {dataset}
                              </SelectItem>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  promptDeleteDataset(dataset);
                                }}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <SelectItem
                            value="__create_new__"
                            className="text-green-400 focus:bg-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <FolderPlus className="h-4 w-4" />
                              <span>Create New Dataset</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedDataset && (
                      <p className="mt-2 text-xs text-gray-400">
                        Episodes will be saved to:{" "}
                        <span className="text-purple-300">
                          {selectedDataset}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Episodes List */}
                  <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {!selectedDataset ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-gray-400">
                          Please select a dataset first
                        </p>
                      </div>
                    ) : episodes.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-gray-400">
                          No episodes found in this dataset
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Bulk actions toolbar */}
                        <div className="flex items-center gap-2 p-3 bg-gray-800 rounded border border-gray-700">
                          <Checkbox
                            checked={
                              selectedEpisodes.size === episodes.length &&
                              episodes.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-sm flex-1 text-gray-300">
                            {selectedEpisodes.size > 0
                              ? `${selectedEpisodes.size} episode(s) selected`
                              : "Select all"}
                          </span>
                          {selectedEpisodes.size > 0 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={promptBulkDelete}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete Selected
                            </Button>
                          )}
                        </div>

                        {episodes.map((episode) => (
                          <Card
                            key={episode.episode_id}
                            className="bg-gray-800 border-gray-700 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedEpisodes.has(
                                  episode.episode_id
                                )}
                                onCheckedChange={() =>
                                  toggleEpisodeSelection(episode.episode_id)
                                }
                              />
                              <div className="flex-1">
                                <div className="mb-2 flex items-center gap-2">
                                  <h3 className="font-medium text-white">
                                    Episode {episode.episode_id}
                                  </h3>
                                  <Badge
                                    className={
                                      episode.metadata.replay_count === 0
                                        ? "bg-gray-500"
                                        : episode.metadata.replay_count < 5
                                        ? "bg-blue-500"
                                        : "bg-green-500"
                                    }
                                  >
                                    {episode.metadata.replay_count} replays
                                  </Badge>
                                  {episode.metadata.quality_score && (
                                    <Badge
                                      variant="outline"
                                      className="text-white border-gray-600"
                                    >
                                      Quality:{" "}
                                      {episode.metadata.quality_score.toFixed(
                                        1
                                      )}
                                    </Badge>
                                  )}
                                </div>
                                {episode.metadata.description && (
                                  <p className="text-sm text-gray-400 mb-2">
                                    {episode.metadata.description}
                                  </p>
                                )}
                                <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(
                                      episode.metadata.created_at
                                    ).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(
                                      episode.metadata.total_length
                                    )}
                                  </div>
                                  <div>
                                    Frames: {episode.metadata.frame_count}
                                  </div>
                                  <div>
                                    {episode.metadata.tags.length > 0 && (
                                      <span>
                                        Tags: {episode.metadata.tags.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      replayEpisode(
                                        episode.dataset_id,
                                        episode.episode_id
                                      )
                                    }
                                    disabled={isLoading}
                                    className="flex-1 border-gray-600 text-white hover:bg-gray-700"
                                  >
                                    <RotateCw className="mr-1 h-3 w-3" />
                                    Replay
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      promptDeleteEpisode(
                                        episode.dataset_id,
                                        episode.episode_id
                                      )
                                    }
                                    disabled={isDeleting}
                                    className="flex-1"
                                  >
                                    <Trash2 className="mr-1 h-3 w-3" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
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

      {/* Create Dataset Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Create New Dataset</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter a name for your new dataset. This will be used to organize
              your training episodes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dataset-name" className="text-gray-300">
                Dataset Name
              </Label>
              <Input
                id="dataset-name"
                placeholder="my_dataset"
                value={newDatasetName}
                onChange={(e) => setNewDatasetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreatingDataset) {
                    handleCreateDataset();
                  }
                }}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                disabled={isCreatingDataset}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewDatasetName("");
              }}
              disabled={isCreatingDataset}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDataset}
              disabled={isCreatingDataset || !newDatasetName.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isCreatingDataset ? "Creating..." : "Create Dataset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Episode Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Episode?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete episode{" "}
              {episodeToDelete?.episodeId}? This action cannot be undone and
              will permanently remove all episode data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEpisode}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
      >
        <AlertDialogContent className="bg-gray-900 border-gray-700 z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Multiple Episodes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete {selectedEpisodes.size}{" "}
              episode(s)? This action cannot be undone and will permanently
              remove all selected episode data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting
                ? "Deleting..."
                : `Delete ${selectedEpisodes.size} Episode(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dataset Confirmation Dialog */}
      <AlertDialog
        open={deleteDatasetConfirmOpen}
        onOpenChange={setDeleteDatasetConfirmOpen}
      >
        <AlertDialogContent className="bg-gray-900 border-gray-700 z-[9999] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Dataset "{datasetToDelete}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {datasetEpisodesToShow.length > 0 ? (
                <>
                  <p className="mb-3">
                    This dataset contains {datasetEpisodesToShow.length}{" "}
                    episode(s):
                  </p>
                  <ul className="space-y-1 mb-3 max-h-32 overflow-y-auto bg-gray-800/50 p-2 rounded text-sm">
                    {datasetEpisodesToShow.slice(0, 5).map((episode) => (
                      <li key={episode.episode_id} className="text-gray-300">
                        • Episode {episode.episode_id} (
                        {episode.metadata.frame_count} frames)
                      </li>
                    ))}
                    {datasetEpisodesToShow.length > 5 && (
                      <li className="text-gray-400 italic">
                        ... and {datasetEpisodesToShow.length - 5} more
                        episode(s)
                      </li>
                    )}
                  </ul>
                  <p className="text-red-400 font-medium">
                    Are you sure? This action cannot be undone and will
                    permanently delete the dataset and all its episodes.
                  </p>
                </>
              ) : (
                <p className="text-red-400 font-medium">
                  Are you sure you want to delete this dataset? This action
                  cannot be undone.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteDataset}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Dataset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
