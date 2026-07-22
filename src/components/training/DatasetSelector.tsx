import { Copy, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { type DatasetListItem } from "@/lib/api";

interface DatasetSelectorProps {
  datasets: string[];
  datasetItems: DatasetListItem[];
  isLoading: boolean;
  onRequestCreate: () => void;
  onRequestClone: (dataset: string) => void;
  onRequestDelete: (dataset: string) => void;
  onDatasetSave: (
    datasetId: string | number,
    name: string,
    description: string,
  ) => Promise<void>;
}

const CREATE_NEW_VALUE = "__create_new__";

export const DatasetSelector = ({
  datasets,
  datasetItems,
  isLoading,
  onRequestCreate,
  onRequestClone,
  onRequestDelete,
  onDatasetSave,
}: DatasetSelectorProps) => {
  const { selectedDataset, setSelectedDataset } = useEpisodeControlContext();
  const datasetItemByName = new Map(
    datasetItems.map((item) => [item.name, item]),
  );
  const selectedDatasetItem = datasetItemByName.get(selectedDataset) ?? null;
  const selectedDatasetDescription =
    selectedDatasetItem?.description?.trim() ?? "";
  const [selectOpen, setSelectOpen] = useState(false);
  const [datasetToEdit, setDatasetToEdit] = useState<DatasetListItem | null>(
    null,
  );
  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleValueChange = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      onRequestCreate();
      return;
    }
    setSelectedDataset(value);
  };

  const handleStartEdit = (dataset: string) => {
    const item = datasetItemByName.get(dataset);
    if (!item) {
      return;
    }

    setSelectOpen(false);
    setDatasetToEdit(item);
    setNameDraft(item.name);
    setDescriptionDraft(item.description?.trim() ?? "");
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setDatasetToEdit(null);
    setEditError(null);
  };

  const handleSaveDataset = async () => {
    if (!datasetToEdit || !nameDraft.trim()) {
      setEditError("Dataset name is required.");
      return;
    }

    const normalizedName = nameDraft.trim();
    const normalizedDescription = descriptionDraft.trim();
    if (
      normalizedName === datasetToEdit.name &&
      normalizedDescription === (datasetToEdit.description?.trim() ?? "")
    ) {
      toast({
        title: "Nothing to update",
        description: "The dataset name and description have not changed.",
      });
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      await onDatasetSave(
        datasetToEdit.id,
        normalizedName,
        normalizedDescription,
      );
      setDatasetToEdit(null);
      setEditError(null);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Failed to update dataset.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-b border-border bg-card p-4 rounded-xl ">
      <div className="flex gap-2 items-center justify-between ">
        <Label
          htmlFor="dataset-select"
          className="mb-2 block text-sm font-medium text-foreground pt-2"
        >
          Dataset
        </Label>
        <Select
          open={selectOpen}
          onOpenChange={setSelectOpen}
          value={selectedDataset}
          onValueChange={handleValueChange}
          disabled={isLoading}
        >
          <SelectTrigger
            id="dataset-select"
            className="flex-1 border-border bg-background text-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
          >
            <SelectValue
              placeholder={
                isLoading ? "Loading datasets..." : "Select a dataset"
              }
            />
          </SelectTrigger>
          <SelectContent className="border-border bg-card shadow-xl">
            {datasets.map((dataset) => {
              const description =
                datasetItemByName.get(dataset)?.description?.trim() ?? "";

              return (
                <div
                  key={dataset}
                  className="group flex items-center justify-between hover:bg-muted/60"
                >
                  <SelectItem
                    value={dataset}
                    textValue={dataset}
                    className="flex-1 text-foreground focus:bg-muted"
                  >
                    <div className="min-w-0 py-1">
                      <div className="truncate font-medium">{dataset}</div>
                    </div>
                  </SelectItem>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleStartEdit(dataset);
                    }}
                    className="group cursor-pointer rounded-md bg-transparent px-3 py-2 text-primary transition-all duration-200 hover:bg-primary/10 hover:text-primary focus:bg-primary/15 focus:text-primary focus:outline-none dark:hover:bg-primary/20 dark:focus:bg-primary/25"
                    aria-label={`Edit dataset ${dataset}`}
                    title="Edit dataset"
                  >
                    <Pencil className="h-4 w-4 group-hover:scale-110" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      onRequestClone(dataset);
                    }}
                    className="group cursor-pointer rounded-md bg-transparent px-3 py-2 text-primary transition-all duration-200 hover:bg-primary/10 hover:text-primary focus:bg-primary/15 focus:text-primary focus:outline-none dark:hover:bg-primary/20 dark:focus:bg-primary/25"
                    aria-label={`Clone dataset ${dataset}`}
                    title="Clone dataset"
                  >
                    <Copy className="h-4 w-4 group-hover:scale-110" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPointerDown={(event) => {
                      // Prevent the select from closing before we handle delete.
                      event.preventDefault();
                      event.stopPropagation();

                      onRequestDelete(dataset);
                    }}
                    className="group cursor-pointer rounded-md px-3 py-2 transition-all  duration-200   text-primary  bg-transparent   hover:bg-primary/10  hover:text-primary   focus:bg-primary/15  focus:text-primary  focus:outline-none   data-[state=checked]:bg-primary/15  data-[state=checked]:text-primary   dark:hover:bg-primary/20  dark:focus:bg-primary/25  dark:data-[state=checked]:bg-primary/25 "
                    aria-label={`Delete dataset ${dataset}`}
                    title="Delete dataset"
                  >
                    <Trash2 className="h-4 w-4 group-hover:scale-110" />
                  </Button>
                </div>
              );
            })}
            <SelectItem
              value={CREATE_NEW_VALUE}
              className=" group cursor-pointer rounded-md px-3 py-2 transition-all  duration-200   text-primary  bg-transparent   hover:bg-primary/10  hover:text-primary   focus:bg-primary/15  focus:text-primary  focus:outline-none   data-[state=checked]:bg-primary/15  data-[state=checked]:text-primary   dark:hover:bg-primary/20  dark:focus:bg-primary/25  dark:data-[state=checked]:bg-primary/25"
            >
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-primary transition-transform duration-200 group-hover:scale-110" />
                <span className="font-medium">Create New Dataset</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {selectedDataset && (
        <>
          <div className="mt-2 flex items-start gap-2">
            <p className="line-clamp-2 flex-1 text-xs text-muted-foreground">
              {selectedDatasetDescription || "No description"}
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Episodes will be saved to:{" "}
            <span className="text-primary">{selectedDataset}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Minimum of <span className="text-primary">10 episodes</span>{" "}
            required to start training.
          </p>{" "}
        </>
      )}

      <Dialog
        open={datasetToEdit !== null}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            handleCancelEdit();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveDataset();
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit dataset</DialogTitle>
              <DialogDescription>
                Update the dataset name and description.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="edit-dataset-name">Name</Label>
              <Input
                id="edit-dataset-name"
                autoFocus
                value={nameDraft}
                onChange={(event) => {
                  setNameDraft(event.target.value);
                  setEditError(null);
                }}
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-dataset-description">Description</Label>
              <Textarea
                id="edit-dataset-description"
                value={descriptionDraft}
                onChange={(event) => {
                  setDescriptionDraft(event.target.value);
                  setEditError(null);
                }}
                disabled={isSaving}
                rows={4}
              />
            </div>
            {editError ? (
              <p className="text-sm text-destructive">{editError}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !nameDraft.trim()}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
