import { MapPin, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

interface MemoriseRestorePoseProps {
  memorisedPose: { topics: Record<string, unknown> } | null;
  isLoading: boolean;
  isCompact?: boolean;
  onMemorise: () => void;
  onRestore: () => void;
  onClear: () => void;
}

export const MemoriseRestorePose = ({
  memorisedPose,
  isLoading,
  isCompact = false,
  onMemorise,
  onRestore,
  onClear,
}: MemoriseRestorePoseProps) => {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const btnSize = isCompact ? "px-3 h-7 text-xs" : "px-5 h-9 text-sm";

  if (!memorisedPose) {
    return (
      <Button
        onClick={onMemorise}
        disabled={isLoading}
        variant="ghost"
        className={`rounded-full font-semibold uppercase tracking-wide bg-slate-600 text-slate-200 border-0 transition-all duration-200 hover:bg-slate-500 hover:text-white hover:shadow-lg hover:shadow-slate-600/25 hover:scale-105 ${btnSize}`}
      >
        <MapPin className="h-4 w-4" />
        Memorise Pose
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={onRestore}
        disabled={isLoading}
        variant="ghost"
        className={`rounded-full font-semibold uppercase tracking-wide bg-violet-600 text-white border-0 transition-all duration-200 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-600/25 hover:scale-105 ${btnSize}`}
      >
        <RotateCcw className="h-4 w-4" />
        Restore Pose
      </Button>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            disabled={isLoading}
            className={`rounded-full font-semibold bg-slate-600 text-slate-200 border-0 transition-all duration-200 hover:bg-red-500 hover:text-white hover:scale-105 ${isCompact ? "h-7 w-7 p-0" : "h-9 w-9 p-0"}`}
            aria-label="Clear memorised pose"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear memorised pose?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the saved pose ({Object.keys(memorisedPose.topics).length} topic(s)). You can memorise a new one at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onClear(); setClearDialogOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
