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

interface CloneDatasetDialogProps {
  open: boolean;
  sourceDatasetName: string | null;
  newDatasetName: string;
  isCloning: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const CloneDatasetDialog = ({
  open,
  sourceDatasetName,
  newDatasetName,
  isCloning,
  onOpenChange,
  onNameChange,
  onSubmit,
  onCancel,
}: CloneDatasetDialogProps) => (
  <Dialog
    open={open}
    onOpenChange={(nextOpen) => {
      if (isCloning && !nextOpen) {
        return;
      }
      onOpenChange(nextOpen);
    }}
  >
    <DialogContent
      showCloseButton={!isCloning}
      onEscapeKeyDown={(event) => {
        if (isCloning) {
          event.preventDefault();
        }
      }}
      onInteractOutside={(event) => {
        if (isCloning) {
          event.preventDefault();
        }
      }}
      className="border-border bg-card text-foreground"
    >
      <DialogHeader>
        <DialogTitle>Clone Dataset</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Enter a name for the copy of "{sourceDatasetName}".
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2 py-4">
        <Label htmlFor="clone-dataset-name" className="text-foreground">
          New Dataset Name
        </Label>
        <Input
          id="clone-dataset-name"
          autoFocus
          placeholder="dataset_copy"
          value={newDatasetName}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isCloning && newDatasetName.trim()) {
              onSubmit();
            }
          }}
          disabled={isCloning}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <DialogFooter>
        {!isCloning && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={onSubmit}
          disabled={isCloning || !newDatasetName.trim()}
          className="bg-primary hover:bg-primary/90"
        >
          {isCloning ? "Cloning..." : "Clone Dataset"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
