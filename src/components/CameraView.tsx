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

  const alignmentClasses = clsx(
    "relative flex h-full w-full bg-background",
    position === "main"
      ? "items-center justify-center"
      : position === "right"
      ? "items-start justify-end"
      : position === "left"
      ? "items-start justify-start"
      : "items-start justify-center"
  );

  const frameClasses = clsx(
    "relative flex items-center justify-center overflow-hidden bg-background",
    position === "main"
      ? "h-full w-full"
      : " w-full rounded-2xl shadow-sm",
    position === "right" || position === "left" ? "h-[170px]" : "",
    position === "extra" ? "extra" : "",
    position === "main" ? "main" : "",
    position === "right" ? "right" : "",
    position === "left" ? "left" : ""
  );

  return (
    <Card
      className={clsx(
        "relative h-full w-full overflow-hidden border-none bg-transparent shadow-none",
        className
      )}
    >
      <div className={alignmentClasses}>
        <div className={frameClasses}>
          {hasVideo ? (
            <video
              ref={videoRef}
              className="mx-auto h-full max-h-full w-auto max-w-full object-contain"
              muted
              playsInline
            />
          ) : hasFallback ? (
            <img
              src={fallbackImage}
              alt={title}
              className="mx-auto h-full max-h-full w-auto max-w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2  bg-background text-muted-foreground">
              <Camera className="h-8 w-8 text-muted-foreground/50" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide">
                Waiting for stream
              </span>
            </div>
          )}

          {showTitle && (
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur">
              <span className="font-semibold tracking-wide text-foreground">
                {title}
              </span>
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-amber-500" />
                )}
                <span
                  className={clsx(
                    isConnected
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {isConnected ? "Live" : "Waiting"}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
