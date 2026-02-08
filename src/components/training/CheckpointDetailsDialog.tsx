import { FileText, FolderOpen, HardDrive, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import * as trainingApi from "@/services/trainingApi";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CheckpointDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string | null;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const CheckpointDetailsDialog = ({
  open,
  onOpenChange,
  datasetId,
}: CheckpointDetailsDialogProps) => {
  const [details, setDetails] = useState<trainingApi.CheckpointDetails | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !datasetId) {
      setDetails(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const loadDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await trainingApi.fetchCheckpointDetails(datasetId);
        if (cancelled) return;
        if (result.details) {
          setDetails(result.details);
        } else {
          setError(result.message ?? "Failed to load checkpoint details");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load checkpoint details",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [open, datasetId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Checkpoint Details
          </DialogTitle>
          <DialogDescription>
            {datasetId ? `Dataset: ${datasetId}` : "No dataset selected"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading checkpoints...
            </span>
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-destructive">{error}</div>
        )}

        {!isLoading && !error && details && (
          <ScrollArea className="max-h-[60vh] pr-4">
            {details.checkpoints.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No checkpoints available for this dataset</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {details.checkpoints
                  .sort((a, b) => b.step - a.step) // Sort by step descending (latest first)
                  .map((checkpoint) => (
                    <AccordionItem
                      key={checkpoint.step}
                      value={`step-${checkpoint.step}`}
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              Step {checkpoint.step.toLocaleString()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(checkpoint.modified_at)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-primary">
                            {formatFileSize(checkpoint.total_size)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          <div className="text-xs text-muted-foreground font-mono break-all bg-muted/50 p-2 rounded">
                            {checkpoint.path}
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Files ({checkpoint.files.length})
                            </span>
                            <div className="grid gap-1">
                              {checkpoint.files.map((file) => (
                                <div
                                  key={file.name}
                                  className={cn(
                                    "flex items-center justify-between",
                                    "text-sm py-1.5 px-2 rounded",
                                    "bg-muted/30 hover:bg-muted/50 transition-colors",
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-mono text-xs">
                                      {file.name}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
