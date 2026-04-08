import { Brain, Eye, Loader2, Plus, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import * as modelsApi from "@/services/modelsApi";
import * as trainingApi from "@/services/trainingApi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { CheckpointDetailsDialog } from "./CheckpointDetailsDialog";

interface ModelTrainingSectionProps {
  isActive: boolean;
  className?: string;
  selectedDatasetDbId?: number | null;
}

const STEP_OPTIONS = [
  { value: 100_000, label: "100k" },
  { value: 200_000, label: "200k" },
  { value: 300_000, label: "300k" },
  { value: 400_000, label: "400k" },
  { value: 500_000, label: "500k" },
];

const ALGORITHM_OPTIONS = [
  { value: "ACT", label: "ACT" },
  { value: "Diffusion Policy", label: "Diffusion Policy" },
  { value: "pi0 (finetune)", label: "pi0 (finetune)" },
];

export const ModelTrainingSection = ({
  isActive,
  className,
  selectedDatasetDbId = null,
}: ModelTrainingSectionProps) => {
  const { selectedDataset } = useEpisodeControlContext();
  const [models, setModels] = useState<modelsApi.ModelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-model step selection for the "Train" button
  const [trainSteps, setTrainSteps] = useState<Record<number, number>>({});

  // Checkpoint state (preserved from original component)
  const [checkpointStatus, setCheckpointStatus] =
    useState<trainingApi.CheckpointStatus | null>(null);
  const [isCheckpointDialogOpen, setIsCheckpointDialogOpen] = useState(false);

  // New model form state
  const [newAlgorithm, setNewAlgorithm] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTargetSteps, setNewTargetSteps] = useState(100_000);
  const [isCreating, setIsCreating] = useState(false);

  const datasetId = selectedDatasetDbId ?? null;

  const fetchModels = useCallback(
    async (initial = false) => {
      if (datasetId === null) return;
      if (initial) setIsLoading(true);
      setError(null);
      try {
        const result = await modelsApi.fetchModelsForDataset(datasetId);
        setModels(result.models);
      } catch (err) {
        setModels([]);
        setError(
          err instanceof Error ? err.message : "Failed to load models",
        );
      } finally {
        if (initial) setIsLoading(false);
      }
    },
    [datasetId],
  );

  useEffect(() => {
    if (!isActive || !selectedDataset || datasetId === null) {
      setModels([]);
      setError(null);
      setCheckpointStatus(null);
      return;
    }

    let cancelled = false;

    const load = async (initial: boolean) => {
      if (cancelled) return;
      await fetchModels(initial);
      // Also fetch checkpoint status
      try {
        const cpResult = await trainingApi.fetchCheckpointStatus(datasetId);
        if (!cancelled) setCheckpointStatus(cpResult.status);
      } catch {
        if (!cancelled) setCheckpointStatus(null);
      }
    };

    void load(true);

    const pollInterval = window.setInterval(() => {
      void load(false);
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(pollInterval);
    };
  }, [isActive, selectedDataset, datasetId, fetchModels]);

  const handleTrainExisting = async (modelId: number) => {
    if (datasetId === null) return;
    const steps = trainSteps[modelId] ?? STEP_OPTIONS[0].value;
    try {
      await modelsApi.trainExistingModel(modelId, datasetId, {
        additional_steps: steps,
      });
      await fetchModels();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to queue training",
      );
    }
  };

  const handleCreateModel = async () => {
    if (datasetId === null || !newAlgorithm) return;
    setIsCreating(true);
    try {
      await modelsApi.createModelAndTrain(datasetId, {
        algorithm: newAlgorithm,
        description: newDescription || undefined,
        target_steps: newTargetSteps,
      });
      setNewAlgorithm("");
      setNewDescription("");
      setNewTargetSteps(100_000);
      await fetchModels();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create model",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const getProgressPercent = (model: modelsApi.ModelSummary) => {
    const target = model.max_target_steps ?? model.total_steps;
    if (target <= 0) return 0;
    return Math.min((model.total_steps / target) * 100, 100);
  };

  const isModelActive = (model: modelsApi.ModelSummary) =>
    model.active_job_status === "queued" ||
    model.active_job_status === "training";

  return (
    <div className={cn("border-t border-border bg-card p-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm text-foreground">Models</h3>
        </div>
        <Badge variant="outline" className="h-5 px-2 text-sm border-border bg-muted text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            models.length
          )}
        </Badge>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-destructive mb-2 truncate">{error}</div>
      )}

      {/* No dataset selected */}
      {!selectedDataset && (
        <div className="text-sm text-muted-foreground">
          Select a dataset to manage models
        </div>
      )}

      {/* Checkpoint status */}
      {checkpointStatus && (
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2 rounded-md bg-muted/50 px-2 py-1">
          <span className="text-xs">
            Checkpoint:{" "}
            {checkpointStatus.available ? (
              <span className="text-green-600 dark:text-green-400">
                Step {checkpointStatus.latest_step.toLocaleString()}
              </span>
            ) : (
              <span className="text-muted-foreground">Not available</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-xs gap-0"
            onClick={() => setIsCheckpointDialogOpen(true)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      )}

      <CheckpointDetailsDialog
        open={isCheckpointDialogOpen}
        onOpenChange={setIsCheckpointDialogOpen}
        datasetName={selectedDataset}
        datasetId={datasetId}
      />

      {/* Model rows */}
      {selectedDataset && (
        <div className="space-y-2">
          {models.map((model) => {
            const active = isModelActive(model);
            const completed = !active && model.total_steps > 0;
            const target = model.max_target_steps ?? model.total_steps;
            const percent = getProgressPercent(model);
            const selectedSteps =
              trainSteps[model.model_id] ?? STEP_OPTIONS[0].value;

            return (
              <div
                key={model.model_id}
                className="rounded-md border border-border bg-muted/30 p-2 space-y-1.5"
              >
                {/* Top row: algorithm + description */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {model.algorithm}
                  </span>
                  {model.description && (
                    <span className="text-xs text-muted-foreground truncate">
                      {model.description}
                    </span>
                  )}
                  {active && (
                    <Badge
                      variant="outline"
                      className="ml-auto h-4 px-1.5 text-[10px] border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0"
                    >
                      {model.active_job_status}
                    </Badge>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {model.total_steps.toLocaleString()} /{" "}
                      {target.toLocaleString()} steps
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        active && "bg-blue-500 animate-pulse",
                        completed && "bg-green-500",
                        !active && !completed && "bg-muted-foreground/30",
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Controls: step select + train button */}
                <div className="flex items-center gap-1.5 justify-end">
                  <Select
                    value={String(selectedSteps)}
                    onValueChange={(v) =>
                      setTrainSteps((prev) => ({
                        ...prev,
                        [model.model_id]: Number(v),
                      }))
                    }
                  >
                    <SelectTrigger className="h-6 w-[70px] text-xs px-2 py-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STEP_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={String(opt.value)}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleTrainExisting(model.model_id)}
                  >
                    <Zap className="h-3 w-3 mr-0.5" />
                    {active ? "Train More" : "Train"}
                  </Button>
                </div>
              </div>
            );
          })}

          {/* New model row */}
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Select value={newAlgorithm} onValueChange={setNewAlgorithm}>
                <SelectTrigger className="h-6 w-[130px] text-xs px-2 py-0">
                  <SelectValue placeholder="Algorithm" />
                </SelectTrigger>
                <SelectContent>
                  {ALGORITHM_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-6 text-xs flex-1 min-w-0 px-2"
                placeholder="Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Select
                value={String(newTargetSteps)}
                onValueChange={(v) => setNewTargetSteps(Number(v))}
              >
                <SelectTrigger className="h-6 w-[70px] text-xs px-2 py-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={String(opt.value)}
                      className="text-xs"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={!newAlgorithm || isCreating || datasetId === null}
                onClick={handleCreateModel}
              >
                {isCreating ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-0.5" />
                ) : (
                  <Plus className="h-3 w-3 mr-0.5" />
                )}
                Train
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
