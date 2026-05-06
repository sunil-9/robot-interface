import { Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import type * as episodeApi from "@/services/episodeApi";

interface EpisodeCardProps {
  episode: episodeApi.Episode;
  index: number;
  isDeleting: boolean;
  isBeingDeleted?: boolean;
  formatDuration: (seconds?: number) => string;
  onDelete: (datasetId: string | number, episodeId: string) => void;
  onReview: (episodeIndex: number) => void;
  robotId?: string | null;
  isViewing?: boolean;
  isDatasetLocked?: boolean;
}

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const EpisodeCard = ({
  episode,
  index,
  isDeleting,
  isBeingDeleted = false,
  formatDuration,
  onDelete,
  onReview,
  robotId,
  isViewing = false,
  isDatasetLocked = false,
}: EpisodeCardProps) => {
  const { selectedDataset } = useEpisodeControlContext();
  const episodeIndex = episode.episode_index;
  const datasetRouteId = episode.dataset_id;
  const displayIndex =
    episodeIndex !== undefined && !isNaN(Number(episodeIndex))
      ? Number(episodeIndex) + 1
      : index + 1;
  const parsedEpisodeNumber = Number(episodeIndex);
  const safeEpisodeNumber = Number.isFinite(parsedEpisodeNumber)
    ? parsedEpisodeNumber
    : index;

  const formattedTimestamp = episode.created_at
    ? shortDateFormatter.format(new Date(episode.created_at))
    : "Unknown timestamp";

  const viewerBaseUrl =
    selectedDataset && (robotId || selectedDataset)
      ? `/visualization/local/${encodeURIComponent(
          robotId || selectedDataset,
        )}/`
      : null;
  const viewerUrl =
    viewerBaseUrl && Number.isFinite(safeEpisodeNumber)
      ? `${viewerBaseUrl}?episode=${safeEpisodeNumber}`
      : null;

  const handleReview = () => {
    if (Number.isFinite(safeEpisodeNumber)) {
      onReview(safeEpisodeNumber);
    }
  };

  if (isBeingDeleted) {
    return (
      <div className="mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-1 px-2">
          <svg
            className="h-3 w-3 animate-spin text-rose-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
            #{displayIndex}
          </span>
          <span className="text-xs text-rose-500">Deleting episode...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start gap-3 py-1.5 border-b-2 px-2 hover:bg-muted/40 rounded transition-colors cursor-pointer ${isViewing ? "bg-primary/10" : ""}`}
    >
      <span
        className={`text-xs font-medium shrink-0 ${isViewing ? "text-primary" : "text-muted-foreground"}`}
      >{`#${displayIndex}`}</span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-xs font-medium ${isViewing ? "text-primary" : "text-muted-foreground"}`}>
          {formattedTimestamp}{" "}
          <span className={`text-muted-foreground ${isViewing ? "text-primary" : "text-muted-foreground"}`}>
            ( Duration: {formatDuration(episode.duration)})
          </span>
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 focus-visible:outline-none transition-colors"
          aria-label="Review episode"
          disabled={!Number.isFinite(safeEpisodeNumber)}
          onClick={handleReview}
        >
          <Play className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            if (datasetRouteId !== undefined && datasetRouteId !== null) {
              onDelete(datasetRouteId, episode.episode_index);
            }
          }}
          disabled={isDeleting || isDatasetLocked || datasetRouteId === undefined || datasetRouteId === null}
          className="h-5 w-5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Delete episode"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
