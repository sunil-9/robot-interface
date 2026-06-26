import { Brain, Eye, Loader2, Plus, Rocket, Square, Trash2, Zap } from "lucide-react";
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
  { value: "act", label: "ACT" },
  { value: "smolvla", label: "SmolVLA" },
];

const DESCRIPTION_PREVIEW_LENGTH = 50;

const formatDescriptionPreview = (description?: string | null) => {
  const trimmed = description?.trim() ?? "";
  if (!trimmed) {
    return "No description";
  }
  return trimmed.length > DESCRIPTION_PREVIEW_LENGTH
    ? `${trimmed.slice(0, DESCRIPTION_PREVIEW_LENGTH)}...`
    : trimmed;
};

export const ModelTrainingSection = ({
  isActive,
  className,
  selectedDatasetDbId = null,
}: ModelTrainingSectionProps) => {
  const {
    selectedDataset,
    handleDeploy,
    isDeploying,
    deployRequestPending,
    deployModelId,
  } = useEpisodeControlContext();
  const [models, setModels] = useState<modelsApi.ModelSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trainSteps, setTrainSteps] = useState<Record<number, number>>({});
  const [checkpointStatus, setCheckpointStatus] =
    useState<trainingApi.CheckpointStatus | null>(null);
  const [isCheckpointDialogOpen, setIsCheckpointDialogOpen] = useState(false);
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
        setError(err instanceof Error ? err.message : "Failed to load models");
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
      setError(err instanceof Error ? err.message : "Failed to queue training");
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
      setError(err instanceof Error ? err.message : "Failed to create model");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeployModel = useCallback(
    (modelId: number) => {
      void handleDeploy(modelId);
    },
    [handleDeploy],
  );

  const getProgressPercent = (model: modelsApi.ModelSummary) => {
    const target = model.max_target_steps ?? model.total_steps;
    if (target <= 0) return 0;
    return Math.min((model.total_steps / target) * 100, 100);
  };

  const isModelActive = (model: modelsApi.ModelSummary) =>
    model.active_job_status === "queued" ||
    model.active_job_status === "training";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/70 p-3 shadow-none",
        className,
      )}
      aria-busy={isLoading}
      aria-hidden={!isActive}
    >
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

      {error && (
        <div className="mb-2 truncate text-xs text-destructive">{error}</div>
      )}

      {!selectedDataset && (
        <div className="mb-2 text-sm text-muted-foreground">
          Select a dataset to manage models
        </div>
      )}

      {checkpointStatus && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-sm text-muted-foreground">
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

      {selectedDataset && (
        <div className="mb-3 space-y-2">
          {isLoading && models.length === 0 && (
            <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading models
            </div>
          )}

          {!isLoading && models.length === 0 && (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
              No models found
            </div>
          )}

          {models.map((model) => {
            const active = isModelActive(model);
            const completed = !active && model.total_steps > 0;
            const target = model.max_target_steps ?? model.total_steps;
            const percent = getProgressPercent(model);
            const selectedSteps =
              trainSteps[model.model_id] ?? STEP_OPTIONS[0].value;
            const modelId = String(model.model_id);
            const isDeployTarget = deployModelId === modelId;
            const isDeployPending = deployRequestPending && isDeployTarget;
            const isStopTarget = isDeploying && isDeployTarget;

            return (
              <div
                key={model.model_id}
                className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                        #{model.model_id}
                      </span>
                      <span className="truncate text-xs font-semibold text-foreground">
                        "{model.algorithm}"
                      </span>
                      {active && (
                        <Badge
                          variant="outline"
                          className="h-4 shrink-0 border-blue-500/30 bg-blue-500/10 px-1.5 text-[10px] text-blue-600 dark:text-blue-400"
                        >
                          {model.active_job_status}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {formatDescriptionPreview(model.description)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 text-muted-foreground hover:text-primary",
                        isStopTarget && "text-destructive hover:text-destructive",
                      )}
                      aria-label={
                        isStopTarget
                          ? `Stop deployment for model ${model.model_id}`
                          : `Deploy model ${model.model_id}`
                      }
                      title={
                        isStopTarget
                          ? `Stop deployment for model ${model.model_id}`
                          : isDeploying
                          ? "Deployment already active"
                          : `Deploy model ${model.model_id}`
                      }
                      disabled={deployRequestPending || (isDeploying && !isDeployTarget)}
                      onClick={() => handleDeployModel(model.model_id)}
                    >
                      {isDeployPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isStopTarget ? (
                        <Square className="h-3.5 w-3.5" />
                      ) : (
                        <Rocket className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete model ${model.model_id}`}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label={`View model ${model.model_id}`}
                      title="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {model.total_steps.toLocaleString()} /{" "}
                      {target.toLocaleString()} steps
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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

                <div className="flex items-center justify-end gap-1.5">
                  <Select
                    value={String(selectedSteps)}
                    onValueChange={(v) =>
                      setTrainSteps((prev) => ({
                        ...prev,
                        [model.model_id]: Number(v),
                      }))
                    }
                  >
                    <SelectTrigger className="h-6 w-[70px] px-2 py-0 text-xs">
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
                    <Zap className="mr-0.5 h-3 w-3" />
                    {active ? "Train More" : "Train"}
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="space-y-1.5 rounded-md border border-dashed border-border bg-muted/20 p-2">
            <div className="flex items-center gap-1.5">
              <Select value={newAlgorithm} onValueChange={setNewAlgorithm}>
                <SelectTrigger className="h-6 w-[130px] px-2 py-0 text-xs">
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
                className="h-6 min-w-0 flex-1 px-2 text-xs"
                placeholder="Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <Select
                value={String(newTargetSteps)}
                onValueChange={(v) => setNewTargetSteps(Number(v))}
              >
                <SelectTrigger className="h-6 w-[70px] px-2 py-0 text-xs">
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
                  <Loader2 className="mr-0.5 h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="mr-0.5 h-3 w-3" />
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
