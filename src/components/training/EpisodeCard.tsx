import { Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type * as episodeApi from "@/services/episodeApi";

interface EpisodeCardProps {
  episode: episodeApi.Episode;
  index: number;
  isDeleting: boolean;
  formatDuration: (seconds?: number) => string;
  selectedDataset: string;
  onDelete: (datasetId: string, episodeId: string) => void;
  onReview: (episodeIndex: number) => void;
  robotId?: string | null;
  isViewing?: boolean;
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
  selectedDataset,
  onDelete,
  onReview,
  robotId,
  isViewing = false,
}: EpisodeCardProps) => {
  const episodeIndex = episode.episode_index;
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
    <Card
      className={`flex items-center justify-between p-1 shadow-sm hover:shadow-md transition-all ${isViewing ? "bg-primary/15 border-primary/50 ring-1 ring-primary/30" : "bg-card"}`}
    >
      <div className="flex flex-1 items-center overflow-hidden text-xs text-foreground sm:text-sm">
        <span
          className={`shrink-0 font-semibold ${isViewing ? "text-primary" : "text-primary"}`}
        >{`#${displayIndex}`}</span>
        <div className="ml-3 flex flex-wrap items-center gap-2 text-muted-foreground">
          <span>{formattedTimestamp}</span>
          <span className="text-border">•</span>
          <span>{formatDuration(episode.duration)}</span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        {/* Open viewer in the side panel */}
        <Button
          size="icon"
          variant="ghost"
          className="h-2 w-2 text-muted-foreground hover:text-primary"
          aria-label="Review episode"
          disabled={!Number.isFinite(safeEpisodeNumber)}
          onClick={handleReview}
        >
          <Play className="h-2 w-2" />
        </Button>
        {/* Open viewer in a new tab */}
        {/* {viewerUrl && (
          <Button
            size="icon"
            variant="ghost"
            className="h-2 w-2 text-muted-foreground hover:text-foreground"
            aria-label="Open episode viewer in new tab"
            asChild
          >
            <a
              href={viewerUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open episode viewer in new tab"
            >
              <ExternalLink className="h-2 w-2" />
            </a>
          </Button>
        )} */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(selectedDataset, episode.episode_index)}
          disabled={isDeleting}
          className="h-2 w-2 text-muted-foreground hover:text-destructive"
          aria-label="Delete episode"
        >
          <Trash2 className="h-2 w-2" />
        </Button>
      </div>
    </Card>
  );
};
