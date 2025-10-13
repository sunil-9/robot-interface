import {
  Calendar,
  Clock,
  Eye,
  List,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
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

interface EpisodeResponse {
  success: boolean;
  message: string;
  episode?: Episode;
  timestamp: string;
}

export const EpisodeControls: React.FC = () => {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);

  const API_BASE = "http://localhost:8080/api/episodes";

  const handleApiCall = async (
    endpoint: string,
    method: string = "POST",
    body?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data: EpisodeResponse = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        });

        if (data.episode) {
          setCurrentEpisode(data.episode);
        }

        // Refresh episodes list if manage dialog is open
        if (showManageDialog) {
          fetchEpisodes();
        }
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: `Failed to ${endpoint.replace("/", "")}: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEpisodes = async () => {
    try {
      const response = await fetch(API_BASE);
      const data: Episode[] = await response.json();
      setEpisodes(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch episodes",
        variant: "destructive",
      });
    }
  };

  const fetchCurrentEpisode = async () => {
    try {
      const response = await fetch(`${API_BASE}/current`);
      const data: EpisodeResponse = await response.json();
      if (data.episode) {
        setCurrentEpisode(data.episode);
      }
    } catch (error) {
      console.error("Failed to fetch current episode:", error);
    }
  };

  const startEpisode = () => {
    handleApiCall("/start", "POST", {
      name: `Episode ${new Date().toLocaleTimeString()}`,
    });
  };

  const endEpisode = () => {
    handleApiCall("/end");
  };

  const rewindEpisode = () => {
    handleApiCall("/rewind");
  };

  const replayEpisode = (episodeId?: string) => {
    const id = episodeId || currentEpisode?.id;
    if (id) {
      handleApiCall("/replay", "POST", {
        episode_id: id,
        speed: 1.0,
      });
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

  const openManageDialog = () => {
    setShowManageDialog(true);
    fetchEpisodes();
    fetchCurrentEpisode();
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full">
      <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5" />
            Episode Controls
            {currentEpisode && (
              <Badge className={getStatusColor(currentEpisode.status)}>
                {currentEpisode.status}
              </Badge>
            )}
          </CardTitle>
          {currentEpisode && (
            <p className="text-sm text-muted-foreground">
              Current: {currentEpisode.name} | Data Points:{" "}
              {currentEpisode.data_count}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={startEpisode}
              disabled={isLoading || currentEpisode?.status === "recording"}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Episode
            </Button>

            <Button
              onClick={endEpisode}
              disabled={isLoading || currentEpisode?.status !== "recording"}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Square className="h-4 w-4 mr-2" />
              End Episode
            </Button>

            <Button
              onClick={rewindEpisode}
              disabled={isLoading || !currentEpisode}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rewind
            </Button>

            <Button
              onClick={() => replayEpisode()}
              disabled={isLoading || currentEpisode?.status !== "completed"}
              variant="outline"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Replay
            </Button>

            <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={openManageDialog}
                  variant="outline"
                  className="ml-auto"
                >
                  <List className="h-4 w-4 mr-2" />
                  Manage Episodes
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Episode 123 Management</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {episodes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No episodes found
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {episodes.map((episode) => (
                        <Card key={episode.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{episode.name}</h3>
                                <Badge
                                  className={getStatusColor(episode.status)}
                                >
                                  {episode.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
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
                                <div>ID: {episode.id.substring(0, 8)}...</div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => replayEpisode(episode.id)}
                                disabled={episode.status !== "completed"}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => replayEpisode(episode.id)}
                                disabled={episode.status !== "completed"}
                              >
                                <RotateCw className="h-3 w-3 mr-1" />
                                Replay
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteEpisode(episode.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
