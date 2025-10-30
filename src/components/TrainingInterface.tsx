import { useBridgeData } from "@/hooks/useBridgeData";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import { fetchRobotCameras, type RobotCameraConfig } from "@/lib/api";
import {
  Calendar,
  Clock,
  Eye,
  PanelRight,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CameraView } from "./CameraView";
import { MockActionVarianceChart } from "./MockActionVarianceChart";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { toast } from "./ui/use-toast";

interface Episode {
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
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cameraConfigs, setCameraConfigs] = useState<RobotCameraConfig[]>([]);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const bridgeData = useBridgeData();

  const API_BASE = "http://localhost:8080/api/episodes";

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

  // Fetch episodes when sidebar opens
  useEffect(() => {
    if (isSidebarOpen) {
      fetchEpisodes();
    }
  }, [isSidebarOpen]);

  // Fetch episodes
  const fetchEpisodes = async () => {
    try {
      const response = await fetch(API_BASE);
      const data: Episode[] = await response.json();
      setEpisodes(data);
    } catch (error) {
      console.error("Failed to fetch episodes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch episodes",
        variant: "destructive",
      });
    }
  };

  // Simplified API calls for episode control
  const startEpisode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Episode ${new Date().toLocaleTimeString()}`,
        }),
      });
      const data = await response.json();
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
      await fetch(`${API_BASE}/end`, { method: "POST" });
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
      await fetch(`${API_BASE}/rewind`, { method: "POST" });
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
  const replayEpisode = async (episodeId: string) => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: episodeId,
          speed: 1.0,
        }),
      });
      // Update episodes list
      fetchEpisodes();
    } catch (error) {
      console.error("Failed to replay episode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEpisode = async (episodeId: string) => {
    try {
      const response = await fetch(`${API_BASE}/${episodeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Episode deleted successfully",
        });
        fetchEpisodes();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete episode",
        variant: "destructive",
      });
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

          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-1/2 right-0 z-20 h-10 w-10 -translate-y-1/2 translate-x-1/2 rounded-full border-purple-900/60 bg-gray-900/80 text-white shadow-lg transition hover:bg-gray-900"
              >
                <PanelRight className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="h-full w-[400px] bg-gray-900 p-0 sm:w-[540px]">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-gray-800 p-4">
                  <h2 className="text-xl font-bold text-white">
                    Episode Management
                  </h2>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                  {episodes.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-gray-400">No episodes found</p>
                    </div>
                  ) : (
                    episodes.map((episode) => (
                      <Card
                        key={episode.id}
                        className="bg-gray-800 border-gray-700 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">
                              {episode.name}
                            </h3>
                            <Badge className={getStatusColor(episode.status)}>
                              {episode.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(episode.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(episode.duration)}
                          </div>
                          <div>Data Points: {episode.data_count}</div>
                          <div className="text-gray-500">
                            ID: {episode.id.substring(0, 8)}...
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => replayEpisode(episode.id)}
                            disabled={
                              episode.status !== "completed" || isLoading
                            }
                            className="flex-1"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => replayEpisode(episode.id)}
                            disabled={
                              episode.status !== "completed" || isLoading
                            }
                            className="flex-1"
                          >
                            <RotateCw className="mr-1 h-3 w-3" />
                            Replay
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteEpisode(episode.id)}
                            disabled={isLoading}
                            className="flex-1"
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
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
    </div>
  );
};
