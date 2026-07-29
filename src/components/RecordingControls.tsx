import { Play, Square, X } from "lucide-react";

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
  onCancel?: () => void;
  style?: RecordingControlStyle;
  embedded?: boolean;
  children?: React.ReactNode;
}

export const RecordingControls = ({
  isRecording,
  isLoading,
  onStart,
  onStop,
  onCancel,
  style = RecordingControlStyle.DEFAULT,
  embedded,
  children,
}: RecordingControlsProps) => {
  const isCompact = style === RecordingControlStyle.COMPACT;
  const containerPadding = isCompact ? "px-3 py-1" : "px-4 py-2.5";
  const gap = isCompact ? "gap-1" : "gap-3";
  const saveButtonClasses = isCompact
    ? "h-7 px-3 text-xs"
    : "h-9 px-5 text-sm";
  const cancelButtonClasses = isCompact ? "h-7 w-8" : "h-9 w-10";
  const controls = (
    <div className={`flex items-center ${gap}`}>
      {isRecording && onCancel ? (
        <div
          data-tour="record-episode"
          className="flex overflow-hidden rounded-full shadow-sm transition-all duration-200 hover:shadow-lg"
        >
          <Button
            onClick={onStop}
            disabled={isLoading}
            className={`rounded-none rounded-l-full bg-emerald-500 font-semibold uppercase tracking-wide text-white hover:bg-emerald-400 ${saveButtonClasses}`}
          >
            <Square className="h-4 w-4" />
            {isCompact ? "" : "Save Episode"}
          </Button>
          <Button
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Cancel episode"
            title="Cancel episode"
            className={`rounded-none rounded-r-full border-l border-white/25 bg-destructive p-0 text-white hover:bg-destructive/80 ${cancelButtonClasses}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          data-tour="record-episode"
          onClick={onStart}
          disabled={isLoading}
          className={`rounded-full bg-emerald-500 font-semibold uppercase tracking-wide text-white transition-all duration-200 hover:scale-105 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 ${saveButtonClasses}`}
        >
          <Play className="h-4 w-4" />
          {isCompact ? "" : "Record episode"}
        </Button>
      )}
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
