import {
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { type MemorisedPose } from "@/types/pose";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "./ui/use-toast";

interface MemoriseRestorePoseProps {
  memorisedPoses: MemorisedPose[];
  isLoading: boolean;
  restoringPoseId: string | null;
  onMemorise: (name?: string) => Promise<boolean>;
  onRestore: (poseId: string) => Promise<boolean>;
  onDeletePose: (poseId: string) => Promise<boolean>;
  onRenamePose: (poseId: string, name: string) => Promise<boolean>;
}

export const MemoriseRestorePose = ({
  memorisedPoses,
  isLoading,
  restoringPoseId,
  onMemorise,
  onRestore,
  onDeletePose,
  onRenamePose,
}: MemoriseRestorePoseProps) => {
  const panelTitleId = useId();
  const [open, setOpen] = useState(false);
  const [newPoseName, setNewPoseName] = useState("");
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [editingPoseId, setEditingPoseId] = useState<string | null>(null);
  const skipCommitRef = useRef<Set<string>>(new Set());
  const pendingMemorisePoseIdsRef = useRef<Set<string> | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const serverActionPending = isLoading || restoringPoseId !== null;
  const otherActionsDisabled = serverActionPending || editingPoseId !== null;

  useEffect(() => {
    setDraftNames(
      Object.fromEntries(memorisedPoses.map((pose) => [pose.id, pose.name])),
    );

    const poseIdsBeforeMemorise = pendingMemorisePoseIdsRef.current;
    if (
      poseIdsBeforeMemorise &&
      memorisedPoses.some((pose) => !poseIdsBeforeMemorise.has(pose.id))
    ) {
      pendingMemorisePoseIdsRef.current = null;
      setNewPoseName("");
    }
  }, [memorisedPoses]);

  useEffect(() => {
    if (!editingPoseId) {
      return;
    }
    inputRefs.current[editingPoseId]?.focus();
    inputRefs.current[editingPoseId]?.select();
  }, [editingPoseId]);

  const startRename = (pose: MemorisedPose) => {
    skipCommitRef.current.delete(pose.id);
    setDraftNames((current) => ({ ...current, [pose.id]: pose.name }));
    setEditingPoseId(pose.id);
  };

  const cancelRename = (pose: MemorisedPose) => {
    skipCommitRef.current.add(pose.id);
    setDraftNames((current) => ({ ...current, [pose.id]: pose.name }));
    setEditingPoseId(null);
  };

  const commitRename = (pose: MemorisedPose) => {
    if (skipCommitRef.current.delete(pose.id)) {
      return;
    }

    const nextName = (draftNames[pose.id] ?? pose.name).trim();
    if (!nextName) {
      setDraftNames((current) => ({ ...current, [pose.id]: pose.name }));
      setEditingPoseId(null);
      toast({
        title: "Pose name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setEditingPoseId(null);
    if (nextName === pose.name) {
      return;
    }

    void onRenamePose(pose.id, nextName).then((success) => {
      if (!success) {
        setDraftNames((current) => ({ ...current, [pose.id]: pose.name }));
      }
    });
  };

  const handleNameKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    pose: MemorisedPose,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename(pose);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelRename(pose);
    }
  };

  const handleMemorise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const existingPoseIds = new Set(memorisedPoses.map((pose) => pose.id));
    const success = await onMemorise(newPoseName.trim() || undefined);
    if (success) {
      pendingMemorisePoseIdsRef.current = existingPoseIds;
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setEditingPoseId(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={`Open memorised poses (${memorisedPoses.length})`}
          aria-expanded={open}
          className="h-9 rounded border border-secondary bg-secondary/20 px-4 font-mono text-xs font-bold uppercase tracking-[0.08em] text-secondary-foreground transition-colors hover:bg-secondary/30"
        >
          <MapPin className="h-4 w-4" />
          Poses
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        aria-labelledby={panelTitleId}
        className="w-[min(26rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        <div className="border-b border-border px-4 py-3">
          <h2 id={panelTitleId} className="text-sm font-semibold">
            Memorised poses
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Restore, rename, or remove a saved robot pose.
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {isLoading && memorisedPoses.length === 0 ? (
            <div
              className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading poses…
            </div>
          ) : memorisedPoses.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No memorised poses yet
            </div>
          ) : (
            <div className="space-y-1">
              {memorisedPoses.map((pose) => {
                const isRestoring = restoringPoseId === pose.id;
                return (
                  <div
                    key={pose.id}
                    className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_2.25rem] items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted/60"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Restore ${pose.name}`}
                      title={`Restore ${pose.name}`}
                      disabled={otherActionsDisabled}
                      onClick={() => void onRestore(pose.id)}
                      className="h-9 w-9 rounded text-secondary-foreground hover:bg-secondary/20 hover:text-secondary-foreground"
                    >
                      {isRestoring ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>

                    {editingPoseId === pose.id ? (
                      <Input
                        ref={(input) => {
                          inputRefs.current[pose.id] = input;
                        }}
                        value={draftNames[pose.id] ?? pose.name}
                        aria-label={`Rename ${pose.name}`}
                        disabled={serverActionPending}
                        onChange={(event) =>
                          setDraftNames((current) => ({
                            ...current,
                            [pose.id]: event.target.value,
                          }))
                        }
                        onBlur={() => commitRename(pose)}
                        onKeyDown={(event) => handleNameKeyDown(event, pose)}
                        className="h-9 min-w-0 px-2 text-sm font-medium"
                      />
                    ) : (
                      <span
                        className="min-w-0 truncate px-2 text-sm font-medium"
                        title={pose.name}
                      >
                        {pose.name}
                      </span>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        editingPoseId === pose.id
                          ? `Save name for ${pose.name}`
                          : `Rename ${pose.name}`
                      }
                      title={
                        editingPoseId === pose.id ? "Save name" : "Rename pose"
                      }
                      disabled={
                        serverActionPending ||
                        (editingPoseId !== null && editingPoseId !== pose.id)
                      }
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        editingPoseId === pose.id
                          ? commitRename(pose)
                          : startRename(pose)
                      }
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    >
                      {editingPoseId === pose.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Pencil className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${pose.name}`}
                      title={`Delete ${pose.name}`}
                      disabled={otherActionsDisabled}
                      onClick={() => void onDeletePose(pose.id)}
                      className="h-9 w-9 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => void handleMemorise(event)}
          className="flex items-center gap-2 border-t border-border bg-muted/30 p-3"
        >
          <label htmlFor="new-pose-name" className="sr-only">
            New pose name
          </label>
          <Input
            id="new-pose-name"
            value={newPoseName}
            onChange={(event) => setNewPoseName(event.target.value)}
            placeholder="New pose name (optional)"
            autoComplete="off"
            disabled={otherActionsDisabled}
            className="h-9 min-w-0"
          />
          <Button
            type="submit"
            disabled={otherActionsDisabled}
            className="h-9 shrink-0 bg-violet-600 px-3 text-white hover:bg-violet-500"
          >
            <MapPin className="h-4 w-4" />
            Memorise
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};
