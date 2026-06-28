import { Fragment } from "react";

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
import type * as episodeApi from "@/services/episodeApi";

interface DeleteDatasetDialogProps {
  open: boolean;
  isDeleting: boolean;
  datasetName: string | null;
  episodesPreview: episodeApi.Episode[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDatasetLocked?: boolean;
}

export const DeleteDatasetDialog = ({
  open,
  isDeleting,
  datasetName,
  episodesPreview,
  onOpenChange,
  onConfirm,
  isDatasetLocked = false,
}: DeleteDatasetDialogProps) => (
  <AlertDialog
    open={open}
    onOpenChange={(nextOpen) => {
      if (!isDeleting) {
        onOpenChange(nextOpen);
      }
    }}
  >
    <AlertDialogContent
      className="z-[9999] max-w-lg border-border bg-card text-foreground"
      onEscapeKeyDown={(event) => {
        if (isDeleting) {
          event.preventDefault();
        }
      }}
      onPointerDownOutside={(event) => {
        if (isDeleting) {
          event.preventDefault();
        }
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle className="text-foreground">
          {datasetName ? `Delete Dataset "${datasetName}"?` : "Delete Dataset?"}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-muted-foreground">
          {episodesPreview.length > 0 ? (
            <Fragment>
              <p className="mb-3">
                This dataset contains {episodesPreview.length} episode(s):
              </p>
              <ul className="mb-3 max-h-32 space-y-1 overflow-y-auto rounded border border-border bg-muted/60 p-2 text-sm">
                {episodesPreview.slice(0, 5).map((episode) => (
                  <li key={episode.episode_index} className="text-foreground">
                    • Episode {episode.episode_index} (
                    {episode.duration.toString()} seconds) created at{" "}
                    {new Date(episode.created_at).toLocaleString()}
                  </li>
                ))}
                {episodesPreview.length > 5 && (
                  <li className="italic text-muted-foreground">
                    ... and {episodesPreview.length - 5} more episode(s)
                  </li>
                )}
              </ul>
              <p className="font-medium text-destructive">
                Are you sure? This action cannot be undone and will permanently
                delete the dataset and all its episodes.
              </p>
            </Fragment>
          ) : (
            <p className="font-medium text-destructive">
              Are you sure you want to delete this dataset? This action cannot
              be undone.
            </p>
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        {!isDeleting ? (
          <AlertDialogCancel className="border-border text-foreground hover:bg-muted/60">
            Cancel
          </AlertDialogCancel>
        ) : null}
        <AlertDialogAction
          onClick={(event) => {
            // Radix actions close automatically. Keep this controlled dialog
            // open until the async deletion closes it after completion.
            event.preventDefault();
            onConfirm();
          }}
          disabled={isDeleting || isDatasetLocked}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isDeleting
            ? "Deleting..."
            : isDatasetLocked
              ? "Dataset Processing..."
              : "Delete Dataset"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
