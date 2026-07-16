import { HelpDialog } from "@/components/HelpDialog";
import { MemoriseRestorePose } from "@/components/MemoriseRestorePose";
import { type MemorisedPose } from "@/types/pose";
import {
  RecordingControls,
  RecordingControlStyle,
} from "@/components/RecordingControls";

interface TrainingControlsBarProps {
  isRecording: boolean;
  isLoading: boolean;
  isDeploying: boolean;
  deployRequestPending: boolean;
  memorisedPoses: MemorisedPose[];
  poseLoading: boolean;
  restoringPoseId: string | null;
  onStart: () => void;
  onStop: () => void;
  onMemorise: (name?: string) => Promise<boolean>;
  onRestore: (poseId: string) => Promise<boolean>;
  onDeletePose: (poseId: string) => Promise<boolean>;
  onRenamePose: (poseId: string, name: string) => Promise<boolean>;
}

export function TrainingControlsBar({
  isRecording,
  isLoading,
  isDeploying,
  deployRequestPending,
  memorisedPoses,
  poseLoading,
  restoringPoseId,
  onStart,
  onStop,
  onMemorise,
  onRestore,
  onDeletePose,
  onRenamePose,
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
        embedded={true}
      />
      {/* <div className="h-7 w-px bg-border" /> */}
      <div data-tour="pose-controls">
        <MemoriseRestorePose
          memorisedPoses={memorisedPoses}
          isLoading={poseLoading}
          restoringPoseId={restoringPoseId}
          onMemorise={onMemorise}
          onRestore={onRestore}
          onDeletePose={onDeletePose}
          onRenamePose={onRenamePose}
        />
      </div>
      {/* <div className="h-7 w-px bg-border" /> */}
      <HelpDialog
        inline
        className="h-9 px-5 text-sm font-semibold uppercase tracking-wide"
      >
        Help
      </HelpDialog>
    </div>
  );
}
