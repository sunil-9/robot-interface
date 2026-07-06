import { useEpisodesWebSocket } from "@/hooks/useEpisodesWebSocket";
import { useAuthSession } from "@/hooks/useAuthSession";
import { invalidateDatasetDescriptorCache } from "@/components/visualization/utils/versionUtils";
import {
  createDataset,
  cloneDataset,
  deleteDataset,
  fetchDatasets,
  updateDatasetDescription,
  type DatasetListItem,
} from "@/lib/api";
import * as episodeApi from "@/services/episodeApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "../components/ui/use-toast";

interface UseTrainingDatasetEpisodesOptions {
  robotId: string | null;
  selectedDataset: string;
  isSavingEpisode: boolean;
  setSelectedDataset: (datasetName: string) => void;
  setSelectedDatasetId: (datasetId: string | null) => void;
  setIsSavingEpisode: (saving: boolean) => void;
}

export function useTrainingDatasetEpisodes({
  robotId,
  selectedDataset,
  isSavingEpisode,
  setSelectedDataset,
  setSelectedDatasetId,
  setIsSavingEpisode,
}: UseTrainingDatasetEpisodesOptions) {
  const { isAuthenticated } = useAuthSession();
  const [episodes, setEpisodes] = useState<episodeApi.Episode[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<{
    datasetId: string | number;
    episodeId: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(
    null,
  );
  const [datasetStatus, setDatasetStatus] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<string[]>([]);
  const [datasetItems, setDatasetItems] = useState<DatasetListItem[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [newDatasetDescription, setNewDatasetDescription] = useState("");
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [cloneDatasetDialogOpen, setCloneDatasetDialogOpen] = useState(false);
  const [datasetToClone, setDatasetToClone] = useState<string | null>(null);
  const [newCloneDatasetName, setNewCloneDatasetName] = useState("");
  const [isCloningDataset, setIsCloningDataset] = useState(false);
  const [deleteDatasetConfirmOpen, setDeleteDatasetConfirmOpen] =
    useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const [datasetToDeleteId, setDatasetToDeleteId] = useState<number | null>(
    null,
  );
  const [datasetEpisodesToShow, setDatasetEpisodesToShow] = useState<
    episodeApi.Episode[]
  >([]);

  const selectedDatasetRef = useRef<string>(selectedDataset);
  const selectedDatasetRouteIdRef = useRef<string | null>(null);
  const episodesTotalRef = useRef<number | null>(null);

  const datasetIdByName = useMemo(
    () => new Map(datasetItems.map((item) => [item.name, item.id])),
    [datasetItems],
  );
  const datasetNameById = useMemo(
    () => new Map(datasetItems.map((item) => [String(item.id), item.name])),
    [datasetItems],
  );
  const selectedDatasetDbId = useMemo(() => {
    if (!selectedDataset) {
      return null;
    }
    return datasetIdByName.get(selectedDataset) ?? null;
  }, [datasetIdByName, selectedDataset]);
  const selectedDatasetRouteId = useMemo(
    () => (selectedDatasetDbId !== null ? String(selectedDatasetDbId) : null),
    [selectedDatasetDbId],
  );
  const episodesWsEnabled = Boolean(selectedDatasetRouteId);

  useEffect(() => {
    selectedDatasetRef.current = selectedDataset;
    episodesTotalRef.current = null;
  }, [selectedDataset]);

  useEffect(() => {
    selectedDatasetRouteIdRef.current = selectedDatasetRouteId;
  }, [selectedDatasetRouteId]);

  useEffect(() => {
    setSelectedDatasetId(selectedDatasetRouteId);
  }, [selectedDatasetRouteId, setSelectedDatasetId]);

  const loadDatasets = useCallback(async () => {
    if (!isAuthenticated || !robotId?.trim()) {
      setDatasets([]);
      setDatasetItems([]);
      setEpisodes([]);
      setDatasetStatus(null);
      setSelectedDataset("");
      setIsLoadingDatasets(false);
      return;
    }

    setIsLoadingDatasets(true);
    try {
      const datasetList = await fetchDatasets(robotId);
      setDatasets(datasetList.datasets);
      setDatasetItems(datasetList.datasetItems);

      const activeDataset = selectedDatasetRef.current ?? "";
      if (datasetList.datasets.length === 0) {
        setEpisodes([]);
        if (activeDataset) {
          setSelectedDataset("");
        }
        return;
      }

      if (!activeDataset || !datasetList.datasets.includes(activeDataset)) {
        setSelectedDataset(datasetList.datasets[0]);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load datasets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDatasets(false);
    }
  }, [isAuthenticated, robotId, setSelectedDataset]);

  const fetchEpisodes = useCallback(
    async (datasetIdOverride?: string | number) => {
      const datasetId =
        datasetIdOverride ??
        selectedDatasetRouteIdRef.current ??
        selectedDatasetRouteId;
      if (!datasetId) {
        return;
      }

      try {
        const response = await episodeApi.listEpisodes(datasetId);
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
    },
    [selectedDatasetRouteId],
  );

  const handleEpisodesSnapshot = useCallback(
    (message: {
      dataset_id: string;
      dataset_status?: string;
      episodes: episodeApi.Episode[];
      total_count: number;
    }) => {
      const activeDatasetId =
        selectedDatasetRouteIdRef.current ?? selectedDatasetRouteId ?? "";
      if (!activeDatasetId || String(message.dataset_id) !== activeDatasetId) {
        return;
      }

      if (message.dataset_status !== undefined) {
        setDatasetStatus(message.dataset_status);
      }

      const normalizedEpisodes = message.episodes.map((episode) => ({
        ...episode,
        dataset_id: message.dataset_id,
        episode_index: `${episode.episode_index}`,
      }));
      setEpisodes(normalizedEpisodes);

      const previousTotal = episodesTotalRef.current;
      if (
        typeof previousTotal === "number" &&
        previousTotal !== message.total_count
      ) {
        invalidateDatasetDescriptorCache(message.dataset_id);
      }
      episodesTotalRef.current = message.total_count;
      if (
        typeof previousTotal === "number" &&
        message.total_count > previousTotal &&
        isSavingEpisode
      ) {
        setIsSavingEpisode(false);
      }
    },
    [isSavingEpisode, selectedDatasetRouteId, setIsSavingEpisode],
  );

  const handleDatasetDeleted = useCallback(
    (message: { dataset_id: string }) => {
      const activeDatasetId =
        selectedDatasetRouteIdRef.current ?? selectedDatasetRouteId ?? "";
      if (String(message.dataset_id) !== activeDatasetId) {
        return;
      }

      const deletedDataset = selectedDatasetRef.current;
      setEpisodes([]);
      setSelectedDataset("");
      setSelectedDatasetId(null);
      void loadDatasets();
      toast({
        title: "Dataset removed",
        description: deletedDataset
          ? `Dataset "${deletedDataset}" was deleted.`
          : `Dataset "${message.dataset_id}" was deleted.`,
      });
    },
    [
      loadDatasets,
      selectedDatasetRouteId,
      setSelectedDataset,
      setSelectedDatasetId,
    ],
  );

  const handleEpisodeSaveError = useCallback(
    (message: { dataset_id: string; message?: string }) => {
      const activeDatasetId =
        selectedDatasetRouteIdRef.current ?? selectedDatasetRouteId ?? "";
      if (!activeDatasetId || String(message.dataset_id) !== activeDatasetId) {
        return;
      }
      setIsSavingEpisode(false);
      toast({
        title: "Episode save failed",
        description:
          message.message ??
          `Episode save failed for dataset: ${message.dataset_id}.`,
        variant: "destructive",
      });
    },
    [selectedDatasetRouteId, setIsSavingEpisode],
  );

  const { isConnected: episodesWsConnected } = useEpisodesWebSocket({
    datasetId: selectedDatasetRouteId,
    enabled: episodesWsEnabled,
    onSnapshot: handleEpisodesSnapshot,
    onDatasetDeleted: handleDatasetDeleted,
    onEpisodeSaveError: handleEpisodeSaveError,
  });

  useEffect(() => {
    const loadData = async () => {
      setDatasetStatus(null);
      if (selectedDatasetRouteId && !episodesWsEnabled) {
        void fetchEpisodes();
      }
      await loadDatasets();
    };
    void loadData();
  }, [fetchEpisodes, loadDatasets, selectedDatasetRouteId, episodesWsEnabled]);

  const handleCreateDataset = async () => {
    const trimmedName = newDatasetName.trim();
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Dataset name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!robotId) {
      toast({
        title: "Error",
        description: "Select a robot before creating a dataset.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDataset(true);
    try {
      await createDataset(trimmedName, robotId, newDatasetDescription.trim());
      toast({
        title: "Success",
        description: `Dataset "${trimmedName}" created successfully`,
      });
      setNewDatasetName("");
      setNewDatasetDescription("");
      setIsCreateDialogOpen(false);
      await loadDatasets();
      setSelectedDataset(trimmedName);
    } catch (error) {
      console.log(error instanceof Error ? error.message : error);
      toast({
        title: "Error",
        description: `Failed to create dataset: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingDataset(false);
    }
  };

  const handleDatasetDescriptionSave = async (
    datasetId: string | number,
    description: string,
  ) => {
    try {
      await updateDatasetDescription(datasetId, description);
      setDatasetItems((items) =>
        items.map((item) =>
          String(item.id) === String(datasetId)
            ? { ...item, description }
            : item,
        ),
      );
      toast({
        title: "Description updated",
        description: "Dataset description saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update dataset description: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const promptDeleteEpisode = (
    datasetId: string | number,
    episodeId: string,
  ) => {
    setEpisodeToDelete({ datasetId, episodeId });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteEpisode = async () => {
    if (!episodeToDelete) return;

    const { datasetId, episodeId } = episodeToDelete;
    setIsDeleting(true);
    setDeletingEpisodeId(episodeId);
    setDeleteConfirmOpen(false);
    setEpisodeToDelete(null);

    try {
      await episodeApi.deleteEpisode(datasetId, episodeId);

      toast({
        title: "Success",
        description: "Episode deleted successfully",
      });
      if (!episodesWsEnabled && !episodesWsConnected) {
        void fetchEpisodes(datasetId);
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete episode",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingEpisodeId(null);
    }
  };

  const promptDeleteDataset = async (datasetName: string) => {
    const datasetId = datasetIdByName.get(datasetName);
    if (datasetId === undefined) {
      toast({
        title: "Error",
        description: `Could not resolve dataset id for "${datasetName}"`,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await episodeApi.listEpisodes(datasetId);
      setDatasetEpisodesToShow(response.episodes);
      setDatasetToDelete(datasetName);
      setDatasetToDeleteId(datasetId);
      setDeleteDatasetConfirmOpen(true);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load episodes for dataset",
        variant: "destructive",
      });
    }
  };

  const promptCloneDataset = (datasetName: string) => {
    setDatasetToClone(datasetName);
    setNewCloneDatasetName(`${datasetName}-clone`);
    setCloneDatasetDialogOpen(true);
  };

  const confirmCloneDataset = async () => {
    if (!datasetToClone) return;

    const datasetId = datasetIdByName.get(datasetToClone);
    const trimmedName = newCloneDatasetName.trim();
    if (datasetId === undefined || !trimmedName) {
      return;
    }

    setIsCloningDataset(true);
    try {
      await cloneDataset(datasetId, trimmedName);
      toast({
        title: "Success",
        description: `Dataset "${trimmedName}" cloned successfully`,
      });
      setCloneDatasetDialogOpen(false);
      setDatasetToClone(null);
      setNewCloneDatasetName("");
      await loadDatasets();
      setSelectedDataset(trimmedName);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to clone dataset",
        variant: "destructive",
      });
    } finally {
      setIsCloningDataset(false);
    }
  };

  const confirmDeleteDataset = async () => {
    if (!datasetToDelete || datasetToDeleteId === null) return;

    setIsDeleting(true);
    try {
      await deleteDataset(datasetToDeleteId);

      toast({
        title: "Success",
        description: `Dataset "${datasetToDelete}" deleted successfully`,
      });

      await loadDatasets();

      if (selectedDataset === datasetToDelete) {
        setSelectedDataset("");
        setEpisodes([]);
      }

      setDeleteDatasetConfirmOpen(false);
      setDatasetToDelete(null);
      setDatasetToDeleteId(null);
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

  return {
    episodes,
    datasets,
    datasetItems,
    datasetNameById,
    selectedDatasetDbId,
    selectedDatasetRouteId,
    episodesWsEnabled,
    episodesWsConnected,
    isLoadingDatasets,
    datasetStatus,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    episodeToDelete,
    isDeleting,
    deletingEpisodeId,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    newDatasetName,
    setNewDatasetName,
    newDatasetDescription,
    setNewDatasetDescription,
    isCreatingDataset,
    cloneDatasetDialogOpen,
    setCloneDatasetDialogOpen,
    datasetToClone,
    setDatasetToClone,
    newCloneDatasetName,
    setNewCloneDatasetName,
    isCloningDataset,
    deleteDatasetConfirmOpen,
    setDeleteDatasetConfirmOpen,
    datasetToDelete,
    datasetEpisodesToShow,
    setDatasetEpisodesToShow,
    fetchEpisodes,
    loadDatasets,
    handleCreateDataset,
    promptCloneDataset,
    confirmCloneDataset,
    handleDatasetDescriptionSave,
    promptDeleteEpisode,
    confirmDeleteEpisode,
    promptDeleteDataset,
    confirmDeleteDataset,
    setDatasetStatus,
  };
}
