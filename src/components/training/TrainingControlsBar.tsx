import { HelpDialog } from "@/components/HelpDialog";
import { MemoriseRestorePose } from "@/components/MemoriseRestorePose";
import {
  RecordingControls,
  RecordingControlStyle,
} from "@/components/RecordingControls";

interface TrainingControlsBarProps {
  isRecording: boolean;
  isLoading: boolean;
  isDeploying: boolean;
  deployRequestPending: boolean;
  memorisedPose: { topics: Record<string, unknown> } | null;
  poseLoading: boolean;
  isRestoring: boolean;
  onStart: () => void;
  onStop: () => void;
  onRewind: () => void;
  onDeploy: () => void;
  onMemorise: () => void;
  onRestore: () => void;
  onClear: () => void;
}

export function TrainingControlsBar({
  isRecording,
  isLoading,
  isDeploying,
  deployRequestPending,
  memorisedPose,
  poseLoading,
  isRestoring,
  onStart,
  onStop,
  onMemorise,
  onRestore,
  onClear,
}: TrainingControlsBarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/95 px-3 py-2 shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur dark:shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
      <RecordingControls
        isRecording={isRecording}
        isLoading={isLoading}
        isDeploying={isDeploying}
        isDeployingRequest={deployRequestPending}
        onStart={onStart}
        onStop={onStop}
        style={RecordingControlStyle.DEFAULT}
        embedded
      />
      {/* <div className="h-7 w-px bg-border" /> */}
      <MemoriseRestorePose
        memorisedPose={memorisedPose}
        isLoading={poseLoading}
        isRestoring={isRestoring}
        isCompact={false}
        onMemorise={onMemorise}
        onRestore={onRestore}
        onClear={onClear}
      />
      {/* <div className="h-7 w-px bg-border" /> */}
      <HelpDialog
        inline
        className="h-7 px-3 text-xs font-semibold uppercase tracking-wide"
      >
        Help
      </HelpDialog>
    </div>
  );
}
