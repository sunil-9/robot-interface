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
    <AlertDialogContent className="z-[9999] border-gray-700 bg-gray-900">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-white">
          Delete Episode?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-gray-400">
          Are you sure you want to delete episode {episodeLabel}? This action
          cannot be undone and will permanently remove all episode data.
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
          {isDeleting ? "Deleting..." : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
