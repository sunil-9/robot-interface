import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DataRecharts from "../components/data-recharts";
import Loading from "../components/loading-component";
import PlaybackBar from "../components/playback-bar";
import Sidebar from "../components/side-nav";
import { SimpleVideosPlayer } from "../components/simple-videos-player";
import { TimeProvider, useTime } from "../context/time-context";
import { getAdjacentEpisodesVideoInfo } from "./fetch-data";

export default function EpisodeViewer({
  data,
  error,
  org,
  dataset,
  isEmbedded = false,
  onEpisodeChange,
}: {
  data?: any;
  error?: string;
  org?: string;
  dataset?: string;
  isEmbedded?: boolean;
  onEpisodeChange?: (episodeIndex: number) => void;
}) {
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400">
        <div className="max-w-xl p-8 rounded bg-slate-900 border border-red-500 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-lg font-mono whitespace-pre-wrap mb-4">{error}</p>
        </div>
      </div>
    );
  }
  return (
    <TimeProvider duration={data.duration}>
      <EpisodeViewerInner
        data={data}
        org={org}
        dataset={dataset}
        isEmbedded={isEmbedded}
        onEpisodeChange={onEpisodeChange}
      />
    </TimeProvider>
  );
}

function EpisodeViewerInner({
  data,
  org,
  dataset,
  isEmbedded = false,
  onEpisodeChange,
}: {
  data: any;
  org?: string;
  dataset?: string;
  isEmbedded?: boolean;
  onEpisodeChange?: (episodeIndex: number) => void;
}) {
  const {
    datasetInfo,
    episodeId,
    videosInfo,
    chartDataGroups,
    episodes,
    task,
  } = data;

  const [videosReady, setVideosReady] = useState(!videosInfo.length);
  const [chartsReady, setChartsReady] = useState(false);
  const isLoading = !videosReady || !chartsReady;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  // Use context for time sync
  const { currentTime, setCurrentTime, setIsPlaying, isPlaying } = useTime();

  // Pagination state
  const pageSize = 100;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(episodes.length / pageSize);
  const paginatedEpisodes = episodes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Popup / embed mode trims chrome (sidebar, headers) and relaxes sizing
  const isPopupView =
    isEmbedded ||
    searchParams.get("popup") === "1" ||
    searchParams.get("popup") === "true";

  // Preload adjacent episodes' videos
  useEffect(() => {
    if (!org || !dataset) return;

    const preloadAdjacent = async () => {
      try {
        await getAdjacentEpisodesVideoInfo(org, dataset, episodeId, 2);
        // Preload adjacent episodes for smoother navigation
      } catch {
        // Skip preloading on error
      }
    };

    preloadAdjacent();
  }, [org, dataset, episodeId]);

  // Initialize based on URL time parameter
  useEffect(() => {
    const timeParam = searchParams.get("t");
    if (timeParam) {
      const timeValue = parseFloat(timeParam);
      if (!isNaN(timeValue)) {
        setCurrentTime(timeValue);
      }
    }
  }, []);

  // Initialize based on URL time parameter
  useEffect(() => {
    // Initialize page based on current episode
    const episodeIndex = episodes.indexOf(episodeId);
    if (episodeIndex !== -1) {
      setCurrentPage(Math.floor(episodeIndex / pageSize) + 1);
    }

    // Add keyboard event listener
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [episodes, episodeId, pageSize, searchParams]);

  // Only update URL ?t= param when the integer second changes
  const lastUrlSecondRef = useRef<number>(-1);
  useEffect(() => {
    if (isPlaying) return;
    const currentSec = Math.floor(currentTime);
    if (currentTime > 0 && lastUrlSecondRef.current !== currentSec) {
      lastUrlSecondRef.current = currentSec;
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("t", currentSec.toString());
      // Replace state instead of pushing to avoid navigation stack bloat
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${newParams.toString()}`,
      );
    }
  }, [isPlaying, currentTime, searchParams]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    const { key } = e;

    if (key === " ") {
      e.preventDefault();
      setIsPlaying((prev: boolean) => !prev);
    } else if (key === "ArrowDown" || key === "ArrowUp") {
      e.preventDefault();
      const nextEpisodeId = key === "ArrowUp" ? episodeId + 1 : episodeId - 1;
      const lowestEpisodeId = episodes[0];
      const highestEpisodeId = episodes[episodes.length - 1];

      if (
        nextEpisodeId >= lowestEpisodeId &&
        nextEpisodeId <= highestEpisodeId
      ) {
        // When embedded, use the callback to change episode via context
        if (isEmbedded && onEpisodeChange) {
          onEpisodeChange(nextEpisodeId);
        } else {
          // Otherwise navigate via URL
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.set("episode", nextEpisodeId.toString());
          navigate({
            pathname: window.location.pathname,
            search: `?${newParams.toString()}`,
          });
        }
      }
    }
  };

  // Pagination functions
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <div
      className={`flex ${isPopupView ? "h-[93vh]" : "h-screen"} max-h-screen bg-slate-950 text-gray-200`}
    >
      {/* Sidebar */}
      {!isPopupView && (
        <Sidebar
          datasetInfo={datasetInfo}
          paginatedEpisodes={paginatedEpisodes}
          episodeId={episodeId}
          totalPages={totalPages}
          currentPage={currentPage}
          prevPage={prevPage}
          nextPage={nextPage}
          onSelectEpisode={(ep) => {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.set("episode", ep.toString());
            navigate({
              pathname: window.location.pathname,
              search: `?${newParams.toString()}`,
            });
          }}
        />
      )}

      {/* Content */}
      <div
        className={`flex max-h-screen flex-col gap-4 p-4 w-full relative ${isLoading ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        {isLoading && <Loading />}

        {!isPopupView && (
          <div className="flex items-center justify-start my-4">
            <p className="font-mono text-lg font-semibold">
              Episode {episodeId}
            </p>
          </div>
        )}

        {/* Videos */}
        {videosInfo.length > 0 && (
          <SimpleVideosPlayer
            key={`videos-${episodeId}`}
            videosInfo={videosInfo}
            onVideosReady={() => setVideosReady(true)}
          />
        )}

        {/* Language Instruction */}
        {!isPopupView && task && (
          <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
            <p className="text-slate-300">
              <span className="font-semibold text-slate-100">
                Language Instruction:
              </span>
            </p>
            <div className="mt-2 text-slate-300">
              {task.split("\n").map((instruction, index) => (
                <p key={index} className="mb-1">
                  {instruction}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Graph */}
        <div className="mb-4">
          <DataRecharts
            data={chartDataGroups}
            onChartsReady={() => setChartsReady(true)}
          />
        </div>

        <PlaybackBar />
      </div>
    </div>
  );
}
