import { Brain, Eye, Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import * as trainingApi from "@/services/trainingApi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { CheckpointDetailsDialog } from "./CheckpointDetailsDialog";

interface ModelTrainingSectionProps {
  isActive: boolean;
  className?: string;
  selectedDatasetDbId?: number | null;
}

export const ModelTrainingSection = ({
  isActive,
  className,
  selectedDatasetDbId = null,
}: ModelTrainingSectionProps) => {
  const { selectedDataset } = useEpisodeControlContext();
  const [interval, setInterval] = useState<number[]>([25]);
  const [trainingJob, setTrainingJob] =
    useState<trainingApi.pTrainingJob | null>(null);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [checkpointStatus, setCheckpointStatus] =
    useState<trainingApi.CheckpointStatus | null>(null);
  const [isCheckpointDialogOpen, setIsCheckpointDialogOpen] = useState(false);
  const trainingDatasetRef = selectedDatasetDbId ?? selectedDataset;

  useEffect(() => {
    if (
      !isActive ||
      !selectedDataset ||
      trainingDatasetRef === null ||
      trainingDatasetRef === undefined ||
      trainingDatasetRef === ""
    ) {
      setTrainingJob(null);
      setTrainingMessage(null);
      setCheckpointStatus(null);
      return;
    }

    let cancelled = false;
    const loadTrainingStatus = async (isInitialLoad = false) => {
      // Only show loading state on initial load, not on polling updates
      if (isInitialLoad) {
        setIsTrainingLoading(true);
      }
      setTrainingError(null);
      try {
        const [trainingResult, checkpointResult] = await Promise.all([
          trainingApi.fetchTrainingJobStatus(trainingDatasetRef),
          trainingApi.fetchCheckpointStatus(trainingDatasetRef),
        ]);
        if (cancelled) {
          return;
        }
        setTrainingJob(trainingResult.job);
        setTrainingMessage(trainingResult.message ?? null);
        setCheckpointStatus(checkpointResult.status);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setTrainingJob(null);
        setTrainingMessage(null);
        setCheckpointStatus(null);
        setTrainingError(
          error instanceof Error
            ? error.message
            : "Failed to load training status",
        );
      } finally {
        if (!cancelled && isInitialLoad) {
          setIsTrainingLoading(false);
        }
      }
    };

    // Initial load
    void loadTrainingStatus(true);

    // Poll every 5 seconds
    const pollInterval = window.setInterval(() => {
      void loadTrainingStatus(false);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(pollInterval);
    };
  }, [isActive, selectedDataset, trainingDatasetRef]);

  useEffect(() => {
    if (trainingJob && Number.isFinite(trainingJob.checkpoint_interval)) {
      setInterval([trainingJob.checkpoint_interval]);
    }
  }, [trainingJob]);

  const trainingStatusLabel = trainingJob
    ? "Running"
    : trainingError
      ? "Error"
      : isTrainingLoading
        ? "Checking"
        : "Not Running";

  const trainingStatusText =
    trainingError ??
    trainingMessage ??
    (!selectedDataset
      ? "Select a dataset to check training status"
      : !trainingJob
        ? "No active training job"
        : null);

  const formatStartedAt = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
      return `${dateStr} at ${timeStr}`;
    }
  };

  const startedAtLabel =
    trainingJob?.started_at && trainingJob.started_at !== ""
      ? formatStartedAt(trainingJob.started_at)
      : null;

  return (
    <div className={cn("border-t border-border bg-card p-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm text-foreground">
            Model Training
          </h3>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "h-5 px-2 text-sm border-border bg-muted text-muted-foreground",
            trainingJob &&
              "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400",
            trainingError &&
              "border-destructive/30 bg-destructive/10 text-destructive",
            isTrainingLoading && "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          <span className="flex items-center gap-1">
            {isTrainingLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            {trainingStatusLabel}
          </span>
        </Badge>
      </div>
      {/* // Training status text or details */}

      <div className="text-sm text-muted-foreground mb-3">
        {trainingStatusText ? (
          <span className="truncate block">{trainingStatusText}</span>
        ) : trainingJob ? (
          <div className="flex flex-col gap-0.5">
            <span>Policy: {trainingJob.policy_type || "N/A"}</span>
            <span>Mode: {trainingJob.mode || "N/A"}</span>
            {startedAtLabel && <span>Started: {startedAtLabel}</span>}
          </div>
        ) : null}
        {trainingStatusText && startedAtLabel && (
          <span className="truncate block">Started: {startedAtLabel}</span>
        )}
      </div>

      {checkpointStatus && (
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3 rounded-md bg-muted/50">
          <span>
            Checkpoint:{" "}
            {checkpointStatus.available ? (
              <span className="text-green-600 dark:text-green-400">
                Available Steps {checkpointStatus.latest_step.toLocaleString()}
              </span>
            ) : (
              <span className="text-muted-foreground">Not available</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-0"
            onClick={() => setIsCheckpointDialogOpen(true)}
          >
            <Eye className="h-3 w-3 mr-1" />          </Button>
        </div>
      )}

      <CheckpointDetailsDialog
        open={isCheckpointDialogOpen}
        onOpenChange={setIsCheckpointDialogOpen}
        datasetName={selectedDataset}
        datasetRef={trainingDatasetRef}
      />

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Training Progress
          </span>
          <span className="text-xs font-mono text-foreground">
            {trainingJob ? trainingJob.current_step : 0} /{" "}
            {trainingJob ? trainingJob.target_step : 0} steps
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${
                trainingJob && trainingJob.target_step > 0
                  ? Math.min(
                      (trainingJob.current_step / trainingJob.target_step) *
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
          <span className="text-sm font-mono text-primary">
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
            className="h-7 px-2 text-xs"
            disabled={isTrainingLoading}
          >
            <Zap className="h-3 w-3" />
            Train More
          </Button>
        </div>
      </div>
    </div>
  );
};
