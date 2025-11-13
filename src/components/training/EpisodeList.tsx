import type * as episodeApi from "@/services/episodeApi";

import { EpisodeCard } from "./EpisodeCard";

interface EpisodeListProps {
  selectedDataset: string;
  episodes: episodeApi.Episode[];
  isDeleting: boolean;
  formatDuration: (seconds?: number) => string;
  onPromptDeleteEpisode: (datasetId: string, episodeId: string) => void;
}

export const EpisodeList = ({
  selectedDataset,
  episodes,
  isDeleting,
  formatDuration,
  onPromptDeleteEpisode,
}: EpisodeListProps) => {
  if (!selectedDataset) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Please select a dataset first</p>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">No episodes found in this dataset</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {episodes.map((episode, index) => (
        <EpisodeCard
          key={episode.episode_id}
          episode={episode}
          index={index}
          isDeleting={isDeleting}
          formatDuration={formatDuration}
          onDelete={onPromptDeleteEpisode}
        />
      ))}
    </div>
  );
};
