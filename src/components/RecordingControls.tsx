import { Play, Rocket, RotateCcw, Square } from "lucide-react";

import { Button } from "./ui/button";

export enum RecordingControlStyle {
  DEFAULT = "default",
  COMPACT = "compact",
}

interface RecordingControlsProps {
  isRecording: boolean;
  isLoading: boolean;
  currentEpisodeId: string | null;
  isDeploying?: boolean;
  isDeployingRequest?: boolean;
  onStart: () => void;
  onStop: () => void;
  onRewind: () => void;
  onDeploy: () => void;
  style?: RecordingControlStyle;
  children?: React.ReactNode;
}

export const RecordingControls = ({
  isRecording,
  isLoading,
  currentEpisodeId,
  isDeploying = false,
  isDeployingRequest = false,
  onStart,
  onStop,
  onRewind,
  onDeploy,
  style = RecordingControlStyle.DEFAULT,
  children,
}: RecordingControlsProps) => {
  const isCompact = style === RecordingControlStyle.COMPACT;
  const containerPadding = isCompact ? "px-3 py-1" : "px-4 py-2.5";
  const gap = isCompact ? "gap-3" : "gap-3";
  const buttonPadding = isCompact ? "px-0.5" : "px-5";
  const iconSize = isCompact ? "" : "h-4 w-4";
  const textSize = isCompact ? "text-l" : "text-base";
  const iconMargin = isCompact ? "mr-1" : "mr-2";

  return (
    <div
      className={`pointer-events-none  ${
        isCompact
          ? "px-2 py-2"
          : "fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
      }`}
    >
      <div
        className={`pointer-events-auto  flex items-center ${gap} rounded-xl border border-border bg-card ${containerPadding} shadow-[0_18px_45px_rgba(15,23,42,0.2)] backdrop-blur dark:shadow-[0_18px_45px_rgba(0,0,0,0.4)]`}
      >
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
          {isRecording ? "Stop" : "Start"}
        </Button>

        <Button
          onClick={onRewind}
          variant="ghost"
          className={`rounded-full font-semibold uppercase tracking-wide bg-slate-600 text-slate-200 border-0 transition-all duration-200 hover:bg-slate-500 hover:text-white hover:shadow-lg hover:shadow-slate-600/25 hover:scale-105 ${
            isCompact ? "px-3 h-7 text-xs" : "px-5 h-9 text-sm"
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          Rewind
        </Button>
        <Button
          onClick={onDeploy}
          disabled={isLoading || isDeployingRequest}
          className={`rounded-full font-semibold uppercase tracking-wide border-0 transition-all duration-200 ${
            isDeploying
              ? "bg-amber-500 text-white hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-105"
              : "bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-lg hover:shadow-primary/30 hover:scale-105"
          } ${isCompact ? "px-3 h-7 text-xs" : "px-5 h-9 text-sm"}`}
        >
          <Rocket className="h-4 w-4" />
          {isDeploying ? "Stop" : "Deploy"}
        </Button>
        {children}
      </div>
    </div>
  );
};
