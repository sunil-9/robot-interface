import { Loader2, MapPin, RotateCcw, X } from "lucide-react";
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
  isRestoring: boolean;
  isCompact?: boolean;
  onMemorise: () => void;
  onRestore: () => void;
  onClear: () => void;
}

export const MemoriseRestorePose = ({
  memorisedPose,
  isLoading,
  isRestoring,
  isCompact = true,
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
        disabled={isLoading || isRestoring}
        variant="ghost"
        className={`rounded-full font-semibold uppercase tracking-wide bg-slate-600 text-slate-200 border-0 transition-all duration-200 hover:bg-slate-500 hover:text-white hover:shadow-lg hover:shadow-slate-600/25 hover:scale-105 ${btnSize}`}
      >
        <MapPin className="h-4 w-4" />
        {isCompact ? "" : "Memorise Pose"}
      </Button>
    );
  }

  // Restoring in progress — show disabled "Restoring..." button, no ✕
  if (isRestoring) {
    return (
      <Button
        disabled
        variant="ghost"
        className={`rounded-full font-semibold uppercase tracking-wide bg-violet-700 text-white border-0 opacity-80 ${btnSize}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {isCompact ? "Restoring" : "Restoring..."}
      </Button>
    );
  }

  return (
    <div className={`flex items-center overflow-hidden rounded-full border border-border bg-violet-600 ${isCompact ? "h-7" : "h-9"}`}>
      <button
        onClick={onRestore}
        disabled={isLoading}
        className={`flex items-center gap-1.5 font-semibold uppercase tracking-wide text-white transition-all duration-200 hover:bg-violet-500 disabled:opacity-50 ${isCompact ? "px-3 text-xs h-full" : "px-5 text-sm h-full"}`}
      >
        <RotateCcw className="h-4 w-4" />
        {isCompact ? "Restore" : "Restore Pose"}
      </button>

      {/* Divider */}
      <div className="w-px self-stretch bg-violet-400/60" />

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogTrigger asChild>
          <button
            disabled={isLoading}
            aria-label="Clear memorised pose"
            className={`flex items-center justify-center text-white transition-all duration-200 hover:bg-red-500 disabled:opacity-50 ${isCompact ? "w-7 h-full" : "w-9 h-full"}`}
          >
            <X className="h-4 w-4" />
          </button>
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
