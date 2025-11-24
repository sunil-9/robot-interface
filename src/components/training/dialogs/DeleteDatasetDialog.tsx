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
}

export const DeleteDatasetDialog = ({
  open,
  isDeleting,
  datasetName,
  episodesPreview,
  onOpenChange,
  onConfirm,
}: DeleteDatasetDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="z-[9999] max-w-lg border-gray-700 bg-gray-900">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-white">
          {datasetName ? `Delete Dataset "${datasetName}"?` : "Delete Dataset?"}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-gray-400">
          {episodesPreview.length > 0 ? (
            <Fragment>
              <p className="mb-3">
                This dataset contains {episodesPreview.length} episode(s):
              </p>
              <ul className="mb-3 max-h-32 space-y-1 overflow-y-auto rounded bg-gray-800/50 p-2 text-sm">
                {episodesPreview.slice(0, 5).map((episode) => (
                  <li key={episode.episode_index} className="text-gray-300">
                    • Episode {episode.episode_index} (
                    {episode.duration.toString()} seconds) created at{" "}
                    {new Date(episode.created_at).toLocaleString()}
                  </li>
                ))}
                {episodesPreview.length > 5 && (
                  <li className="italic text-gray-400">
                    ... and {episodesPreview.length - 5} more episode(s)
                  </li>
                )}
              </ul>
              <p className="font-medium text-red-400">
                Are you sure? This action cannot be undone and will permanently
                delete the dataset and all its episodes.
              </p>
            </Fragment>
          ) : (
            <p className="font-medium text-red-400">
              Are you sure you want to delete this dataset? This action cannot
              be undone.
            </p>
          )}
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
          {isDeleting ? "Deleting..." : "Delete Dataset"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
