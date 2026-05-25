import { useAuthSession } from "@/hooks/useAuthSession";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { useModeContext } from "@/hooks/useModeContext";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useTrainingCameraLayout,
  type CameraSlot,
} from "@/hooks/useTrainingCameraLayout";
import { useTrainingDatasetEpisodes } from "@/hooks/useTrainingDatasetEpisodes";
import { useTrainingTelemetry } from "@/hooks/useTrainingTelemetry";
import { ActionVarianceChart } from "./ActionVarianceChart";
import { CameraView } from "./CameraView";
import { SidebarTabs, type SidebarTab } from "./SidebarTabs";
import { CreateDatasetDialog } from "./training/dialogs/CreateDatasetDialog";
import { DeleteDatasetDialog } from "./training/dialogs/DeleteDatasetDialog";
import { DeleteEpisodeDialog } from "./training/dialogs/DeleteEpisodeDialog";
import { useEpisodeViewer } from "./training/EpisodeViewerContext";
import { EpisodeViewerPanel } from "./training/EpisodeViewerPanel";
import { TrainingControlsBar } from "./training/TrainingControlsBar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { toast } from "./ui/use-toast";

interface TrainingInterfaceProps {
  robotId: string | null;
  controllerId: string | null;
  session: WebRTCSession;
}

