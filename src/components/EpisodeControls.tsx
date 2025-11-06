import {
  Calendar,
  Clock,
  List,
  Play,
  RotateCcw,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { API_CONFIG } from "@/config/api";
import * as episodeApi from "../services/episodeApi";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
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

interface EpisodeControlsProps {
  selectedDataset?: string;
}

export const EpisodeControls: React.FC<EpisodeControlsProps> = ({
  selectedDataset,
}) => {
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [episodes, setEpisodes] = useState<episodeApi.Episode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
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

  const EPISODES_API_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EPISODES}`;

  const handleApiCall = async (
    endpoint: string,
    method: string = "POST",
    body?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${EPISODES_API_URL}${endpoint}`, {
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
    if (!selectedDataset) {
      toast({
        title: "No Dataset Selected",
        description: "Please select a dataset first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await episodeApi.listEpisodes(selectedDataset);
      setEpisodes(response.episodes);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch episodes",
        variant: "destructive",
      });
    }
  };

  const fetchCurrentEpisode = async () => {
    try {
      const response = await fetch(`${EPISODES_API_URL}/current`);
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

  const promptDeleteEpisode = (datasetId: string, episodeId: string) => {
    setEpisodeToDelete({ datasetId, episodeId });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEpisode = async () => {
    if (!episodeToDelete) return;

    const { datasetId, episodeId } = episodeToDelete;
    
    if (!datasetId) {
      toast({
        title: "Error",
        description: "Dataset ID is required",
        variant: "destructive",
      });
      return;
    }

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

  const handleReplayEpisode = async (datasetId: string, episodeId: string) => {
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

  const openManageDialog = () => {
    setShowManageDialog(true);
    fetchEpisodes();
    fetchCurrentEpisode();
  };

  const getReplayBadgeColor = (replayCount: number) => {
    // Use replay count to show episode usage
    if (replayCount === 0) return "bg-gray-500";
    if (replayCount < 5) return "bg-blue-500";
    return "bg-green-500";
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
            {selectedDataset && (
              <Badge className="bg-purple-500">
                Dataset: {selectedDataset}
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
                  <DialogTitle className="flex items-center justify-between">
                    <span>Episode Management</span>
                    {selectedDataset && (
                      <span className="text-sm font-normal text-muted-foreground">
                        Dataset: {selectedDataset}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>

                {!selectedDataset ? (
                  <div className="text-center text-muted-foreground py-8">
                    Please select a dataset first
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Bulk actions toolbar */}
                    {episodes.length > 0 && (
                      <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <Checkbox
                          checked={
                            selectedEpisodes.size === episodes.length &&
                            episodes.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm flex-1">
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
                    )}

                    {episodes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No episodes found in this dataset
                      </p>
                    ) : (
                      <div className="grid gap-4">
                        {episodes.map((episode) => (
                          <Card key={episode.episode_id} className="p-4">
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
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-medium">
                                    Episode {episode.episode_id}
                                  </h3>
                                  <Badge
                                    className={getReplayBadgeColor(
                                      episode.metadata.replay_count
                                    )}
                                  >
                                    {episode.metadata.replay_count} replays
                                  </Badge>
                                  {episode.metadata.quality_score && (
                                    <Badge variant="outline">
                                      Quality:{" "}
                                      {episode.metadata.quality_score.toFixed(
                                        1
                                      )}
                                    </Badge>
                                  )}
                                </div>
                                {episode.metadata.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {episode.metadata.description}
                                  </p>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
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
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleReplayEpisode(
                                      episode.dataset_id,
                                      episode.episode_id
                                    )
                                  }
                                  title="Replay episode"
                                >
                                  <RotateCw className="h-3 w-3 mr-1" />
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
                                  title="Delete episode"
                                  disabled={isDeleting}
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
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Delete Single Episode Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Episode?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete episode {episodeToDelete?.episodeId}?
              This action cannot be undone and will permanently remove all episode data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Episodes?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEpisodes.size} episode(s)?
              This action cannot be undone and will permanently remove all selected episode data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedEpisodes.size} Episode(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
