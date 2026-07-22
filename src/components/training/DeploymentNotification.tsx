import { CheckCircle2, Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";

const formatBytes = (bytes: number | null) => {
  if (bytes === null || bytes < 0) {
    return null;
  }
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

export function DeploymentNotification() {
  const {
    deployStatusPopupOpen,
    deployStatusMessage,
    deployProgressPercent,
    deployDownloadedBytes,
    deployTotalBytes,
    deployAvailability,
  } = useEpisodeControlContext();

  if (!deployStatusPopupOpen) {
    return null;
  }

  const isDownloading =
    Object.values(deployAvailability).includes("downloading");
  const boundedPercent =
    deployProgressPercent === null
      ? null
      : Math.max(0, Math.min(100, deployProgressPercent));
  const hasDownloadProgress =
    isDownloading &&
    (boundedPercent !== null ||
      deployDownloadedBytes !== null ||
      deployTotalBytes !== null);
  const downloadedLabel = formatBytes(deployDownloadedBytes);
  const totalLabel = formatBytes(deployTotalBytes);
  const byteDetail =
    downloadedLabel && totalLabel
      ? `${downloadedLabel} of ${totalLabel}`
      : downloadedLabel;
  const percentLabel =
    boundedPercent === null ? null : `${Math.round(boundedPercent)}%`;
  const title = hasDownloadProgress
    ? "Updating model"
    : isDownloading
    ? "Compressing model"
    : "Download complete";
  const baseMessage =
    deployStatusMessage ??
    (isDownloading
      ? "Preparing the model for deployment..."
      : "Model updated and deployed.");

  return (
    <div className="fixed bottom-4 right-4 z-[120] w-[min(calc(100vw-2rem),420px)] rounded-md border border-border bg-background p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                {title}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {baseMessage}
              </div>
            </div>
          </div>
          {hasDownloadProgress ? (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Progress value={boundedPercent ?? 0} className="h-2 flex-1" />
                {percentLabel ? (
                  <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                    {percentLabel}
                  </span>
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                )}
              </div>
              {byteDetail ? (
                <div className="text-xs text-muted-foreground">
                  {byteDetail}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
