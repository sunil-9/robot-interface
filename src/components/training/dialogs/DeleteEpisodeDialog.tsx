import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteEpisodeDialogProps {
  open: boolean;
  isDeleting: boolean;
  episodeLabel: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteEpisodeDialog = ({
  open,
  isDeleting,
  episodeLabel,
  onOpenChange,
  onConfirm,
}: DeleteEpisodeDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="z-[9999] border-border bg-card text-foreground">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-foreground">
          Delete Episode?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-muted-foreground">
          Are you sure you want to delete episode {episodeLabel}? This action
          cannot be undone and will permanently remove all episode data.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          disabled={isDeleting}
          className="border-border text-foreground hover:bg-muted/60"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={isDeleting}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
