import { DatabaseBackup, Play, RotateCcw, Square } from "lucide-react";

import { Button } from "./ui/button";

export enum RecordingControlStyle {
  DEFAULT = "default",
  COMPACT = "compact",
}

interface RecordingControlsProps {
  isRecording: boolean;
  isLoading: boolean;
  currentEpisodeId: string | null;
  onStart: () => void;
  onStop: () => void;
  onRewind: () => void;
  onDeploy: () => void;
  style?: RecordingControlStyle;
}

export const RecordingControls = ({
  isRecording,
  isLoading,
  currentEpisodeId,
  onStart,
  onStop,
  onRewind,
  onDeploy,
  style = RecordingControlStyle.DEFAULT,
}: RecordingControlsProps) => {
  const isCompact = style === RecordingControlStyle.COMPACT;
  const containerPadding = isCompact ? "px-3 py-2" : "px-4 py-2.5";
  const gap = isCompact ? "gap-2.5" : "gap-3";
  const buttonPadding = isCompact ? "px-4" : "px-5";
  const iconSize = isCompact ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = isCompact ? "text-sm" : "text-base";

  return (
    <div className={`pointer-events-none ${isCompact ? "px-3 py-2" : "fixed bottom-6 left-1/2 z-40  -translate-x-1/2"}  `}>
      <div
        className={`pointer-events-auto flex items-center ${gap} rounded-full border border-border bg-card ${containerPadding} shadow-[0_18px_45px_rgba(15,23,42,0.2)] backdrop-blur dark:shadow-[0_18px_45px_rgba(0,0,0,0.4)]`}
      >
        <Button
          onClick={isRecording ? onStop : onStart}
          disabled={isLoading}
          className={`rounded-full ${buttonPadding} ${
            isRecording
              ? "bg-destructive hover:bg-destructive/90"
              : "bg-emerald-500 hover:bg-emerald-600"
          } text-white shadow-sm ${textSize} ${isCompact ? "p-2 gap-0 h-7" : ""} `}
        >
          {isRecording ? (
            <Square className={`mr-2 ${iconSize}`} />
          ) : (
            <Play className={`mr-2 ${iconSize}`} />
          )}
          {isRecording ? "End" : "Start"}
        </Button>

        <Button
          onClick={onRewind}
          disabled={isLoading || !currentEpisodeId}
          variant="outline"
          className={`rounded-full border-border bg-muted text-foreground hover:bg-muted/80 ${textSize} ${isCompact ? "p-2 gap-0 h-7" : ""}`}
        >
          <RotateCcw className={`mr-2 ${iconSize}`} />
          Rewind
        </Button>
        <Button
          onClick={onDeploy}
          variant="outline"
          className={`rounded-full border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 ${textSize} ${isCompact ? "p-2 gap-0 h-7" : ""}`}
        >
          <DatabaseBackup className={`mr-2 ${iconSize}`} />
          Deploy
        </Button>
      </div>
    </div>
  );
};
