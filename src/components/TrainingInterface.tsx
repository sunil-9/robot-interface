import { useEffect, useState } from "react";
import { CameraView } from "./CameraView";
import { Header } from "./Header";
import { MockActionVarianceChart } from "./MockActionVarianceChart";
import { Button } from "./ui/button";
import { 
  RotateCcw, 
  Play, 
  Square, 
  Sidebar as SidebarIcon, 
  X, 
  Eye, 
  RotateCw, 
  Trash2, 
  Calendar, 
  Clock 
} from "lucide-react";
import { useBridgeData } from "@/hooks/useBridgeData";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { toast } from "./ui/use-toast";

interface Episode {
  id: string;
  name: string;
  status: "idle" | "recording" | "paused" | "completed" | "replaying" | "rewinding";
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
        body: JSON.stringify({ name: `Episode ${new Date().toLocaleTimeString()}` }),
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
    <div className="min-h-screen bg-background text-foreground">
      <Header onToggleSidebar={toggleSidebar} />

      <div className="flex">
        <main className="flex-1 p-4">
          <div className="h-[calc(100vh-5rem)] flex flex-col gap-4">
            {/* Main Camera with Chart Overlay */}
            <div className="relative flex-grow">
              {/* Main Camera View - Takes most of the screen */}
              <div className="h-full w-full">
                <CameraView 
                  cameraType="base" 
                  title="Main Camera" 
                  fullHeight 
                  showTitle={false} 
                />
              </div>

              {/* Action Variance Chart Overlay - Top Left */}
              <div className="absolute top-4 left-4 w-[280px] z-10">
                <MockActionVarianceChart 
                  title="2 sec future" 
                  overlay 
                  compact 
                  showTitle={true} 
                />
              </div>
            </div>

            {/* Bottom Row with Wrist Cameras and Controls */}
            <div className="grid grid-cols-7 gap-4 h-[240px]">
              {/* Left Wrist Camera */}
              <div className="col-span-3">
                <CameraView 
                  cameraType="wrist" 
                  title="Left Wrist" 
                  fullHeight 
                />
              </div>

              {/* Center Controls */}
              <div className="col-span-1 flex flex-col justify-center items-center gap-4">
                <Button
                  onClick={isRecording ? endEpisode : startEpisode}
                  disabled={isLoading}
                  className={`w-full ${isRecording ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"} text-white`}
                >
                  {isRecording ? (
                    <Square className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isRecording ? "End" : "Start"}
                </Button>

                <Button
                  onClick={rewindEpisode}
                  disabled={isLoading || !currentEpisodeId}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Rewind
                </Button>
              </div>

              {/* Right Wrist Camera */}
              <div className="col-span-3">
                <CameraView 
                  cameraType="wrist" 
                  title="Right Wrist" 
                  fullHeight 
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
