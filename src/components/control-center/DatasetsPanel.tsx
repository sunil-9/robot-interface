import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  cloneDataset,
  deleteDataset,
  fetchDatasetMetadataOverview,
  fetchDatasets,
  type DatasetListItem,
  type DatasetMetadataOverview,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Copy,
  Database,
  Loader2,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface DatasetsPanelProps {
  robotId?: string | null;
}

interface DatasetOverviewItem {
  listItem: DatasetListItem;
  metadata?: DatasetMetadataOverview;
  error?: string;
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Never";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const statusClassName = (status?: string) =>
  cn(
    "border text-xs capitalize",
    status === "processing"
      ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  );

export function DatasetsPanel({ robotId }: DatasetsPanelProps) {
  const [items, setItems] = useState<DatasetOverviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyDatasetId, setBusyDatasetId] = useState<number | null>(null);

  const hasRobot = Boolean(robotId);

  const loadDatasetMetadata = useCallback(async () => {
    if (!robotId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const datasetList = await fetchDatasets(robotId);
      const overviewItems = await Promise.all(
        datasetList.datasetItems.map(async (listItem) => {
          try {
            const metadata = await fetchDatasetMetadataOverview(listItem.id);
            return { listItem, metadata };
          } catch (error) {
            return {
              listItem,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to load dataset metadata.",
            };
          }
        }),
      );
      setItems(overviewItems);
    } catch (error) {
      setItems([]);
      toast({
        title: "Failed to load datasets",
        description:
          error instanceof Error ? error.message : "Dataset request failed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [robotId]);

  useEffect(() => {
    void loadDatasetMetadata();
  }, [loadDatasetMetadata]);

  const totals = useMemo(
    () =>
      items.reduce(
        (summary, item) => {
          summary.datasets += 1;
          summary.episodes += item.metadata?.size.total_episodes ?? 0;
          summary.frames += item.metadata?.size.total_frames ?? 0;
          return summary;
        },
        { datasets: 0, episodes: 0, frames: 0 },
      ),
    [items],
  );

  const handleClone = async (item: DatasetOverviewItem) => {
    setBusyDatasetId(item.listItem.id);
    try {
      const result = await cloneDataset(item.listItem.id);
      toast({
        title: "Dataset cloned",
        description:
          result.message ?? `Dataset "${item.listItem.name}" was cloned.`,
      });
      await loadDatasetMetadata();
    } catch (error) {
      toast({
        title: "Clone failed",
        description:
          error instanceof Error ? error.message : "Failed to clone dataset.",
        variant: "destructive",
      });
    } finally {
      setBusyDatasetId(null);
    }
  };

  const handleDelete = async (item: DatasetOverviewItem) => {
    const confirmed = window.confirm(
      `Delete dataset "${item.listItem.name}" and all linked episodes/models?`,
    );
    if (!confirmed) {
      return;
    }

    setBusyDatasetId(item.listItem.id);
    try {
      await deleteDataset(item.listItem.id);
      toast({
        title: "Dataset deleted",
        description: `Dataset "${item.listItem.name}" was deleted.`,
      });
      await loadDatasetMetadata();
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Failed to delete dataset.",
        variant: "destructive",
      });
    } finally {
      setBusyDatasetId(null);
    }
  };

  if (!hasRobot) {
    return (
      <div className="rounded-lg border border-border bg-card/70 p-6 text-sm text-muted-foreground">
        Select a robot in the header to view its datasets.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/70 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background/80 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Robot {robotId} datasets
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.datasets} datasets, {totals.episodes} episodes,{" "}
              {totals.frames} frames
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadDatasetMetadata()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/70 p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
          Loading datasets...
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          No datasets found for this robot.
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const metadata = item.metadata;
          const status = metadata?.state.status ?? "unknown";
          const busy = busyDatasetId === item.listItem.id;
          const disabled = busy || status === "processing";

          return (
            <div
              key={item.listItem.id}
              className="rounded-lg border border-border bg-card/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-foreground">
                      {item.listItem.name}
                    </h3>
                    <Badge variant="outline" className={statusClassName(status)}>
                      {status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ID {item.listItem.id}
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    {metadata?.description.database_description ??
                      item.listItem.description ??
                      "No description"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleClone(item)}
                    disabled={disabled}
                    title={
                      status === "processing"
                        ? "Dataset is processing"
                        : "Clone dataset"
                    }
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(item)}
                    disabled={disabled}
                    title={
                      status === "processing"
                        ? "Dataset is processing"
                        : "Delete dataset"
                    }
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {item.error ? (
                <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {item.error}
                </p>
              ) : (
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-md border border-border/70 bg-background/50 p-3">
                    <p className="text-xs uppercase text-muted-foreground">
                      Size
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {metadata?.size.total_episodes ?? 0} episodes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metadata?.size.total_frames ?? 0} frames
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/50 p-3">
                    <p className="text-xs uppercase text-muted-foreground">
                      Training
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {metadata?.training_usage.models.length ?? 0} models
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metadata?.training_usage.training_jobs.length ?? 0} jobs
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/50 p-3">
                    <p className="text-xs uppercase text-muted-foreground">
                      Ingestion
                    </p>
                    <p className="mt-1 font-medium text-foreground">
                      {metadata?.ingestions.length ?? 0} records
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Updated {formatDateTime(metadata?.state.status_updated_at)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/50 p-3">
                    <p className="text-xs uppercase text-muted-foreground">
                      Visualization
                    </p>
                    <p className="mt-1 truncate font-medium text-foreground">
                      {metadata?.visualization.version ?? "No version"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {metadata?.visualization.metadata_error ?? "metadata ready"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
