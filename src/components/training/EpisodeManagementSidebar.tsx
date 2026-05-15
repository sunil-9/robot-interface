import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback } from "react";

import { cn } from "@/lib/utils";
import { type DatasetListItem } from "@/lib/api";
import * as episodeApi from "@/services/episodeApi";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { DatasetSelector } from "./DatasetSelector";
import { EpisodeList } from "./EpisodeList";
import { useEpisodeViewer } from "./EpisodeViewerContext";

interface EpisodeManagementSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  datasets: string[];
  datasetItems: DatasetListItem[];
  isLoadingDatasets: boolean;
  episodes: episodeApi.Episode[];
  isDeleting: boolean;
  deletingEpisodeId?: string | null;
  formatDuration: (seconds?: number) => string;
  onRequestCreateDataset: () => void;
  onRequestDeleteDataset: (dataset: string) => void;
  onDatasetDescriptionSave: (
    datasetId: string | number,
    description: string,
  ) => Promise<void>;
  onPromptDeleteEpisode: (datasetId: string | number, episodeId: string) => void;
  selectedDatasetRouteId?: string | null;
  robotId?: string | null;
  isRecording?: boolean;
  recordingElapsedTime?: number;
  isSavingEpisode?: boolean;
  isDatasetLocked?: boolean;
}

interface EpisodeManagementContentProps extends Omit<
  EpisodeManagementSidebarProps,
  "isOpen" | "onOpenChange"
> {
  className?: string;
}

export const EpisodeManagementContent = ({
  datasets,
  datasetItems,
  isLoadingDatasets,
  episodes,
  isDeleting,
  deletingEpisodeId = null,
  formatDuration,
  onRequestCreateDataset,
  onRequestDeleteDataset,
  onDatasetDescriptionSave,
  onPromptDeleteEpisode,
  selectedDatasetRouteId,
  robotId,
  isRecording = false,
  recordingElapsedTime = 0,
  isSavingEpisode = false,
  isDatasetLocked = false,
}: EpisodeManagementContentProps) => {
  const { openViewer, viewerState } = useEpisodeViewer();

  const handleReviewEpisode = useCallback(
    (episodeIndex: number) => {
      if (selectedDatasetRouteId) {
        openViewer("local", selectedDatasetRouteId, episodeIndex);
      }
    },
    [selectedDatasetRouteId, openViewer],
  );

  return (
    <div className={cn("flex h-full flex-col overflow-hidden")}>
      {/* Dataset Selector - fixed at top */}
      <div className="flex-shrink-0">
        <DatasetSelector
          datasets={datasets}
          datasetItems={datasetItems}
          isLoading={isLoadingDatasets}
          onRequestCreate={onRequestCreateDataset}
          onRequestDelete={onRequestDeleteDataset}
          onDescriptionSave={onDatasetDescriptionSave}
        />
      </div>

      {/* Episode List - fills remaining space and scrolls */}
      <div className="flex-1 overflow-y-auto p-2 dark:bg-muted/30">
        <EpisodeList
          episodes={episodes}
          isDeleting={isDeleting}
          deletingEpisodeId={deletingEpisodeId}
          formatDuration={formatDuration}
          onPromptDeleteEpisode={onPromptDeleteEpisode}
          onReviewEpisode={handleReviewEpisode}
          robotId={robotId}
          viewingEpisodeIndex={
            viewerState.isOpen && viewerState.datasetId === selectedDatasetRouteId
              ? viewerState.episodeIndex
              : null
          }
          isRecording={isRecording}
          recordingElapsedTime={recordingElapsedTime}
          isSavingEpisode={isSavingEpisode}
          isDatasetLocked={isDatasetLocked}
        />
      </div>

     
    </div>
  );
};

export const EpisodeManagementSidebar = ({
  isOpen,
  onOpenChange,
  datasets,
  datasetItems,
  isLoadingDatasets,
  episodes,
  isDeleting,
  deletingEpisodeId = null,
  formatDuration,
  onRequestCreateDataset,
  onRequestDeleteDataset,
  onDatasetDescriptionSave,
  onPromptDeleteEpisode,
  selectedDatasetRouteId,
  robotId,
  isDatasetLocked = false,
}: EpisodeManagementSidebarProps) => {
  return (
    <div className="fixed inset-y-0 right-0 z-30 flex items-center">
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="flex h-16 w-6 items-center justify-center rounded-full border border-primary/30 bg-card text-primary shadow-md transition-all duration-300 hover:scale-110 hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg"
          >
            {isOpen ? (
              <ArrowRight className="h-16 w-16 stroke-[2.5]" />
            ) : (
              <ArrowLeft className="h-16 w-16 stroke-[2.5]" />
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="flex h-full w-[400px] flex-col overflow-hidden border-l border-border bg-background p-0 text-foreground shadow-2xl sm:w-[540px]">
          <EpisodeManagementContent
            className="h-full overflow-hidden"
            datasets={datasets}
            datasetItems={datasetItems}
            isLoadingDatasets={isLoadingDatasets}
            episodes={episodes}
            isDeleting={isDeleting}
            deletingEpisodeId={deletingEpisodeId}
            formatDuration={formatDuration}
            onRequestCreateDataset={onRequestCreateDataset}
            onRequestDeleteDataset={onRequestDeleteDataset}
            onDatasetDescriptionSave={onDatasetDescriptionSave}
            onPromptDeleteEpisode={onPromptDeleteEpisode}
            selectedDatasetRouteId={selectedDatasetRouteId}
            robotId={robotId}
            isDatasetLocked={isDatasetLocked}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};
