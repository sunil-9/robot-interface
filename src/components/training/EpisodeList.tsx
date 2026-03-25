import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import type * as episodeApi from "@/services/episodeApi";
import { useMemo } from "react";

import { EpisodeCard } from "./EpisodeCard";

interface EpisodeListProps {
  episodes: episodeApi.Episode[];
  isDeleting: boolean;
  formatDuration: (seconds?: number) => string;
  onPromptDeleteEpisode: (datasetId: string | number, episodeId: string) => void;
  onReviewEpisode: (episodeIndex: number) => void;
  robotId?: string | null;
  viewingEpisodeIndex?: number | null;
  isRecording?: boolean;
  recordingElapsedTime?: number;
  isSavingEpisode?: boolean;
}

export const EpisodeList = ({
  episodes,
  isDeleting,
  formatDuration,
  onPromptDeleteEpisode,
  onReviewEpisode,
  robotId,
  viewingEpisodeIndex,
  isRecording = false,
  recordingElapsedTime = 0,
  isSavingEpisode = false,
}: EpisodeListProps) => {
  const { selectedDataset } = useEpisodeControlContext();
  const reversedEpisodes = useMemo(
    () => [...(episodes || [])].reverse(),
    [episodes],
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
        <p className="text-muted-foreground">
          No episodes found in this dataset
        </p>
      </div>
    );
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const nextEpisodeNumber =
    episodes.length > 0
      ? Math.max(...episodes.map((e) => Number(e.episode_index) || 0)) + 2
      : 1;

  return (
    <>
      {/* Recording in progress indicator */}
      {isRecording && (
        <div className="mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative overflow-hidden rounded-lg border border-red-500/50 bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-500/10 pr-2 pl-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/20 to-transparent animate-pulse" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1 w-1 items-center  rounded-full bg-red-500" />
                </span>
                <span className="font-semibold text-red-500">
                  #{nextEpisodeNumber}
                </span>
                <span className="text-sm text-red-400">Recording...</span>
              </div>
              <span className="font-mono text-sm font-medium text-red-500">
                {formatRecordingTime(recordingElapsedTime)}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Saving episode indicator */}
      {isSavingEpisode && !isRecording && (
        <div className="mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-1 px-2">
            <svg
              className="h-3 w-3 animate-spin text-amber-500"
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
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              #{nextEpisodeNumber}
            </span>
            <span className="text-xs text-amber-500">Saving episode...</span>
          </div>
        </div>
      )}
      {reversedEpisodes.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">
            No episodes found in this dataset
          </p>
        </div>
      ) : (
        reversedEpisodes.map((episode, index) => (
          <EpisodeCard
            key={episode.episode_index}
            episode={episode}
            index={index}
            isDeleting={isDeleting}
            formatDuration={formatDuration}
            onDelete={onPromptDeleteEpisode}
            onReview={onReviewEpisode}
            robotId={robotId}
            isViewing={viewingEpisodeIndex === Number(episode.episode_index)}
          />
        ))
      )}
    </>
  );
};
