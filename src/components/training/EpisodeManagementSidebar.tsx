import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Brain,
  Layers,
  Loader2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import * as episodeApi from "@/services/episodeApi";
import * as trainingApi from "@/services/trainingApi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";

import { DatasetSelector } from "./DatasetSelector";
import { EpisodeList } from "./EpisodeList";

type AccentColor = "purple" | "emerald";

const accentStyles: Record<
  AccentColor,
  {
    trigger: string;
    trainingIcon: string;
    trainingStepsText: string;
    trainButton: string;
    loadingBadge: string;
  }
> = {
  purple: {
    trigger:
      "border-purple-300 text-purple-700 shadow-[0_10px_30px_rgba(168,85,247,0.18)] hover:border-purple-400 hover:bg-purple-50 hover:shadow-[0_12px_40px_rgba(168,85,247,0.25)] dark:border-purple-700 dark:text-purple-200 dark:hover:bg-purple-950/50 dark:shadow-[0_0_22px_rgba(168,85,247,0.35)]",
    trainingIcon: "text-purple-600 dark:text-purple-300",
    trainingStepsText: "text-purple-700 dark:text-purple-200",
    trainButton:
      "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:text-gray-950 dark:hover:bg-purple-400",
    loadingBadge:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-950/40 dark:text-purple-100",
  },
  emerald: {
    trigger:
      "border-emerald-300 text-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.18)] hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-[0_12px_40px_rgba(16,185,129,0.25)] dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-emerald-950/40 dark:shadow-[0_0_22px_rgba(16,185,129,0.35)]",
    trainingIcon: "text-emerald-600 dark:text-emerald-300",
    trainingStepsText: "text-emerald-700 dark:text-emerald-200",
    trainButton:
      "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-gray-950 dark:hover:bg-emerald-400",
    loadingBadge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-100",
  },
};

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
  accentColor?: AccentColor;
  robotId?: string | null;
}

interface EpisodeManagementContentProps
  extends Omit<EpisodeManagementSidebarProps, "isOpen" | "onOpenChange"> {
  isActive: boolean;
  className?: string;
}

