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
  onCancel: () => void;
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
  onCancel,
  onMemorise,
  onRestore,
  onDeletePose,
  onRenamePose,
}: TrainingControlsBarProps) {
  return (
    <div className="operator-surface fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-lg px-2.5 py-2">
      <RecordingControls
        isRecording={isRecording}
        isLoading={isLoading}
        isDeploying={isDeploying}
        isDeployingRequest={deployRequestPending}
        onStart={onStart}
        onStop={onStop}
        onCancel={onCancel}
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
        className="h-9 px-4 font-mono text-xs font-bold uppercase tracking-[0.08em]"
      >
        Help
      </HelpDialog>
    </div>
  );
}
