"use client";

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
  const [videoErrors, setVideoErrors] = React.useState<Record<string, string>>(
    {},
  );
  const readyCalledRef = useRef(false);

  const firstVisibleIdx = videosInfo.findIndex(
    (video) => !hiddenVideos.includes(video.filename),
  );

  // Initialize video refs array
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, videosInfo.length);
  }, [videosInfo.length]);

  // Handle videos ready
  useEffect(() => {
    if (videosInfo.length === 0) {
      // No videos, mark as ready immediately
      if (onVideosReady && !readyCalledRef.current) {
        readyCalledRef.current = true;
        setVideosReady(true);
        onVideosReady();
      }
      return;
    }

    const readyState = new Set<number>();

    const markReady = () => {
      if (readyCalledRef.current) return;
      readyCalledRef.current = true;
      setVideosReady(true);
      if (onVideosReady) {
        onVideosReady();
      }
      setIsPlaying(true);
    };

    const checkReady = (index: number) => {
      readyState.add(index);
      // Mark ready when all videos have loaded or errored
      if (readyState.size >= videosInfo.length) {
        markReady();
      }
    };

    // Timeout fallback - don't wait forever for videos (15 seconds for larger videos)
    const timeout = setTimeout(() => {
      console.warn("Video loading timeout - proceeding anyway");
      markReady();
    }, 15000); // 15 second timeout for larger videos

    videoRefs.current.forEach((video, index) => {
      if (video) {
        const info = videosInfo[index];

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
          setVideoErrors((prev) => ({
            ...prev,
            [info.filename]: errorMessage,
          }));
          checkReady(index);
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
            checkReady(index);
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
          const handleLoaded = () => checkReady(index);

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
      clearTimeout(timeout);
      videoRefs.current.forEach((video) => {
        if (video && (video as any)._segmentHandlers) {
          (video as any)._segmentHandlers();
        }
      });
    };
  }, [
    videosInfo,
    onVideosReady,
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

        if (Math.abs(video.currentTime - targetTime) > 0.2) {
          video.currentTime = targetTime;
        }
      }
    });
  }, [currentTime, videosInfo, videosReady, hiddenVideos]);

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
                  ? "z-40 fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center"
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
                  isEnlarged ? "max-h-[90vh] max-w-[90vw]" : ""
                }`}
                muted
                playsInline
                controls
                preload="auto"
                onPlay={(e) => handlePlay(e.currentTarget, info)}
                onTimeUpdate={isFirstVisible ? handleTimeUpdate : undefined}
              >
                <source src={info.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default SimpleVideosPlayer;
