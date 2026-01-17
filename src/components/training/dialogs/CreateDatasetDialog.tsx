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
    <DialogContent className="border-border bg-card text-foreground">
      <DialogHeader>
        <DialogTitle>Create New Dataset</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Enter a name for your new dataset. This will be used to organize your
          training episodes.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="dataset-name" className="text-foreground">
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
            className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
            disabled={isCreating}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isCreating}
          className="border-border text-foreground hover:bg-muted/60"
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isCreating || !newDatasetName.trim()}
          className="bg-primary hover:bg-primary/90"
        >
          {isCreating ? "Creating..." : "Create Dataset"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
