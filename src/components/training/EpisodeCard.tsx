import { RotateCw, Trash2 } from "lucide-react";

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
}: EpisodeCardProps) => {
  const episodeIndex = episode.episode_index;
  const displayIndex =
    episodeIndex !== undefined && !isNaN(Number(episodeIndex))
      ? Number(episodeIndex) + 1
      : index + 1;

  const formattedTimestamp = episode.created_at
    ? shortDateFormatter.format(new Date(episode.created_at))
    : "Unknown timestamp";

  return (
    <Card className="flex items-center justify-between bg-card p-1  shadow-sm hover:shadow-md">
      <div className="flex flex-1 items-center overflow-hidden text-xs text-foreground sm:text-sm">
        <span className="shrink-0 font-semibold text-primary">{`#${displayIndex}`}</span>
        <div className="ml-3 flex flex-wrap items-center gap-2 text-muted-foreground">
          <span>{formattedTimestamp}</span>
          <span className="text-border">•</span>
          <span>{formatDuration(episode.duration)}</span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        {/* Selection & replay actions will return with the new API */}
        <Button
          size="icon"
          variant="ghost"
          className="h-2 w-2 text-muted-foreground hover:text-foreground"
          disabled
          aria-label="Replay (coming soon)"
        >
          <RotateCw className="h-2 w-2" />
        </Button>
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
