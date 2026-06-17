import { Play, Square } from "lucide-react";

import { Button } from "./ui/button";

export enum RecordingControlStyle {
  DEFAULT = "default",
  COMPACT = "compact",
}

interface RecordingControlsProps {
  isRecording: boolean;
  isLoading: boolean;
  isDeploying?: boolean;
  isDeployingRequest?: boolean;
  onStart: () => void;
  onStop: () => void;
  style?: RecordingControlStyle;
  embedded?: boolean;
  children?: React.ReactNode;
}

export const RecordingControls = ({
  isRecording,
  isLoading,
  onStart,
  onStop,
  style = RecordingControlStyle.DEFAULT,
  embedded = false,
  children,
}: RecordingControlsProps) => {
  const isCompact = style === RecordingControlStyle.COMPACT;
  const containerPadding = isCompact ? "px-3 py-1" : "px-4 py-2.5";
  const gap = isCompact ? "gap-1" : "gap-3";
  const controls = (
    <div className={`flex items-center ${gap}`}>
      <Button
        onClick={isRecording ? onStop : onStart}
        disabled={isLoading}
        className={`rounded-full font-semibold uppercase tracking-wide transition-all duration-200 ${
          isRecording
            ? "bg-destructive hover:bg-destructive/80 hover:shadow-lg hover:shadow-destructive/25 hover:scale-105"
            : "bg-emerald-500 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105"
        } text-white ${isCompact ? "px-3 h-7 text-xs" : "px-5 h-9 text-sm"}`}
      >
        {isRecording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {isCompact ? "" : isRecording ? "Stop" : "Record episode"}
      </Button>
    </div>
  );

  if (embedded) {
    return controls;
  }

  return (
    <div
      className={`pointer-events-none  ${
        isCompact
          ? "px-2 py-2"
          : "fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
      }`}
    >
      <div
        className={`pointer-events-auto flex flex-col gap-1 rounded-xl border border-border bg-card ${containerPadding} shadow-[0_18px_45px_rgba(15,23,42,0.2)] backdrop-blur dark:shadow-[0_18px_45px_rgba(0,0,0,0.4)]`}
      >
        {controls}
        {children && <div className="flex items-center">{children}</div>}
      </div>
    </div>
  );
};