export const TrainingInterface = ({
  robotId,
  controllerId,
  session,
}: TrainingInterfaceProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthSession();
  const { viewerState: episodeViewerState } = useEpisodeViewer();

  // Use shared episode control context
  const episodeControl = useEpisodeControlContext();
  const {
    isRecording,
    isSavingEpisode,
    selectedDataset,
    isDeploying,
    deployRequestPending,
    deployDatasetId,
    deployStatusPopupOpen,
    deployStatusMessage,
    startEpisode: contextStartEpisode,
    endEpisode: contextEndEpisode,
    handleDeploy: contextHandleDeploy,
    handleForceStopDeploy: contextHandleForceStopDeploy,
    setSelectedDataset,
    setSelectedDatasetId,
    setSession,
    setRobotId,
    setControllerId,
    setIsSavingEpisode,
    setIsRecording,
    setIsDeploying,
    setDeployRequestPending,
    setDeployDatasetId,
    setDeployStatusPopupOpen,
    setDeployStatusMessage,
    // Pose
    memorisedPose,
    poseLoading,
    isRestoring,
    handleMemorisePose,
    handleRestorePose,
    handleClearPose,
    handleGetPose,
    setMemorisedPose,
    setIsRestoring,
  } = episodeControl;

  // Sync session, robotId, controllerId to context
  useEffect(() => {
    setSession(session);
  }, [session, setSession]);

  useEffect(() => {
    setRobotId(robotId);
  }, [robotId, setRobotId]);

  useEffect(() => {
    setControllerId(controllerId);
  }, [controllerId, setControllerId]);

  // Fetch memorised pose when telemetry channel opens
  useEffect(() => {
    if (session.telemetryOpen) {
      void handleGetPose();
    }
  }, [session.telemetryOpen, handleGetPose]);

  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null,
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize sidebarTab from URL params, default to "secondary"
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const requestedTab = params.get("tab");
  const tabFromUrl: SidebarTab | null =
    requestedTab === "secondary" ||
    requestedTab === "episodes" ||
    requestedTab === "models"
      ? requestedTab
      : null;
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(
    tabFromUrl || "secondary",
  );

  const { setMode } = useModeContext();
  const {
    episodes,
    datasets,
    datasetItems,
    datasetNameById,
    selectedDatasetDbId,
    selectedDatasetRouteId,
    episodesWsEnabled,
    isLoadingDatasets,
    datasetStatus,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    episodeToDelete,
    isDeleting,
    deletingEpisodeId,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    newDatasetName,
    setNewDatasetName,
    newDatasetDescription,
    setNewDatasetDescription,
    isCreatingDataset,
    deleteDatasetConfirmOpen,
    setDeleteDatasetConfirmOpen,
    datasetToDelete,
    datasetEpisodesToShow,
    fetchEpisodes,
    handleCreateDataset,
    handleDatasetDescriptionSave,
    promptDeleteEpisode,
    confirmDeleteEpisode,
    promptDeleteDataset,
    confirmDeleteDataset,
  } = useTrainingDatasetEpisodes({
    robotId,
    selectedDataset,
    isSavingEpisode,
    setSelectedDataset,
    setSelectedDatasetId,
    setIsSavingEpisode,
  });

  // Handle tab changes and update URL
  const handleTabChange = useCallback(
    (newTab: SidebarTab) => {
      setSidebarTab(newTab);

      // Update URL params
      const newParams = new URLSearchParams(location.search);
      newParams.set("tab", newTab);
      navigate(`${location.pathname}?${newParams.toString()}`, {
        replace: true,
      });
    },
    [location.pathname, location.search, navigate],
  );

  // Update sidebarTab if URL param changes (on page refresh or navigation)
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== sidebarTab) {
      setSidebarTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      setRecordingStartTime(Date.now());
      setElapsedTime(0);
    } else {
      setRecordingStartTime(null);
    }
  }, [isRecording]);

  useEffect(() => {
    if (!recordingStartTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - recordingStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingStartTime]);

  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const {
    cameraLoading,
    cameraError,
    fixedLeftSlot,
    fixedRightSlot,
    sidebarSlots,
    displayMainSlot,
    displaySlotForSecondarySlot,
    fallbackImageForPosition,
    handleSwapCameraWithMain,
  } = useTrainingCameraLayout(robotId, session);

  const renderSecondaryStack = (
    slots: CameraSlot[],
    fallbackPosition: "left" | "right" | "extra",
  ) => {
    if (slots.length === 0) {
      return (
        <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">
          No {fallbackPosition} cameras
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {slots.map((slot) =>
          (() => {
            const displaySlot = displaySlotForSecondarySlot(slot);
            if (!displaySlot) {
              return null;
            }
            return (
              <CameraView
                key={`${slot.key}-${displaySlot.key}`}
                title={displaySlot.title}
                stream={displaySlot.stream}
                fallbackImage={fallbackImageForPosition(displaySlot.position)}
                position={
                  slot.position === "extra" ? fallbackPosition : slot.position
                }
                isConnected={Boolean(displaySlot.stream)}
                className="h-[170px] rounded-2xl border border-border bg-card/80 shadow-sm"
                onSwapWithMain={() => handleSwapCameraWithMain(slot.key)}
              />
            );
          })(),
        )}
      </div>
    );
  };

  const startEpisode = async () => {
    const success = await contextStartEpisode();
    if (success) {
      // Mode is now set by EpisodeControlContext
      // Update episodes list if episode management UI is visible
      if (!episodesWsEnabled) {
        void fetchEpisodes();
      }
    }
  };

  const endEpisode = async () => {
    // Mode is now set by EpisodeControlContext
    await contextEndEpisode();
  };

  const rewindEpisode = async () => {
    setIsLoading(true);
    try {
      console.log("This function will be implemented later");
      toast({
        title: "Info",
        description: "Rewind functionality is not implemented yet",
      });
    } catch (error) {
      console.error("Failed to rewind episode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // handleDeploy and handleForceStopDeploy are now provided by episodeControl context
  // Wrap them for the UI handlers
  const onDeploy = () => {
    contextHandleDeploy();
  };

  const onForceStopDeploy = () => {
    contextHandleForceStopDeploy();
  };

  useTrainingTelemetry({
    session,
    userId: user?.userId,
    selectedDataset,
    selectedDatasetRouteId,
    datasetNameById,
    deployDatasetId,
    isRecording,
    isSavingEpisode,
    episodesWsEnabled,
    fetchEpisodes,
    setMode,
    setSelectedDataset,
    setIsRecording,
    setIsSavingEpisode,
    setIsDeploying,
    setDeployRequestPending,
    setDeployDatasetId,
    setDeployStatusPopupOpen,
    setDeployStatusMessage,
    setMemorisedPose,
    setIsRestoring,
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <section className="relative flex min-h-0 flex-1 flex-col p-1">
        <div className="flex flex-1 min-h-0 gap-2 ">
          <div className="relative flex-1 overflow-hidden rounded-[32px] border border-border bg-card shadow-[0_25px_70px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
            {/* <div className="absolute left-5 top-5 z-20 rounded-lg border border-border bg-card/85 px-3 py-1 text-[11px]  uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur">
             { mainSlot?.title}
            </div> */}

            <div className="absolute left-5 top-26 z-20">
              <ActionVarianceChart
                title="2 sec future"
                overlay
                compact
                showTitle={false}
              />
            </div>

            <div className="absolute right-5 top-5 z-20 flex flex-col items-end gap-2 bg-transparent text-xs transition-opacity hover:opacity-100">
              {/* Recording Timer */}
              {isRecording && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 shadow-lg backdrop-blur animate-in fade-in slide-in-from-right-2 duration-300">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                  </span>
                  <span className="font-mono text-lg font-semibold text-red-500">
                    {formatElapsedTime(elapsedTime)}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-red-400">
                    REC
                  </span>
                </div>
              )}
              {/* 
              todo: add session status indicators back
              <div className="rounded-xl border border-border bg-card/85 px-3 py-2 text-muted-foreground shadow-lg backdrop-blur">
                <div>
                  <span className="text-muted-foreground/80">Signaling:</span>{" "}
                  <span
                    className={
                      session.signalingConnected
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }
                  >
                    {session.signalingConnected ? "connected" : "connecting"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground/80">Peer:</span>{" "}
                  <span className="text-primary">
                    {session.connectionState}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground/80">Telemetry:</span>{" "}
                  <span
                    className={
                      session.telemetryOpen
                        ? "text-emerald-500"
                        : "text-amber-500"
                    }
                  >
                    {session.telemetryOpen ? "open" : "pending"}
                  </span>
                </div>
              </div> */}
              {cameraLoading && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] text-primary shadow">
                  Loading camera config…
                </span>
              )}
              {cameraError && (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] text-amber-700 shadow dark:border-amber-500/50 dark:bg-amber-900/40 dark:text-amber-100">
                  {cameraError}
                </span>
              )}
            </div>

            {/* Show Episode Viewer OR Camera View in main area */}
            {episodeViewerState.isOpen ? (
              <EpisodeViewerPanel className="h-full" />
            ) : (
              <CameraView
                key={displayMainSlot?.key ?? "main"}
                title={displayMainSlot?.title ?? "Main Camera"}
                stream={displayMainSlot?.stream ?? null}
                fallbackImage={fallbackImageForPosition(
                  displayMainSlot?.position ?? "main",
                )}
                position="main"
                isConnected={Boolean(displayMainSlot?.stream)}
                showTitle={true}
                className="h-full rounded-[32px] border-none bg-transparent"
              />
            )}

            {fixedLeftSlot && (
              <div className="absolute bottom-4 left-4 z-30  overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
                {(() => {
                  const displaySlot =
                    displaySlotForSecondarySlot(fixedLeftSlot);
                  if (!displaySlot) {
                    return null;
                  }
                  return (
                    <CameraView
                      key={`${fixedLeftSlot.key}-${displaySlot.key}`}
                      title={displaySlot.title ?? "Left Camera"}
                      stream={displaySlot.stream ?? null}
                      fallbackImage={fallbackImageForPosition(
                        displaySlot.position,
                      )}
                      position="left"
                      isConnected={Boolean(displaySlot.stream)}
                      className="h-full w-full"
                      onSwapWithMain={() =>
                        handleSwapCameraWithMain(fixedLeftSlot.key)
                      }
                    />
                  );
                })()}
              </div>
            )}

            {fixedRightSlot && (
              <div className="absolute bottom-4 right-4 z-30  overflow-hidden rounded-2xl border border-border bg-black shadow-2xl">
                {(() => {
                  const displaySlot =
                    displaySlotForSecondarySlot(fixedRightSlot);
                  if (!displaySlot) {
                    return null;
                  }
                  return (
                    <CameraView
                      key={`${fixedRightSlot.key}-${displaySlot.key}`}
                      title={displaySlot.title ?? "Right Camera"}
                      stream={displaySlot.stream ?? null}
                      fallbackImage={fallbackImageForPosition(
                        displaySlot.position,
                      )}
                      position="right"
                      isConnected={Boolean(displaySlot.stream)}
                      className="h-full w-full"
                      onSwapWithMain={() =>
                        handleSwapCameraWithMain(fixedRightSlot.key)
                      }
                    />
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex h-full w-[360px] min-w-[320px] max-w-[380px] flex-col gap-3 rounded-[28px] border border-border bg-card/90 p-1 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            <SidebarTabs
              tab={sidebarTab}
              onTabChange={handleTabChange}
              secondaryContent={renderSecondaryStack(sidebarSlots, "extra")}
              selectedDatasetDbId={selectedDatasetDbId}
              episodeManagementProps={{
                datasets,
                datasetItems,
                isLoadingDatasets,
                episodes,
                isDeleting,
                deletingEpisodeId,
                formatDuration,
                onRequestCreateDataset: () => setIsCreateDialogOpen(true),
                onRequestDeleteDataset: promptDeleteDataset,
                onDatasetDescriptionSave: handleDatasetDescriptionSave,
                onPromptDeleteEpisode: promptDeleteEpisode,
                selectedDatasetRouteId,
                robotId,
                isRecording,
                recordingElapsedTime: elapsedTime,
                isSavingEpisode,
                isDatasetLocked: datasetStatus === "processing",
              }}
            />
          </div>
        </div>
      </section>

      <TrainingControlsBar
        isRecording={isRecording}
        isLoading={isLoading}
        isDeploying={isDeploying}
        deployRequestPending={deployRequestPending}
        memorisedPose={memorisedPose}
        poseLoading={poseLoading}
        isRestoring={isRestoring}
        onStart={startEpisode}
        onStop={endEpisode}
        onRewind={rewindEpisode}
        onDeploy={onDeploy}
        onMemorise={handleMemorisePose}
        onRestore={handleRestorePose}
        onClear={handleClearPose}
      />

      <CreateDatasetDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        newDatasetName={newDatasetName}
        newDatasetDescription={newDatasetDescription}
        selectedRobotId={robotId}
        isCreating={isCreatingDataset}
        onNameChange={setNewDatasetName}
        onDescriptionChange={setNewDatasetDescription}
        onSubmit={handleCreateDataset}
        onCancel={() => {
          setIsCreateDialogOpen(false);
          setNewDatasetName("");
          setNewDatasetDescription("");
        }}
      />

      <DeleteEpisodeDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        episodeLabel={episodeToDelete?.episodeId ?? null}
        onConfirm={confirmDeleteEpisode}
        isDeleting={isDeleting}
      />

      <DeleteDatasetDialog
        open={deleteDatasetConfirmOpen}
        onOpenChange={setDeleteDatasetConfirmOpen}
        datasetName={datasetToDelete}
        episodesPreview={datasetEpisodesToShow}
        onConfirm={confirmDeleteDataset}
        isDeleting={isDeleting}
        isDatasetLocked={
          datasetToDelete === selectedDataset && datasetStatus === "processing"
        }
      />

      {/* Deploy Status Popup - Unclosable while deploying */}
      <AlertDialog open={deployStatusPopupOpen}>
        <AlertDialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="sm:max-w-md"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
              </span>
              Deploying...
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {deployStatusMessage ?? "Waiting for checkpoint..."}
              {deployDatasetId && (
                <span className="mt-2 block text-sm text-muted-foreground">
                  Dataset:{" "}
                  <span className="font-medium">{deployDatasetId}</span>
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="destructive"
              onClick={onForceStopDeploy}
              className="w-full sm:w-auto"
            >
              Force Stop
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
