import { Play, Rocket, RotateCcw, Square } from "lucide-react";

import { HelpDialog } from "./HelpDialog";
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
  const containerPadding = isCompact ? "px-1 py-1" : "px-4 py-2.5";
  const gap = isCompact ? "gap-1" : "gap-3";
  const buttonPadding = isCompact ? "px-0.5" : "px-5";
  const iconSize = isCompact ? "" : "h-4 w-4";
  const textSize = isCompact ? "text-xs" : "text-base";
  const iconMargin = isCompact ? "mr-1" : "mr-2";

  return (
    <div
      className={`pointer-events-none ${
        isCompact
          ? "px-3 py-2"
          : "fixed bottom-6 left-1/2 z-40  -translate-x-1/2"
      }  `}
    >
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
          } text-white shadow-sm ${textSize} ${
            isCompact ? "gap-0 h-6 rounded-sm" : "rounded-full"
          }`}
        >
          {isRecording ? (
            <Square className={`${iconMargin} ${iconSize}`} />
          ) : (
            <Play className={`${iconMargin}  ${iconSize}`} />
          )}
          {isRecording ? "End" : "Start"}
        </Button>

        <Button
          onClick={onRewind}
          disabled={isLoading || !currentEpisodeId}
          variant="outline"
          className={`rounded-full border-border bg-muted text-foreground hover:bg-muted/80 ${textSize} ${
            isCompact ? "gap-0 h-6 rounded-sm" : "rounded-full"
          }`}
        >
          <RotateCcw className={`${iconMargin} ${iconSize}`} />
          Rewind
        </Button>
        <Button
          onClick={onDeploy}
          variant="outline"
          disabled={isLoading || isDeployingRequest}
          className={`border-primary/40 ${
            isDeploying
              ? "bg-amber-500 text-amber-50 hover:bg-amber-500/90"
              : "bg-primary text-primary-foreground  hover:bg-primary/90"
          } ${textSize} ${isCompact ? "px-1 gap-0 h-6 rounded-sm" : "rounded-full"}`}
        >
          <Rocket className={`${iconMargin} ${iconSize}`} />
          {isDeploying ? "Stop Deploy" : "Deploy"}
        </Button>
        <HelpDialog
          className={`border-primary/40 ${textSize} ${
            isCompact ? " gap-0 px-1 h-6 rounded-sm" : "rounded-full"
          }`}
        >
          Help
        </HelpDialog>
        {children}
      </div>
    </div>
  );
};
