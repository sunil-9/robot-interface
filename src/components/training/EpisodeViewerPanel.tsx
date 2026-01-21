import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import EpisodeViewer from "@/visualization/pages/episode-viewer";
import { getEpisodeDataSafe } from "@/visualization/pages/fetch-data";

import { useEpisodeViewer } from "./EpisodeViewerContext";

interface EpisodeViewerPanelProps {p
  className?: string;
}

/**
 * Inline Episode Viewer that replaces the main camera view area
 * This is NOT a fixed/overlay panel - it's meant to be rendered inline
 */
export function EpisodeViewerPanel({ className }: EpisodeViewerPanelProps) {
  const { viewerState, closeViewer } = useEpisodeViewer();
  const { isOpen, robotId, datasetId, episodeIndex } = viewerState;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // Load episode data when the viewer opens or episode changes
  useEffect(() => {
    if (!isOpen || !robotId || !datasetId || episodeIndex === null) {
      setData(null);
      setError(undefined);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const result = await getEpisodeDataSafe(
          robotId,
          datasetId,
          episodeIndex,
        );
        if (cancelled) return;

        if (result.error) {
          setError(result.error);
          setData(null);
        } else {
          setData(result.data);
          setError(undefined);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load episode");
        setData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, robotId, datasetId, episodeIndex]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative z-50 flex h-full w-full flex-col overflow-hidden rounded-[32px] border border-border bg-background",
        className,
      )}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Episode Viewer
          </h2>
          {episodeIndex !== null && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
              Episode #{episodeIndex + 1}
            </span>
          )}
          {datasetId && (
            <span className="text-sm text-muted-foreground">{datasetId}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeViewer}
          className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
          aria-label="Close episode viewer"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content area */}
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading episode {episodeIndex !== null ? episodeIndex + 1 : ""}
                ...
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h3 className="mb-2 text-lg font-semibold text-destructive">
                Failed to load episode
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={closeViewer}
                className="mt-4"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {data && !loading && !error && (
          <div className="h-full w-full">
            <EpisodeViewer
              data={data}
              error={error}
              org={robotId ?? undefined}
              dataset={datasetId ?? undefined}
              isEmbedded={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
