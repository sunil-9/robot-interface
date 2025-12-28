import type * as episodeApi from "@/services/episodeApi";
import { useMemo } from "react";

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
  const reversedEpisodes = useMemo(
    () => [...(episodes || [])].reverse(),
    [episodes]
  );

  if (!selectedDataset) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please select a dataset first</p>
      </div>
    );
  }

  if (reversedEpisodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No episodes found in this dataset</p>
      </div>
    );
  }

  return (
    <>
      {reversedEpisodes.map((episode, index) => (
        <EpisodeCard
          key={episode.episode_index}
          episode={episode}
          index={index}
          isDeleting={isDeleting}
          formatDuration={formatDuration}
          selectedDataset={selectedDataset}
          onDelete={onPromptDeleteEpisode}
        />
      ))}
    </>
  );
};
