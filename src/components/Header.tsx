import { AppMode } from "@/context/ModeContextDef";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useModeContext } from "@/hooks/useModeContext";
import { useRobots } from "@/hooks/useRobots";
import type { ControlCenterTab } from "@/components/control-center/types";
import { robotService } from "@/services/robotService";
import { toast } from "@/components/ui/use-toast";
import {
  Activity,
  CheckCircle2,
  Circle,
  CircleUserRound,
  Link2,
  LogIn,
  LogOut,
  Moon,
  Package,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const CLAIM_ROBOT_VALUE = "__claim__";

interface HeaderProps {
  page: string;
  selectedRobot?: string;
  selectedControl?: string;
  onOpenSettings?: (tab?: ControlCenterTab) => void;
  onRobotChange?: (robotId: string) => void;
  onSelectionStart?: (robotId: string, controllerId: string) => void;
}

interface TrainHeaderProps {
  selectedRobot?: string;
  selectedControl?: string;
  onOpenSettings?: (tab?: ControlCenterTab) => void;
  onRobotChange?: (robotId: string) => void;
  onSelectionStart?: (robotId: string, controllerId: string) => void;
  mode: AppMode;
  getModeLabel: () => string;
  modeColors: Record<AppMode, string>;
  ThemeToggle: () => JSX.Element;
}

const TrainHeader = ({
  selectedRobot,
  selectedControl,
  onOpenSettings,
  onRobotChange,
  onSelectionStart,
  mode,
  getModeLabel,
  modeColors,
  ThemeToggle,
}: TrainHeaderProps) => {
  const auth = useAuthSession();
  const [robotSelection, setRobotSelection] = useState<string>(
    selectedRobot ?? "",
  );
  const [controlSelection, setControlSelection] = useState<string>(
    selectedControl ?? "",
  );
  const [claimRobotOpen, setClaimRobotOpen] = useState(false);
  const [claimRobotHash, setClaimRobotHash] = useState("");
  const [claimRobotLoading, setClaimRobotLoading] = useState(false);
  const [claimRobotError, setClaimRobotError] = useState<string | null>(null);
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
      return left.name.localeCompare(right.name);
    }
    return left.is_live ? -1 : 1;
  });

  const hasSelectedRobot =
    Boolean(normalizedSelectedRobotId) &&
    sortedRobots.some(
      (robot) => String(robot.id) === normalizedSelectedRobotId,
    );
  const selectedRobotDetail =
    normalizedSelectedRobotId
      ? sortedRobots.find(
          (robot) => String(robot.id) === normalizedSelectedRobotId,
        ) ?? null
      : null;
  const visibleControlDevices = hasSelectedRobot ? controlDevices : [];
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
      return;
    }

    if (!loading && !hasSelectedRobot) {
      setControlSelection("");
    }
  }, [auth.accessToken, hasSelectedRobot, loading]);

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
    }
  }, [
    auth.accessToken,
    controlSelection,
    hasSelectedRobot,
    loading,
    loadingDevices,
    selectedControl,
    visibleControlDevices,
  ]);

  const handleRobotChange = (value: string) => {
    if (value === CLAIM_ROBOT_VALUE) {
      if (!auth.accessToken) {
        toast({
          title: "Login required",
          description: "Please log in first to claim a robot.",
          variant: "destructive",
        });
        return;
      }

      setClaimRobotOpen(true);
      setClaimRobotError(null);
      return;
    }

    setRobotSelection(value);
    setControlSelection("");
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
      const claimResult = await robotService.claimRobot(normalizedHash);
      const claimedRobotId = String(claimResult.robot_id);
      setRobotSelection(claimedRobotId);
      setControlSelection("");
      onRobotChange?.(claimedRobotId);
      setClaimRobotHash("");
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

  const handleStart = () => {
    if (!hasSelectedRobot || !controlSelection) {
      return;
    }
    onSelectionStart?.(normalizedSelectedRobotId, controlSelection);
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
            <DropdownMenuItem
              className="gap-3 rounded-md px-3 py-2"
              onSelect={() => onOpenSettings?.("account")}
            >
              {auth.user ? (
                <UserRound className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              <span>{auth.user ? "Account" : "Login"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-md px-3 py-2"
              disabled={!auth.user}
              onSelect={() => onOpenSettings?.("models")}
            >
              <Package className="h-4 w-4" />
              <span>Models</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-md px-3 py-2"
              disabled={!auth.user}
              onSelect={() => onOpenSettings?.("training")}
            >
              <Activity className="h-4 w-4" />
              <span>Active Training</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-3 rounded-md px-3 py-2"
              disabled={!auth.user}
              onSelect={() => onOpenSettings?.("security")}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Security</span>
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
              <Select
                value={
                  hasSelectedRobot ? normalizedSelectedRobotId : undefined
                }
                onValueChange={handleRobotChange}
                disabled={loading}
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
                        {selectedRobotDetail.name}
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
                <SelectContent className="border-border bg-card">
                  {sortedRobots.map((robot) => (
                    <SelectItem
                      key={robot.id}
                      value={robot.id.toString()}
                      className="mb-1 min-h-16 items-start rounded-md border border-border/70 bg-background/60 py-2 pl-3 pr-3 focus:bg-accent/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 [&>span:first-child]:hidden"
                    >
                      <div className="flex w-full items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            <span className="mr-1">
                              {robot.is_live ? (
                                <CheckCircle2 className="inline h-3 w-3 text-emerald-500" />
                              ) : (
                                <Circle className="inline h-3 w-3 text-red-500" />
                              )}
                            </span>
                            {robot.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {robot.is_live
                              ? robot.description
                              : "Offline robot"}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem
                    value={CLAIM_ROBOT_VALUE}
                    className="mt-1 items-center justify-center rounded-md border border-dashed border-border bg-background/50 py-2 pl-3 pr-3 font-medium text-primary focus:bg-accent/30 focus:text-primary [&>span:first-child]:hidden"
                  >
                    <span className="flex items-center gap-2">
                      <Link2 className="h-3 w-3" />
                      {auth.accessToken ? "Claim robot" : "Claim robot"}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
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
              <Select
                value={
                  hasSelectedRobot && controlSelection
                    ? controlSelection
                    : undefined
                }
                onValueChange={setControlSelection}
                disabled={!auth.accessToken || !hasSelectedRobot || loadingDevices}
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
                <SelectContent className="border-border bg-card">
                  {visibleControlDevices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <Button
            size="sm"
            onClick={handleStart}
            disabled={!auth.accessToken || !hasSelectedRobot || !controlSelection}
            className="h-10 px-4"
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            Start
          </Button>
          <ThemeToggle />
        </div>
      </div>

      <Dialog
        open={claimRobotOpen}
        onOpenChange={(open) => {
          setClaimRobotOpen(open);
          if (!open) {
            setClaimRobotError(null);
            setClaimRobotHash("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Claim robot</DialogTitle>
            <DialogDescription>
              Enter robot hash to claim and link this robot to your user.
            </DialogDescription>
          </DialogHeader>
          <Input
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
              {claimRobotLoading ? "Claiming..." : "Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export const Header = ({
  page,
  selectedRobot,
  selectedControl,
  onOpenSettings,
  onRobotChange,
  onSelectionStart,
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
      onOpenSettings={onOpenSettings}
      onRobotChange={onRobotChange}
      onSelectionStart={onSelectionStart}
      mode={mode}
      getModeLabel={getModeLabel}
      modeColors={modeColors}
      ThemeToggle={ThemeToggle}
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
