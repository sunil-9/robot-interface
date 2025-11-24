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

interface DatasetSelectorProps {
  datasets: string[];
  selectedDataset: string;
  isLoading: boolean;
  onSelect: (dataset: string) => void;
  onRequestCreate: () => void;
  onRequestDelete: (dataset: string) => void;
}

const CREATE_NEW_VALUE = "__create_new__";

export const DatasetSelector = ({
  datasets,
  selectedDataset,
  isLoading,
  onSelect,
  onRequestCreate,
  onRequestDelete,
}: DatasetSelectorProps) => {
  const handleValueChange = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      onRequestCreate();
      return;
    }
    onSelect(value);
  };

  return (
    <div className="border-b border-gray-800 p-4">
      <Label
        htmlFor="dataset-select"
        className="mb-2 block text-sm font-medium text-gray-300"
      >
        Dataset
      </Label>
      <div className="flex gap-2">
        <Select
          value={selectedDataset}
          onValueChange={handleValueChange}
          disabled={isLoading}
        >
          <SelectTrigger
            id="dataset-select"
            className="flex-1 border-gray-700 bg-gray-800 text-white"
          >
            <SelectValue
              placeholder={
                isLoading ? "Loading datasets..." : "Select a dataset"
              }
            />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-800">
            {datasets.map((dataset) => (
              <div
                key={dataset}
                className="group flex items-center justify-between hover:bg-gray-700"
              >
                <SelectItem
                  value={dataset}
                  className="flex-1 text-white focus:bg-gray-700"
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
                  className="h-8 w-8 p-0 text-red-400 opacity-0 transition-opacity hover:bg-red-900/20 hover:text-red-300 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <SelectItem
              value={CREATE_NEW_VALUE}
              className="text-green-400 focus:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4" />
                <span>Create New Dataset</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {selectedDataset && (
        <>
          <p className="mt-2 text-xs text-gray-400">
            Episodes will be saved to:{" "}
            <span className="text-purple-300">{selectedDataset}</span>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Minimum of <span className="text-purple-300">10 episodes</span>{" "}
            required to start training.
          </p>{" "}
        </>
      )}
    </div>
  );
};
