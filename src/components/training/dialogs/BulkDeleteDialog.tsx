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

interface BulkDeleteDialogProps {
  open: boolean;
  isDeleting: boolean;
  selectedCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const BulkDeleteDialog = ({
  open,
  isDeleting,
  selectedCount,
  onOpenChange,
  onConfirm,
}: BulkDeleteDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="z-[9999] border-border bg-card text-foreground">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-foreground">
          Delete Multiple Episodes?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-muted-foreground">
          Are you sure you want to delete {selectedCount} episode(s)? This
          action cannot be undone and will permanently remove all selected
          episode data.
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
          {isDeleting ? "Deleting..." : `Delete ${selectedCount} Episode(s)`}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
