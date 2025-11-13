import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateDatasetDialogProps {
  open: boolean;
  newDatasetName: string;
  isCreating: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CreateDatasetDialog = ({
  open,
  newDatasetName,
  isCreating,
  onOpenChange,
  onNameChange,
  onSubmit,
  onCancel,
}: CreateDatasetDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="border-gray-700 bg-gray-900 text-white">
      <DialogHeader>
        <DialogTitle>Create New Dataset</DialogTitle>
        <DialogDescription className="text-gray-400">
          Enter a name for your new dataset. This will be used to organize your
          training episodes.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="dataset-name" className="text-gray-300">
            Dataset Name
          </Label>
          <Input
            id="dataset-name"
            placeholder="my_dataset"
            value={newDatasetName}
            onChange={(event) => onNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isCreating) {
                onSubmit();
              }
            }}
            className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            disabled={isCreating}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isCreating}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isCreating || !newDatasetName.trim()}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isCreating ? "Creating..." : "Create Dataset"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
