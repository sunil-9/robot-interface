/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { apiFetch, loadStoredAccessToken } from "@/lib/apiClient";
import { buildApiUrl } from "@/lib/config";
import React, { useEffect, useRef } from "react";
import { FaCompress, FaExpand, FaEye } from "react-icons/fa";
import { useTime } from "../context/time-context";

type VideoInfo = {
  filename: string;
  url: string;
  isSegmented?: boolean;
  segmentStart?: number;
  segmentEnd?: number;
  segmentDuration?: number;
};

type VideoPlayerProps = {
  videosInfo: VideoInfo[];
  onVideosReady?: () => void;
};

const PLAYBACK_TIME_UPDATE_INTERVAL_MS = 125;
const PLAYING_SYNC_DRIFT_THRESHOLD_SECONDS = 0.5;
const PAUSED_SYNC_DRIFT_THRESHOLD_SECONDS = 0.05;

export const SimpleVideosPlayer = ({
  videosInfo,
  onVideosReady,
}: VideoPlayerProps) => {
  const { currentTime, setCurrentTime, isPlaying, setIsPlaying } = useTime();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [hiddenVideos, setHiddenVideos] = React.useState<string[]>([]);
  const [enlargedVideo, setEnlargedVideo] = React.useState<string | null>(null);
  const [showHiddenMenu, setShowHiddenMenu] = React.useState(false);
  const [videosReady, setVideosReady] = React.useState(false);
  const [fallbackVideoUrls, setFallbackVideoUrls] = React.useState<
    Record<string, string>
  >({});
  const [videoErrors, setVideoErrors] = React.useState<Record<string, string>>(
    {},
  );
  const readyCalledRef = useRef(false);
  const onVideosReadyRef = useRef(onVideosReady);
  const fallbackObjectUrlsRef = useRef<string[]>([]);
  const fallbackRequestsRef = useRef<Set<string>>(new Set());
  const lastPlaybackTimeUpdateRef = useRef(0);

  const firstVisibleIdx = videosInfo.findIndex(
    (video) => !hiddenVideos.includes(video.filename),
  );

  // Initialize video refs array
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, videosInfo.length);
  }, [videosInfo.length]);

  const resolvedVideoUrls = React.useMemo(
    () =>
      Object.fromEntries(
        videosInfo.map((info) => [
          info.filename,
          fallbackVideoUrls[info.filename] ?? buildStreamableVideoUrl(info.url),
        ]),
      ),
    [fallbackVideoUrls, videosInfo],
  );

  useEffect(() => {
    onVideosReadyRef.current = onVideosReady;
  }, [onVideosReady]);

  useEffect(() => {
    readyCalledRef.current = false;
    setFallbackVideoUrls({});
    setVideoErrors({});
    setVideosReady(true);
    if (!readyCalledRef.current) {
      readyCalledRef.current = true;
      onVideosReadyRef.current?.();
    }
  }, [videosInfo]);

  useEffect(() => {
    return () => {
      fallbackObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      fallbackObjectUrlsRef.current = [];
      fallbackRequestsRef.current.clear();
    };
  }, [videosInfo]);

  const loadFallbackVideo = React.useCallback(async (info: VideoInfo) => {
    if (
      fallbackVideoUrls[info.filename] ||
      fallbackRequestsRef.current.has(info.filename)
    ) {
      return;
    }

    fallbackRequestsRef.current.add(info.filename);
    setVideoErrors((prev) => {
      const next = { ...prev };
      delete next[info.filename];
      return next;
    });

    try {
      const response = await apiFetch(info.url);
      if (!response.ok) {
        throw new Error(
          `Fallback fetch failed (${response.status} ${response.statusText})`,
        );
      }

      const objectUrl = URL.createObjectURL(await response.blob());
      fallbackObjectUrlsRef.current.push(objectUrl);
      setFallbackVideoUrls((prev) => ({
        ...prev,
        [info.filename]: objectUrl,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch video.";
      setVideoErrors((prev) => ({
        ...prev,
        [info.filename]: message,
      }));
    } finally {
      fallbackRequestsRef.current.delete(info.filename);
    }
  }, [fallbackVideoUrls]);

  // Handle videos ready
  useEffect(() => {
    if (videosInfo.length === 0) {
      // No videos, mark as ready immediately
      if (!readyCalledRef.current) {
        readyCalledRef.current = true;
        setVideosReady(true);
        onVideosReadyRef.current?.();
      }
      return;
    }

    const markReady = (video?: HTMLVideoElement) => {
      setIsPlaying(true);
      video?.play().catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Error playing video");
        }
      });
    };

    const checkReady = (index: number, video?: HTMLVideoElement) => {
      if (index === firstVisibleIdx) {
        markReady(video);
      } else if (isPlaying) {
        video?.play().catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Error playing video");
          }
        });
      }
    };

    videoRefs.current.forEach((video, index) => {
      if (video) {
        const info = videosInfo[index];
        const sourceUrl = resolvedVideoUrls[info.filename];

        if (!sourceUrl) {
          checkReady(index, video);
          return;
        }

        // Handle video load error
        const handleError = (e: Event) => {
          const videoEl = e.target as HTMLVideoElement;
          const errorCode = videoEl.error?.code;
          const errorMessage = videoEl.error?.message || "Unknown error";
          console.error(
            `Video ${info.filename} failed to load:`,
            errorMessage,
            `(code: ${errorCode})`,
          );
          console.error(`Video URL: ${info.url}`);

          if (!sourceUrl.startsWith("blob:")) {
            void loadFallbackVideo(info);
          } else {
            setVideoErrors((prev) => ({
              ...prev,
              [info.filename]: errorMessage,
            }));
          }
          checkReady(index, video);
        };

        // Setup segment boundaries
        if (info.isSegmented) {
          const handleTimeUpdate = () => {
            const segmentEnd = info.segmentEnd || video.duration;
            const segmentStart = info.segmentStart || 0;

            if (video.currentTime >= segmentEnd - 0.05) {
              video.currentTime = segmentStart;
              // Also update the global time to reset to start
              if (index === firstVisibleIdx) {
                setCurrentTime(0);
              }
            }
          };

          const handleLoadedData = () => {
            video.currentTime = info.segmentStart || 0;
            checkReady(index, video);
          };

          video.addEventListener("timeupdate", handleTimeUpdate);
          video.addEventListener("loadeddata", handleLoadedData);
          video.addEventListener("error", handleError);

          // Store cleanup
          (video as any)._segmentHandlers = () => {
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("loadeddata", handleLoadedData);
            video.removeEventListener("error", handleError);
          };
        } else {
          // For non-segmented videos, handle end of video
          const handleEnded = () => {
            video.currentTime = 0;
            if (index === firstVisibleIdx) {
              setCurrentTime(0);
            }
          };

          // Use loadeddata instead of canplaythrough - more reliable
          const handleLoaded = () => checkReady(index, video);

          video.addEventListener("ended", handleEnded);
          video.addEventListener("loadeddata", handleLoaded, { once: true });
          video.addEventListener("error", handleError, { once: true });

          // Store cleanup
          (video as any)._segmentHandlers = () => {
            video.removeEventListener("ended", handleEnded);
            video.removeEventListener("loadeddata", handleLoaded);
            video.removeEventListener("error", handleError);
          };
        }
      }
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video && (video as any)._segmentHandlers) {
          (video as any)._segmentHandlers();
        }
      });
    };
  }, [
    videosInfo,
    resolvedVideoUrls,
    loadFallbackVideo,
    isPlaying,
    setIsPlaying,
    firstVisibleIdx,
    setCurrentTime,
  ]);

  // Handle play/pause
  useEffect(() => {
    if (!videosReady) return;

    videoRefs.current.forEach((video, idx) => {
      if (video && !hiddenVideos.includes(videosInfo[idx].filename)) {
        if (isPlaying) {
          video.play().catch((e) => {
            if (e.name !== "AbortError") {
              console.error("Error playing video");
            }
          });
        } else {
          video.pause();
        }
      }
    });
  }, [isPlaying, videosReady, hiddenVideos, videosInfo]);

  // Sync video times
  useEffect(() => {
    if (!videosReady) return;

    videoRefs.current.forEach((video, index) => {
      if (video && !hiddenVideos.includes(videosInfo[index].filename)) {
        const info = videosInfo[index];
        let targetTime = currentTime;

        if (info.isSegmented) {
          targetTime = (info.segmentStart || 0) + currentTime;
        }

        const driftThreshold = isPlaying
          ? PLAYING_SYNC_DRIFT_THRESHOLD_SECONDS
          : PAUSED_SYNC_DRIFT_THRESHOLD_SECONDS;

        if (Math.abs(video.currentTime - targetTime) > driftThreshold) {
          video.currentTime = targetTime;
        }
      }
    });
  }, [currentTime, videosInfo, videosReady, hiddenVideos, isPlaying]);

  // Handle time update from first visible video
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    const videoIndex = videoRefs.current.findIndex((ref) => ref === video);
    const info = videosInfo[videoIndex];

    if (info) {
      let globalTime = video.currentTime;
      if (info.isSegmented) {
        globalTime = video.currentTime - (info.segmentStart || 0);
      }

      const now = performance.now();
      const shouldCommit =
        globalTime <= 0 ||
        now - lastPlaybackTimeUpdateRef.current >=
          PLAYBACK_TIME_UPDATE_INTERVAL_MS;
      if (!shouldCommit) return;

      lastPlaybackTimeUpdateRef.current = now;
      setCurrentTime(globalTime);
    }
  };

  // Handle play click for segmented videos
  const handlePlay = (video: HTMLVideoElement, info: VideoInfo) => {
    if (info.isSegmented) {
      const segmentStart = info.segmentStart || 0;
      const segmentEnd = info.segmentEnd || video.duration;

      if (video.currentTime < segmentStart || video.currentTime >= segmentEnd) {
        video.currentTime = segmentStart;
      }
    }
    video.play();
  };

  return (
    <>
      {/* Hidden videos menu */}
      {hiddenVideos.length > 0 && (
        <div className="relative mb-4">
          <button
            className="flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 border border-slate-500"
            onClick={() => setShowHiddenMenu(!showHiddenMenu)}
          >
            <FaEye /> Show Hidden Videos ({hiddenVideos.length})
          </button>
          {showHiddenMenu && (
            <div className="absolute left-0 mt-2 w-max rounded border border-slate-500 bg-slate-900 shadow-lg p-2 z-50">
              <div className="mb-2 text-xs text-slate-300">
                Restore hidden videos:
              </div>
              {hiddenVideos.map((filename) => (
                <button
                  key={filename}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-slate-700 text-slate-100"
                  onClick={() =>
                    setHiddenVideos((prev) =>
                      prev.filter((v) => v !== filename),
                    )
                  }
                >
                  {filename}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Videos */}
      <div className="flex flex-wrap gap-x-2 gap-y-6">
        {videosInfo.map((info, idx) => {
          if (hiddenVideos.includes(info.filename)) return null;

          const isEnlarged = enlargedVideo === info.filename;
          const isFirstVisible = idx === firstVisibleIdx;

          return (
            <div
              key={info.filename}
              className={`${
                isEnlarged
                  ? "absolute inset-0 z-40 flex h-full w-full flex-col bg-black/90 p-4"
                  : "max-w-2xl"
              }`}
            >
              <p className="truncate w-full rounded-t-xl bg-gray-800 px-2 text-sm text-gray-300 flex items-center justify-between">
                <span>{info.filename}</span>
                <span className="flex gap-1">
                  <button
                    title={isEnlarged ? "Minimize" : "Enlarge"}
                    className="ml-2 p-1 hover:bg-slate-700 rounded"
                    onClick={() =>
                      setEnlargedVideo(isEnlarged ? null : info.filename)
                    }
                  >
                    {isEnlarged ? <FaCompress /> : <FaExpand />}
                  </button>
                  {/* <button
                    title="Hide Video"
                    className="ml-1 p-1 hover:bg-slate-700 rounded"
                    onClick={() => setHiddenVideos(prev => [...prev, info.filename])}
                    disabled={videosInfo.filter(v => !hiddenVideos.includes(v.filename)).length === 1}
                  >
                    <FaTimes />
                  </button> */}
                </span>
              </p>
              <video
                ref={(el) => (videoRefs.current[idx] = el)}
                className={`w-full object-contain ${
                  isEnlarged ? "min-h-0 flex-1 max-h-full max-w-full" : ""
                }`}
                src={resolvedVideoUrls[info.filename]}
                muted
                playsInline
                controls
                preload="auto"
                onPlay={(e) => handlePlay(e.currentTarget, info)}
                onTimeUpdate={isFirstVisible ? handleTimeUpdate : undefined}
              >
                Your browser does not support the video tag.
              </video>
              {videoErrors[info.filename] ? (
                <p className="mt-2 rounded-b-xl bg-red-950 px-3 py-2 text-xs text-red-200">
                  Failed to load video: {videoErrors[info.filename]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
};

function buildStreamableVideoUrl(url: string): string {
  const streamUrl = new URL(buildApiUrl(url), window.location.origin);
  const accessToken = loadStoredAccessToken();

  if (accessToken) {
    streamUrl.searchParams.set("access_token", accessToken);
  }

  return streamUrl.toString();
}

export default SimpleVideosPlayer;
