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
    <AlertDialogContent className="z-[9999] border-gray-700 bg-gray-900">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-white">
          Delete Multiple Episodes?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-gray-400">
          Are you sure you want to delete {selectedCount} episode(s)? This
          action cannot be undone and will permanently remove all selected
          episode data.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          disabled={isDeleting}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={isDeleting}
          className="bg-red-600 hover:bg-red-700"
        >
          {isDeleting ? "Deleting..." : `Delete ${selectedCount} Episode(s)`}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
