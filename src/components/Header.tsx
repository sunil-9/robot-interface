import { headerControlCenterTabs } from "@/components/control-center/tabs";
import type { ControlCenterTab } from "@/components/control-center/types";
import { toast } from "@/components/ui/use-toast";
import { AppMode } from "@/context/ModeContextDef";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { useModeContext } from "@/hooks/useModeContext";
import { useRobots } from "@/hooks/useRobots";
import { robotService } from "@/services/robotService";
import {
  CheckCircle2,
  Circle,
  CircleUserRound,
  Link2,
  Loader2,
  LogOut,
  Moon,
  Pencil,
  RefreshCcw,
  Rocket,
  Sun,
  Unplug,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const CLAIM_ROBOT_VALUE = "__claim__";

const formatRobotLabel = (
  robotId: number,
  robotType?: string | null,
  name?: string | null,
) => {
  const trimmedName = name?.trim() ?? "";
  const typeLabel = robotType?.trim() || "unknown";

  if (trimmedName) {
    return `${trimmedName} (${robotId}, ${typeLabel})`;
  }

  return `Robot ID ${robotId} (${typeLabel})`;
};

interface HeaderProps {
  page: string;
  selectedRobot?: string;
  selectedControl?: string;
  isConnected?: boolean;
  onOpenSettings?: (tab?: ControlCenterTab) => void;
  onRobotChange?: (robotId: string) => void;
  onControlSelectionChange?: (controllerId: string | null) => void;
  onSelectionStart?: (robotId: string, controllerId: string) => void;
  onDisconnect?: () => void;
}

interface TrainHeaderProps {
  selectedRobot?: string;
  selectedControl?: string;
  isConnected?: boolean;
  onOpenSettings?: (tab?: ControlCenterTab) => void;
  onRobotChange?: (robotId: string) => void;
  onControlSelectionChange?: (controllerId: string | null) => void;
  onSelectionStart?: (robotId: string, controllerId: string) => void;
  onDisconnect?: () => void;
  mode: AppMode;
  getModeLabel: () => string;
  modeColors: Record<AppMode, string>;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const TrainHeader = ({
  selectedRobot,
  selectedControl,
  isConnected = false,
  onOpenSettings,
  onRobotChange,
  onControlSelectionChange,
  onSelectionStart,
  onDisconnect,
  mode,
  getModeLabel,
  modeColors,
  theme,
  toggleTheme,
}: TrainHeaderProps) => {
  const auth = useAuthSession();
  const { handleDeploy, isDeploying, deployRequestPending } =
    useEpisodeControlContext();
  const [robotSelection, setRobotSelection] = useState<string>(
    selectedRobot ?? "",
  );
  const [robotSelectOpen, setRobotSelectOpen] = useState(false);
  const [controlSelection, setControlSelection] = useState<string>(
    selectedControl ?? "",
  );
  const [claimRobotOpen, setClaimRobotOpen] = useState(false);
  const [claimRobotHash, setClaimRobotHash] = useState("");
  const [claimRobotFriendlyName, setClaimRobotFriendlyName] = useState("");
  const [claimRobotLoading, setClaimRobotLoading] = useState(false);
  const [claimRobotError, setClaimRobotError] = useState<string | null>(null);
  const [renameRobotId, setRenameRobotId] = useState<string | null>(null);
  const [renameRobotFriendlyName, setRenameRobotFriendlyName] = useState("");
  const [renameRobotLoading, setRenameRobotLoading] = useState(false);
  const [renameRobotError, setRenameRobotError] = useState<string | null>(null);
  const selectedRobotId = robotSelection || selectedRobot || "";
  const normalizedSelectedRobotId = selectedRobotId.trim();

  const {
    robots,
    controlDevices,
    loading,
    loadingDevices,
    refreshRobots,
    refreshControlDevices,
  } = useRobots(selectedRobotId, auth.accessToken);

  const sortedRobots = [...robots].sort((left, right) => {
    if (left.is_live === right.is_live) {
      const leftName = left.name?.trim() || `Robot ${left.id}`;
      const rightName = right.name?.trim() || `Robot ${right.id}`;
      return leftName.localeCompare(rightName, undefined, { numeric: true });
    }
    return left.is_live ? -1 : 1;
  });

  const hasSelectedRobot =
    Boolean(normalizedSelectedRobotId) &&
    sortedRobots.some(
      (robot) => String(robot.id) === normalizedSelectedRobotId,
    );
  const selectedRobotDetail = normalizedSelectedRobotId
    ? (sortedRobots.find(
        (robot) => String(robot.id) === normalizedSelectedRobotId,
      ) ?? null)
    : null;
  const visibleControlDevices = useMemo(
    () => (hasSelectedRobot ? controlDevices : []),
    [controlDevices, hasSelectedRobot],
  );
  const userDisplayName =
    auth.user?.fullName?.trim() || auth.user?.email || "Operator";

  useEffect(() => {
    setRobotSelection(selectedRobot ?? "");
  }, [selectedRobot]);

  useEffect(() => {
    setControlSelection(selectedControl ?? "");
  }, [selectedControl]);

  useEffect(() => {
    if (!auth.accessToken) {
      setRobotSelection("");
      setControlSelection("");
      onControlSelectionChange?.(null);
      return;
    }

    if (!loading && !hasSelectedRobot) {
      setControlSelection("");
      onControlSelectionChange?.(null);
    }
  }, [auth.accessToken, hasSelectedRobot, loading, onControlSelectionChange]);

  useEffect(() => {
    if (!auth.accessToken || loading || !hasSelectedRobot || loadingDevices) {
      return;
    }

    const hasSelectedControl = visibleControlDevices.some(
      (device) => device.id === controlSelection,
    );
    if (hasSelectedControl) {
      return;
    }

    const defaultControl = selectedControl ?? "";
    if (
      defaultControl &&
      visibleControlDevices.some((device) => device.id === defaultControl)
    ) {
      setControlSelection(defaultControl);
      return;
    }

    if (controlSelection) {
      setControlSelection("");
      onControlSelectionChange?.(null);
    }
  }, [
    auth.accessToken,
    controlSelection,
    hasSelectedRobot,
    loading,
    loadingDevices,
    onControlSelectionChange,
    selectedControl,
    visibleControlDevices,
  ]);

  const handleRobotChange = (value: string) => {
    if (value === CLAIM_ROBOT_VALUE) {
      if (!auth.accessToken) {
        toast({
          title: "Login required",
          description: "Please log in first to add a robot.",
          variant: "destructive",
        });
        return;
      }

      setClaimRobotOpen(true);
      setClaimRobotError(null);
      setClaimRobotFriendlyName("");
      return;
    }

    setRobotSelection(value);
    setControlSelection("");
    onControlSelectionChange?.(null);
    onRobotChange?.(value);
  };

  const handleClaimRobot = async () => {
    if (!auth.accessToken) {
      setClaimRobotError("Not authorized. Please log in and try again.");
      return;
    }
    const normalizedHash = claimRobotHash.trim();
    if (!normalizedHash) {
      setClaimRobotError("Robot hash is required.");
      return;
    }

    try {
      setClaimRobotLoading(true);
      setClaimRobotError(null);
      const claimResult = await robotService.claimRobot(
        normalizedHash,
        claimRobotFriendlyName,
      );
      const claimedRobotId = String(claimResult.robot_id);
      setRobotSelection(claimedRobotId);
      setControlSelection("");
      onControlSelectionChange?.(null);
      onRobotChange?.(claimedRobotId);
      setClaimRobotHash("");
      setClaimRobotFriendlyName("");
      setClaimRobotOpen(false);
      refreshRobots();
    } catch (error) {
      setClaimRobotError(
        error instanceof Error ? error.message : "Failed to claim robot.",
      );
    } finally {
      setClaimRobotLoading(false);
    }
  };

  const handleStartRenameRobot = (
    robotId: number,
    currentName?: string | null,
  ) => {
    setRobotSelectOpen(false);
    setRenameRobotId(String(robotId));
    setRenameRobotFriendlyName(currentName?.trim() ?? "");
    setRenameRobotError(null);
  };

  const handleCancelRenameRobot = () => {
    setRenameRobotId(null);
    setRenameRobotFriendlyName("");
    setRenameRobotError(null);
  };

  const handleRenameRobot = async () => {
    if (!auth.accessToken) {
      setRenameRobotError("Not authorized. Please log in and try again.");
      return;
    }

    if (!renameRobotId) {
      return;
    }

    try {
      setRenameRobotLoading(true);
      setRenameRobotError(null);
      await robotService.renameRobot(renameRobotId, renameRobotFriendlyName);
      setRenameRobotId(null);
      setRenameRobotFriendlyName("");
      refreshRobots();
    } catch (error) {
      setRenameRobotError(
        error instanceof Error ? error.message : "Failed to rename robot.",
      );
    } finally {
      setRenameRobotLoading(false);
    }
  };

  const handleStart = () => {
    if (isConnected) {
      return;
    }
    if (!hasSelectedRobot || !controlSelection) {
      return;
    }
    if (selectedRobotDetail && !selectedRobotDetail.is_live) {
      toast({
        title: "Robot offline",
        description: "This robot is not live. Please select a live robot.",
        variant: "destructive",
      });
      return;
    }
    onSelectionStart?.(normalizedSelectedRobotId, controlSelection);
  };

  const handleControlChange = (value: string) => {
    setControlSelection(value);
    onControlSelectionChange?.(value || null);
  };

  const handleDeployDefaultModel = () => {
    if (!isConnected || isDeploying || deployRequestPending) {
      return;
    }

    void handleDeploy();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Open user menu"
            >
              <CircleUserRound />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 border-border bg-popover p-2 text-popover-foreground"
          >
            <DropdownMenuLabel className="px-3 py-2">
              <span className="block text-sm font-semibold text-foreground">
                {auth.user ? userDisplayName : "Operator menu"}
              </span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {auth.user?.email ?? "Sign in to manage your workspace"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {headerControlCenterTabs.map((tab) => {
              const isAccountTab = tab.id === "account";
              const Icon =
                !auth.user && tab.unauthenticatedIcon
                  ? tab.unauthenticatedIcon
                  : tab.icon;
              const label =
                !auth.user && tab.unauthenticatedLabel
                  ? tab.unauthenticatedLabel
                  : tab.label;

              return (
                <DropdownMenuItem
                  key={tab.id}
                  className="gap-3 rounded-md px-3 py-2"
                  disabled={!auth.user && !isAccountTab}
                  onSelect={() => onOpenSettings?.(tab.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-3 rounded-md px-3 py-2"
              onSelect={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </DropdownMenuItem>
            {auth.user ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-3 rounded-md px-3 py-2 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onSelect={() => {
                    auth.logout();
                    toast({
                      title: "Signed out",
                      description: "Your local operator session was cleared.",
                    });
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="min-w-[220px] px-1">
          <div className="flex flex-col">
            <p
              className={`flex items-center gap-2 text-base font-semibold text-primary              }`}
            >
              Imitation Machines
            </p>
            <p
              className={`flex items-center gap-2 text-base font-semibold ${
                modeColors[mode] || "text-primary"
              }`}
            >
              {mode === AppMode.RECORDING && (
                <Circle className="h-3 w-3 fill-current animate-pulse" />
              )}
              {getModeLabel()}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1 space-y-1">
            <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Robot
            </p>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="min-w-0 flex-1" data-tour="robot-select">
                    <Select
                      open={robotSelectOpen}
                      onOpenChange={setRobotSelectOpen}
                      value={
                        hasSelectedRobot ? normalizedSelectedRobotId : undefined
                      }
                      onValueChange={handleRobotChange}
                      disabled={loading || isConnected}
                    >
                      <SelectTrigger className="h-10 border-border bg-background/90 text-xs">
                        {selectedRobotDetail ? (
                          <span className="flex min-w-0 flex-col items-start leading-tight">
                            <span className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                              {selectedRobotDetail.is_live ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Circle className="h-3 w-3 text-red-500" />
                              )}
                              {formatRobotLabel(
                                selectedRobotDetail.id,
                                selectedRobotDetail.robotType,
                                selectedRobotDetail.name,
                              )}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {selectedRobotDetail.is_live
                                ? selectedRobotDetail.description
                                : "Offline robot"}
                            </span>
                          </span>
                        ) : (
                          <SelectValue
                            placeholder={
                              loading ? "Loading robots..." : "Select robot"
                            }
                          />
                        )}
                      </SelectTrigger>
                      <SelectContent className="z-[100001] border-border bg-card">
                        <SelectItem
                          value={CLAIM_ROBOT_VALUE}
                          className="mb-1 items-center justify-center rounded-md border border-dashed border-border bg-background/50 py-2 pl-3 pr-3 font-medium text-primary focus:bg-accent/30 focus:text-primary [&>span:first-child]:hidden"
                        >
                          <span className="flex items-center gap-2">
                            <Link2 className="h-3 w-3" />
                            Add robot
                          </span>
                        </SelectItem>
                        {sortedRobots.map((robot) => (
                          <div
                            key={robot.id}
                            className="mb-1 flex overflow-hidden rounded-md border border-border/70 bg-background/60"
                          >
                            <SelectItem
                              value={robot.id.toString()}
                              className="min-h-16 min-w-0 flex-1 items-start rounded-none border-0 bg-transparent py-2 pl-3 pr-3 focus:bg-accent/40 data-[state=checked]:bg-primary/10 [&>span:first-child]:hidden"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  <span className="mr-1">
                                    {robot.is_live ? (
                                      <CheckCircle2 className="inline h-3 w-3 text-emerald-500" />
                                    ) : (
                                      <Circle className="inline h-3 w-3 text-red-500" />
                                    )}
                                  </span>
                                  {formatRobotLabel(
                                    robot.id,
                                    robot.robotType,
                                    robot.name,
                                  )}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {robot.is_live
                                    ? robot.description
                                    : "Offline robot"}
                                </p>
                              </div>
                            </SelectItem>
                            <button
                              type="button"
                              className="inline-flex w-10 shrink-0 items-center justify-center border-l border-border/70 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              aria-label={`Edit name for ${formatRobotLabel(
                                robot.id,
                                robot.robotType,
                                robot.name,
                              )}`}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleStartRenameRobot(robot.id, robot.name);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                {isConnected ? (
                  <TooltipContent>
                    Disconnect first to change robot.
                  </TooltipContent>
                ) : null}
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-8 text-muted-foreground hover:text-foreground"
                onClick={refreshRobots}
                title="Refresh robots"
                disabled={!auth.accessToken}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="min-w-[220px] flex-1 space-y-1">
            <p className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Control Device
            </p>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="min-w-0 flex-1" data-tour="control-select">
                    <Select
                      value={hasSelectedRobot ? controlSelection : ""}
                      onValueChange={handleControlChange}
                      disabled={
                        !auth.accessToken ||
                        !hasSelectedRobot ||
                        loadingDevices ||
                        isConnected
                      }
                    >
                      <SelectTrigger className="h-10 border-border bg-background/90 text-xs">
                        <SelectValue
                          placeholder={
                            !auth.accessToken
                              ? "Log in to select"
                              : !hasSelectedRobot
                                ? "Select robot first"
                                : loadingDevices
                                  ? "Loading devices..."
                                  : "Select control device"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="z-[100001] border-border bg-card">
                        {visibleControlDevices.map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                {isConnected ? (
                  <TooltipContent>
                    Disconnect first to change control device.
                  </TooltipContent>
                ) : null}
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-8 text-muted-foreground hover:text-foreground"
                onClick={refreshControlDevices}
                title="Refresh control devices"
                disabled={!auth.accessToken || !hasSelectedRobot}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleDeployDefaultModel}
                disabled={isDeploying || deployRequestPending}
                className="h-10 bg-primary px-4 text-primary-foreground hover:bg-primary/90"
                title="Deploy default model"
              >
                {deployRequestPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-1 h-4 w-4" />
                )}
                Deploy
              </Button>
              <div
                data-tour="connect-button"
                className="flex h-10 overflow-hidden rounded-md bg-emerald-600 text-white"
              >
                <div className="flex items-center px-4 text-sm font-medium">
                  <img
                    src="/robot-connected.svg"
                    alt=""
                    className="mr-1 h-6 w-6"
                    aria-hidden="true"
                  />
                  Connected
                </div>
                <Button
                  type="button"
                  size="icon"
                  onClick={onDisconnect}
                  className="h-10 w-10 rounded-none border-l border-white/30 bg-emerald-700 text-white hover:bg-emerald-800"
                  aria-label="Disconnect"
                  title="Disconnect"
                >
                  <Unplug className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              data-tour="connect-button"
              size="sm"
              onClick={handleStart}
              disabled={
                !auth.accessToken ||
                !hasSelectedRobot ||
                !controlSelection ||
                selectedRobotDetail?.is_live === false
              }
              className="h-10 px-4"
            >
              <img
                src="/robot-disconnected.svg"
                alt=""
                className="mr-1 h-6 w-6"
                aria-hidden="true"
              />
              Connect
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={claimRobotOpen}
        onOpenChange={(open) => {
          setClaimRobotOpen(open);
          if (!open) {
            setClaimRobotError(null);
            setClaimRobotHash("");
            setClaimRobotFriendlyName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add robot</DialogTitle>
            <DialogDescription>
              Enter the robot hash to add this robot to your account.
            </DialogDescription>
          </DialogHeader>
          <Input
            data-tour="robot-hash"
            placeholder="Enter robot hash"
            value={claimRobotHash}
            onChange={(event) => {
              setClaimRobotHash(event.target.value);
              if (claimRobotError) {
                setClaimRobotError(null);
              }
            }}
            disabled={claimRobotLoading}
          />
          <Input
            placeholder="Robot name (optional)"
            value={claimRobotFriendlyName}
            onChange={(event) => {
              setClaimRobotFriendlyName(event.target.value);
              if (claimRobotError) {
                setClaimRobotError(null);
              }
            }}
            disabled={claimRobotLoading}
          />
          {claimRobotError ? (
            <p className="text-sm text-red-500">{claimRobotError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setClaimRobotOpen(false)}
              disabled={claimRobotLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleClaimRobot}
              disabled={claimRobotLoading || !claimRobotHash.trim()}
            >
              {claimRobotLoading ? "Adding..." : "Add robot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameRobotId !== null}
        onOpenChange={(open) => {
          if (!open && !renameRobotLoading) {
            handleCancelRenameRobot();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleRenameRobot();
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit robot name</DialogTitle>
              <DialogDescription>
                Enter a friendly name for this robot. Leave it blank to use the
                default robot label.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={renameRobotFriendlyName}
              onChange={(event) => {
                setRenameRobotFriendlyName(event.target.value);
                if (renameRobotError) {
                  setRenameRobotError(null);
                }
              }}
              placeholder="Robot name (optional)"
              disabled={renameRobotLoading}
              aria-label="Robot name"
            />
            {renameRobotError ? (
              <p className="text-sm text-red-500">{renameRobotError}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelRenameRobot}
                disabled={renameRobotLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renameRobotLoading}>
                {renameRobotLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export const Header = ({
  page,
  selectedRobot,
  selectedControl,
  isConnected = false,
  onOpenSettings,
  onRobotChange,
  onControlSelectionChange,
  onSelectionStart,
  onDisconnect,
}: HeaderProps) => {
  const { getModeLabel, mode } = useModeContext();
  const getStoredTheme = () => {
    if (typeof window === "undefined") {
      return "light";
    }
    const stored = window.localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };
  const [theme, setTheme] = useState<"light" | "dark">(getStoredTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const modeColors: Record<AppMode, string> = {
    [AppMode.RECORDING]: "text-red-500",
    [AppMode.EXPLORATION]: "text-emerald-500",
    [AppMode.REPLAY]: "text-blue-500",
    [AppMode.POLICY_RUNNING]: "text-primary",
    [AppMode.TRAINING]: "",
  };

  const ThemeToggle = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="text-muted-foreground hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );

  return page == "main" ? (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Robot Teaching Interface
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a robot and control device to begin
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  ) : page == "train" ? (
    <TrainHeader
      selectedRobot={selectedRobot}
      selectedControl={selectedControl}
      isConnected={isConnected}
      onOpenSettings={onOpenSettings}
      onRobotChange={onRobotChange}
      onControlSelectionChange={onControlSelectionChange}
      onSelectionStart={onSelectionStart}
      onDisconnect={onDisconnect}
      mode={mode}
      getModeLabel={getModeLabel}
      modeColors={modeColors}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  ) : (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Imitation Machines
        </h1>
      </div>
      <ThemeToggle />
    </header>
  );
};
