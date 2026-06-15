import { Check, Copy, FolderPlus, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { type DatasetListItem } from "@/lib/api";

interface DatasetSelectorProps {
  datasets: string[];
  datasetItems: DatasetListItem[];
  isLoading: boolean;
  onRequestCreate: () => void;
  onRequestClone: (dataset: string) => void;
  onRequestDelete: (dataset: string) => void;
  onDescriptionSave: (
    datasetId: string | number,
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
  onDescriptionSave,
}: DatasetSelectorProps) => {
  const { selectedDataset, setSelectedDataset } = useEpisodeControlContext();
  const datasetItemByName = new Map(
    datasetItems.map((item) => [item.name, item]),
  );
  const selectedDatasetItem = datasetItemByName.get(selectedDataset) ?? null;
  const selectedDatasetDescription =
    selectedDatasetItem?.description?.trim() ?? "";
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  useEffect(() => {
    setDescriptionDraft(selectedDatasetDescription);
    setIsEditingDescription(false);
  }, [selectedDataset, selectedDatasetDescription]);

  const handleValueChange = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      onRequestCreate();
      return;
    }
    setSelectedDataset(value);
  };

  const handleSaveDescription = async () => {
    if (!selectedDatasetItem) {
      return;
    }

    setIsSavingDescription(true);
    try {
      await onDescriptionSave(selectedDatasetItem.id, descriptionDraft.trim());
      setIsEditingDescription(false);
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleCancelDescription = () => {
    setDescriptionDraft(selectedDatasetDescription);
    setIsEditingDescription(false);
  };

  return (
    <div className="border-b border-border bg-card p-4 ">
      <div className="flex gap-2 items-center justify-between ">
        <Label
          htmlFor="dataset-select"
          className="mb-2 block text-sm font-medium text-foreground pt-2"
        >
          Dataset
        </Label>
        <Select
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
            {isEditingDescription ? (
              <Input
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSaveDescription();
                  }
                  if (event.key === "Escape") {
                    handleCancelDescription();
                  }
                }}
                placeholder="Add dataset description"
                disabled={isSavingDescription}
                className="h-8 flex-1 border-border bg-background text-xs text-foreground"
              />
            ) : (
              <p className="line-clamp-2 flex-1 text-xs text-muted-foreground">
                {selectedDatasetDescription || "No description"}
              </p>
            )}
            {isEditingDescription ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelDescription}
                  disabled={isSavingDescription}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Cancel description edit"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleSaveDescription()}
                  disabled={isSavingDescription}
                  className="h-8 w-8 text-primary hover:text-primary"
                  aria-label="Save description"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsEditingDescription(true)}
                disabled={!selectedDatasetItem}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Edit description"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
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
    </div>
  );
};
