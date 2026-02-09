import { FolderPlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";

interface DatasetSelectorProps {
  datasets: string[];
  isLoading: boolean;
  onRequestCreate: () => void;
  onRequestDelete: (dataset: string) => void;
}

const CREATE_NEW_VALUE = "__create_new__";

export const DatasetSelector = ({
  datasets,
  isLoading,
  onRequestCreate,
  onRequestDelete,
}: DatasetSelectorProps) => {
  const { selectedDataset, setSelectedDataset } = useEpisodeControlContext();
  const handleValueChange = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      onRequestCreate();
      return;
    }
    setSelectedDataset(value);
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
            {datasets.map((dataset) => (
              <div
                key={dataset}
                className="group flex items-center justify-between hover:bg-muted/60"
              >
                <SelectItem
                  value={dataset}
                  className="flex-1 text-foreground focus:bg-muted"
                >
                  {dataset}
                </SelectItem>
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
                >
                  <Trash2 className="h-4 w-4 group-hover:scale-110" />
                </Button>
              </div>
            ))}
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
