import { useBridgeData } from "@/hooks/useBridgeData";
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
import { useEffect, useState } from "react";
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

export const TrainingInterface = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const bridgeData = useBridgeData();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const API_BASE = "http://localhost:8080/api/episodes";

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
    <div className="h-screen w-screen overflow-hidden bg-black">
      {/* <Header onToggleSidebar={toggleSidebar} /> */}

      {/* Fixed height container that fills the width */}
      <main className="h-full">
        {/* Fixed height divisions with vh units */}
        <div className="flex flex-col">
          {/* Main Camera with Chart Overlay - Fixed 75vh height */}
          <div className="relative h-[75vh]">
            {/* Main Camera View - Takes full width */}
            <div className="h-full w-full">
              <CameraView
                cameraType="head"
                title="Head Camera"
                fullHeight
                fullWidth
                showTitle={true}
              />
            </div>

            {/* Action Variance Chart Overlay - Top Left */}
            <div className="absolute top-10 left-2 w-[260px] z-10 opacity-90 hover:opacity-100 transition-opacity">
              <MockActionVarianceChart
                title="2 sec future"
                overlay
                compact
                showTitle={false}
              />
            </div>

            {/* Episode Management Sidebar Toggle */}
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 z-20 bg-gray-900 bg-opacity-70 hover:bg-opacity-90 border-gray-700 rounded-full h-10 w-10 flex items-center justify-center shadow-lg"
                >
                  <PanelRight className="h-5 w-5 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] bg-gray-900 border-gray-700 p-0 h-full">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                      Episode Management
                    </h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {episodes.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-gray-400">No episodes found</p>
                      </div>
                    ) : (
                      episodes.map((episode) => (
                        <Card
                          key={episode.id}
                          className="bg-gray-800 border-gray-700 p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-white">
                                {episode.name}
                              </h3>
                              <Badge className={getStatusColor(episode.status)}>
                                {episode.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(
                                episode.created_at
                              ).toLocaleDateString()}
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
                              <Eye className="h-3 w-3 mr-1" />
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
                              <RotateCw className="h-3 w-3 mr-1" />
                              Replay
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteEpisode(episode.id)}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
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
          {/* Bottom Row with Wrist Cameras and Controls - Fixed 25vh height with 3:1:3 ratio */}
          <div className="grid grid-cols-7 gap-1 h-[25vh]">
            {/* Left Wrist Camera - 3/7 of width */}
            <div className="col-span-3 h-full">
              <CameraView cameraType="left" title="Left Hand" fullHeight />
            </div>

            {/* Center Controls - 1/7 of width */}
            <div className="col-span-1 flex flex-col justify-center items-center gap-1">
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
                  <Square className="h-4 w-4 mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                {isRecording ? "End" : "Start"}
              </Button>

              <Button
                onClick={rewindEpisode}
                disabled={isLoading || !currentEpisodeId}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Rewind
              </Button>
            </div>

            {/* Right Wrist Camera - 3/7 of width */}
            <div className="col-span-3 h-full">
              <CameraView cameraType="right" title="Right Hand" fullHeight />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
