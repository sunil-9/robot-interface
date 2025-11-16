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
  const episodeIndex =episode.episode_index;
  const displayIndex =
    episodeIndex !== undefined ? episodeIndex + 1 : index + 1;

  const formattedTimestamp = episode.created_at
    ? shortDateFormatter.format(new Date(episode.created_at))
    : "Unknown timestamp";

  return (
    <Card className="flex items-center justify-between border-gray-700 bg-gray-800 px-4 py-2">
      <div className="flex flex-1 items-center overflow-hidden text-xs text-gray-300 sm:text-sm">
        <span className="shrink-0 font-semibold text-purple-300">{`#${displayIndex}`}</span>
        <div className="ml-3 flex flex-wrap items-center gap-2 text-gray-400">
          <span>{formattedTimestamp}</span>
          <span className="text-gray-600">•</span>
          <span>{formatDuration(episode.duration)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Selection & replay actions will return with the new API */}
        <Button
          size="icon"
          variant="ghost"
          className="text-gray-500 hover:text-white"
          disabled
          aria-label="Replay (coming soon)"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(selectedDataset, episode.episode_index)}
          disabled={isDeleting}
          className="text-gray-500 hover:text-red-600 text-red-400"
          aria-label="Delete episode"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
