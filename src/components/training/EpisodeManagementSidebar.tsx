import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import * as episodeApi from "@/services/episodeApi";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { DatasetSelector } from "./DatasetSelector";
import { EpisodeList } from "./EpisodeList";

interface EpisodeManagementSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  datasets: string[];
  selectedDataset: string;
  isLoadingDatasets: boolean;
  episodes: episodeApi.Episode[];
  isDeleting: boolean;
  formatDuration: (seconds?: number) => string;
  onSelectDataset: (dataset: string) => void;
  onRequestCreateDataset: () => void;
  onRequestDeleteDataset: (dataset: string) => void;
  onPromptDeleteEpisode: (datasetId: string, episodeId: string) => void;
}

export const EpisodeManagementSidebar = ({
  isOpen,
  onOpenChange,
  datasets,
  selectedDataset,
  isLoadingDatasets,
  episodes,
  isDeleting,
  formatDuration,
  onSelectDataset,
  onRequestCreateDataset,
  onRequestDeleteDataset,
  onPromptDeleteEpisode,
}: EpisodeManagementSidebarProps) => (
  <div className="fixed inset-y-0 right-0 z-30 flex items-center">
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "flex h-16 w-6 items-center justify-center rounded-full border border-purple-600/70 bg-gray-950/80 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-300",
            "hover:scale-110 hover:bg-purple-900/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]"
          )}
        >
          {isOpen ? (
            <ArrowRight className="h-16 w-16 stroke-[2.5]" />
          ) : (
            <ArrowLeft className="h-16 w-16 stroke-[2.5]" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="h-full w-[400px] bg-gray-900 p-0 sm:w-[540px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-800 p-4">
            <h2 className="text-xl font-bold text-white">Episode Management</h2>
          </div>

          <DatasetSelector
            datasets={datasets}
            selectedDataset={selectedDataset}
            isLoading={isLoadingDatasets}
            onSelect={onSelectDataset}
            onRequestCreate={onRequestCreateDataset}
            onRequestDelete={onRequestDeleteDataset}
          />

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <EpisodeList
              selectedDataset={selectedDataset}
              episodes={episodes}
              isDeleting={isDeleting}
              formatDuration={formatDuration}
              onPromptDeleteEpisode={onPromptDeleteEpisode}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
);
