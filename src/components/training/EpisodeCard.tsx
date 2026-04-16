import { Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import type * as episodeApi from "@/services/episodeApi";

interface EpisodeCardProps {
  episode: episodeApi.Episode;
  index: number;
  isDeleting: boolean;
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
