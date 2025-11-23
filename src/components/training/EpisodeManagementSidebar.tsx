import { Activity, ArrowLeft, ArrowRight, Brain, Layers, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import * as episodeApi from "@/services/episodeApi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

import { DatasetSelector } from "./DatasetSelector";
import { EpisodeList } from "./EpisodeList";
import { useState } from "react";

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
}: EpisodeManagementSidebarProps) => {
  const [interval, setInterval] = useState([25])
  return (
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

          <div className="flex h-[25%] min-h-[280px] flex-col justify-between border-t border-gray-800 bg-gray-950 p-5 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-white">Model Training</h3>
              </div>
              <Badge variant="outline" className="border-gray-700 bg-gray-900 text-gray-400">
                Not Started
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-2.5">
                <span className="text-xs font-medium text-gray-500">Episodes Trained</span>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" />
                  <span className="text-lg font-bold text-white">0</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-gray-800 bg-gray-900/50 p-2.5">
                <span className="text-xs font-medium text-gray-500">Total Steps</span>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-lg font-bold text-white">0</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-400">Checkpoint Interval</Label>
                <span className="text-xs font-mono text-purple-400">{interval} steps</span>
              </div>
              <Slider
                defaultValue={interval}
                onValueChange={(value) => setInterval(value)}
                aria-label="Checkpoint Interval"
                max={200}
                min={10}
                step={10}
                className="py-1"
              />
            </div>

            <Button className="w-full bg-purple-600 font-semibold text-white hover:bg-purple-700">
              <Zap className="mr-2 h-4 w-4 fill-current" />
              Train More
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
)};