export const EpisodeManagementContent = ({
  isActive,
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
  accentColor = "purple",
  className,
  robotId,
}: EpisodeManagementContentProps) => {
  const [interval, setInterval] = useState<number[]>([25]);
  const [trainingJob, setTrainingJob] =
    useState<trainingApi.TrainingJob | null>(null);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const accent = accentStyles[accentColor];

  useEffect(() => {
    if (!isActive || !selectedDataset) {
      setTrainingJob(null);
      setTrainingMessage(null);
      return;
    }

    let cancelled = false;
    const loadTrainingStatus = async () => {
      setIsTrainingLoading(true);
      setTrainingError(null);
      try {
        const result = await trainingApi.fetchTrainingJobStatus(
          selectedDataset
        );
        if (cancelled) {
          return;
        }
        setTrainingJob(result.job);
        setTrainingMessage(result.message ?? null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setTrainingJob(null);
        setTrainingMessage(null);
        setTrainingError(
          error instanceof Error
            ? error.message
            : "Failed to load training status"
        );
      } finally {
        if (!cancelled) {
          setIsTrainingLoading(false);
        }
      }
    };

    void loadTrainingStatus();

    return () => {
      cancelled = true;
    };
  }, [isActive, selectedDataset]);

  useEffect(() => {
    if (trainingJob && Number.isFinite(trainingJob.checkpoint_interval)) {
      setInterval([trainingJob.checkpoint_interval]);
    }
  }, [trainingJob?.checkpoint_interval]);

  const trainingStatusLabel = trainingJob
    ? "Running"
    : trainingError
    ? "Error"
    : isTrainingLoading
    ? "Checking"
    : "Not Running";

  const trainingStatusDescription =
    trainingError ??
    trainingMessage ??
    (!selectedDataset
      ? "Select a dataset to check training status"
      : trainingJob
      ? `Policy: ${trainingJob.policy_type || "N/A"} </br>• Mode: ${
          trainingJob.mode || "N/A"
        }`
      : "No active training job");

  const startedAtLabel =
    trainingJob?.started_at && trainingJob.started_at !== ""
      ? new Date(trainingJob.started_at).toLocaleString()
      : null;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-xl font-bold text-foreground">
          Episode Management
        </h2>
      </div> */}

      <DatasetSelector
        datasets={datasets}
        selectedDataset={selectedDataset}
        isLoading={isLoadingDatasets}
        onSelect={onSelectDataset}
        onRequestCreate={onRequestCreateDataset}
        onRequestDelete={onRequestDeleteDataset}
      />

      <div className="overflow-y-auto max-h-[40%] h-1/2 bg-muted/40 p-2 dark:bg-muted/30">
        <EpisodeList
          selectedDataset={selectedDataset}
          episodes={episodes}
          isDeleting={isDeleting}
          formatDuration={formatDuration}
          onPromptDeleteEpisode={onPromptDeleteEpisode}
          robotId={robotId}
        />
      </div>
      <div className="border-t border-border bg-card p-3 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className={cn("h-4 w-4", accent.trainingIcon)} />
            <h3 className="font-medium text-sm text-foreground">
              Model Training
            </h3>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-2 text-sm border-border bg-muted text-muted-foreground",
              trainingJob &&
                "border-green-200 bg-green-50 text-green-700 dark:border-green-500/40 dark:bg-green-900/30 dark:text-green-100",
              trainingError &&
                "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-900/40 dark:text-red-100",
              isTrainingLoading && accent.loadingBadge
            )}
          >
            <span className="flex items-center gap-1">
              {isTrainingLoading && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {trainingStatusLabel}
            </span>
          </Badge>
        </div>

        <p
          className="text-sm text-muted-foreground mb-3 truncate"
          title={trainingStatusDescription}
        >
          {trainingStatusDescription}
          {startedAtLabel ? ` • Started ${startedAtLabel}` : ""}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex flex-col rounded-md border border-border bg-muted/60 p-2 dark:bg-secondary ">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Current Step
              </span>
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">
                {trainingJob ? trainingJob.current_step : 0}
              </span>
            </div>
          </div>
          <div className="flex flex-col rounded-md border border-border bg-muted/60 p-2 dark:bg-secondary">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Requested Steps
              </span>
              <Activity className="h-3.5 w-3.5 text-accent" />
              <span className="text-sm font-bold text-foreground">
                {trainingJob ? trainingJob.requested_steps : 0}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-muted-foreground">
              Training steps
            </Label>
            <span className={cn("text-sm font-mono", accent.trainingStepsText)}>
              {interval} steps
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Slider
              value={interval}
              onValueChange={(value) => setInterval(value)}
              aria-label="Training Steps"
              max={20000}
              min={5000}
              step={5000}
              className="flex-1 py-0"
            />
            <Button
              size="sm"
              className={cn("h-7 px-2  text-xs", accent.trainButton)}
              disabled={isTrainingLoading}
            >
              <Zap className="h-3 w-3" />
              Train More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  accentColor = "purple",
  robotId,
}: EpisodeManagementSidebarProps) => {
  const accent = accentStyles[accentColor];

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex items-center">
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "flex h-16 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg",
              accent.trigger
            )}
          >
            {isOpen ? (
              <ArrowRight className="h-16 w-16 stroke-[2.5]" />
            ) : (
              <ArrowLeft className="h-16 w-16 stroke-[2.5]" />
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="h-full w-[400px] border-l border-border bg-background p-0 text-foreground shadow-2xl sm:w-[540px]">
          <EpisodeManagementContent
            isActive={isOpen}
            datasets={datasets}
            selectedDataset={selectedDataset}
            isLoadingDatasets={isLoadingDatasets}
            episodes={episodes}
            isDeleting={isDeleting}
            formatDuration={formatDuration}
            onSelectDataset={onSelectDataset}
            onRequestCreateDataset={onRequestCreateDataset}
            onRequestDeleteDataset={onRequestDeleteDataset}
            onPromptDeleteEpisode={onPromptDeleteEpisode}
            accentColor={accentColor}
            robotId={robotId}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};
