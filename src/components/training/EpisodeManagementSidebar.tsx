import { ArrowLeft, ArrowRight, Brain, Loader2, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
import { useEpisodeViewer } from "./EpisodeViewerContext";

type AccentColor = "primary" | "accent";

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
  primary: {
    trigger:
      "border-primary/30 text-primary shadow-[0_10px_30px_hsl(var(--primary)/0.18)] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_12px_40px_hsl(var(--primary)/0.25)] dark:border-primary/40 dark:text-primary dark:hover:bg-primary/10 dark:shadow-[0_0_22px_hsl(var(--primary)/0.35)]",
    trainingIcon: "text-primary dark:text-primary",
    trainingStepsText: "text-primary dark:text-primary",
    trainButton:
      "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/80",
    loadingBadge:
      "border-primary/20 bg-primary/5 text-primary dark:border-primary/40 dark:bg-primary/10 dark:text-primary",
  },
  accent: {
    trigger:
      "border-accent/50 text-accent-foreground shadow-[0_10px_30px_hsl(var(--accent)/0.18)] hover:border-accent/70 hover:bg-accent/10 hover:shadow-[0_12px_40px_hsl(var(--accent)/0.25)] dark:border-accent/40 dark:text-accent-foreground dark:hover:bg-accent/20 dark:shadow-[0_0_22px_hsl(var(--accent)/0.35)]",
    trainingIcon: "text-accent-foreground dark:text-accent",
    trainingStepsText: "text-accent-foreground dark:text-accent",
    trainButton:
      "bg-accent text-accent-foreground hover:bg-accent/90 dark:bg-accent dark:text-accent-foreground dark:hover:bg-accent/80",
    loadingBadge:
      "border-accent/30 bg-accent/10 text-accent-foreground dark:border-accent/40 dark:bg-accent/20 dark:text-accent",
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

interface EpisodeManagementContentProps extends Omit<
  EpisodeManagementSidebarProps,
  "isOpen" | "onOpenChange"
> {
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
  accentColor = "accent",
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

  const { openViewer, viewerState } = useEpisodeViewer();

  const handleReviewEpisode = useCallback(
    (episodeIndex: number) => {
      if (selectedDataset) {
        // Use "local" as the org and selectedDataset as the dataset identifier
        openViewer("local", selectedDataset, episodeIndex);
      }
    },
    [selectedDataset, openViewer],
  );

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
        const result =
          await trainingApi.fetchTrainingJobStatus(selectedDataset);
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
            : "Failed to load training status",
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

      <div className="overflow-y-auto  h-[52%] p-2 dark:bg-muted/30">
        <EpisodeList
          selectedDataset={selectedDataset}
          episodes={episodes}
          isDeleting={isDeleting}
          formatDuration={formatDuration}
          onPromptDeleteEpisode={onPromptDeleteEpisode}
          onReviewEpisode={handleReviewEpisode}
          robotId={robotId}
          viewingEpisodeIndex={
            viewerState.isOpen && viewerState.datasetId === selectedDataset
              ? viewerState.episodeIndex
              : null
          }
        />
      </div>
      <div className=" fixed bottom-5 border-t border-border bg-card pt-3 w-[330px]">
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
              isTrainingLoading && accent.loadingBadge,
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

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Training Progress
            </span>
            <span className="text-xs font-mono text-foreground">
              {trainingJob ? trainingJob.current_step : 0} /{" "}
              {trainingJob ? trainingJob.requested_steps : 0} steps
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${
                  trainingJob && trainingJob.requested_steps > 0
                    ? Math.min(
                        (trainingJob.current_step /
                          trainingJob.requested_steps) *
                          100,
                        100,
                      )
                    : 0
                }%`,
              }}
            />
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
  accentColor = "primary",
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
              accent.trigger,
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
