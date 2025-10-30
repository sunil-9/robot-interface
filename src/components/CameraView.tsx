import { Card } from "@/components/ui/card";
import clsx from "clsx";
import { Camera, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";

interface CameraViewProps {
  title: string;
  stream: MediaStream | null;
  fallbackImage?: string | null;
  isConnected?: boolean;
  showTitle?: boolean;
  className?: string;
  position?: "main" | "right" | "left" | "extra";
}

export const CameraView = ({
  title,
  stream,
  fallbackImage = null,
  isConnected = false,
  showTitle = true,
  className,
  position = "main",
}: CameraViewProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    if (stream) {
      if (element.srcObject !== stream) {
        element.srcObject = stream;
      }
      const play = element.play();
      if (play) {
        play.catch((error) => {
          console.warn("Failed to autoplay remote stream", error);
        });
      }
    } else {
      element.pause();
      element.srcObject = null;
    }

    return () => {
      if (!element) {
        return;
      }
      try {
        element.pause();
      } catch {
        // ignore pause errors
      }
      element.srcObject = null;
    };
  }, [stream]);

  const hasVideo = Boolean(stream);
  const hasFallback = Boolean(fallbackImage);

  return (
    <Card
      className={clsx(
        "relative h-full w-full overflow-hidden bg-black",
        className
      )}
    >
      <div
        className={`relative flex h-full w-full ${
          position === "main"
            ? "items-center justify-center"
            : position === "right"
            ? "items-start justify-end"
            : ""
        } bg-black`}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            className={`${
              position === "main" ? "h-full w-full " + position : "h-[370px]"
            } object-cover`}
            muted
            playsInline
          />
        ) : hasFallback ? (
          <img
            src={fallbackImage ?? undefined}
            alt={title}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Camera className="h-8 w-8" />
            <span className="text-xs uppercase tracking-wide">
              Waiting for stream
            </span>
          </div>
        )}

        {showTitle && (
          <div className={`absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent px-3 py-2 text-xs text-white ${
          position === "main"
            ? "items-center justify-center"
            : position === "right"
            ? "items-start justify-end"
            : ""
        }`}>
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent px-3 py-2 text-xs text-white ">
              <span className="font-medium tracking-wide">{title}</span>
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-green-400" />
                ) : (
                  <WifiOff className="h-3 w-3 text-yellow-400" />
                )}
                {isConnected ? "Connected" : "Waiting"}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
