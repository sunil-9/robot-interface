import { AppMode } from "@/context/ModeContextDef";
import { useModeContext } from "@/hooks/useModeContext";
import { useRobots } from "@/hooks/useRobots";
import {
  Circle,
  CircleUserRound,
  Moon,
  Play,
  RefreshCcw,
  Settings,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface HeaderProps {
  page: string;
  selectedRobot?: string;
  selectedControl?: string;
  onOpenSettings?: () => void;
  onSelectionStart?: (robotId: string, controllerId: string) => void;
}

interface TrainHeaderProps {
  selectedRobot?: string;
  selectedControl?: string;
  onOpenSettings?: () => void;
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
  onSelectionStart,
  mode,
  getModeLabel,
  modeColors,
  ThemeToggle,
}: TrainHeaderProps) => {
  const navigate = useNavigate();
  const [robotSelection, setRobotSelection] = useState<string>(
    selectedRobot ?? "",
  );
  const [controlSelection, setControlSelection] = useState<string>(
    selectedControl ?? "",
  );

  const { robots, controlDevices, loading, loadingDevices, refreshRobots } =
    useRobots(robotSelection || selectedRobot || "");

  useEffect(() => {
    setRobotSelection(selectedRobot ?? "");
  }, [selectedRobot]);

  useEffect(() => {
    setControlSelection(selectedControl ?? "");
  }, [selectedControl]);

  const handleRobotChange = (value: string) => {
    setRobotSelection(value);
    setControlSelection("");
  };

  const handleStart = () => {
    if (!robotSelection || !controlSelection) {
      return;
    }
    onSelectionStart?.(robotSelection, controlSelection);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <CircleUserRound />
        </Button>

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
                value={robotSelection || undefined}
                onValueChange={handleRobotChange}
                disabled={loading}
              >
                <SelectTrigger className="h-10 border-border bg-background/90 text-xs">
                  <SelectValue
                    placeholder={loading ? "Loading robots..." : "Select robot"}
                  />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {robots.map((robot) => (
                    <SelectItem key={robot.id} value={robot.id}>
                      {robot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => refreshRobots()}
                title="Refresh robots"
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
                value={controlSelection || undefined}
                onValueChange={setControlSelection}
                disabled={!robotSelection || loadingDevices}
              >
                <SelectTrigger className="h-10 border-border bg-background/90 text-xs">
                  <SelectValue
                    placeholder={
                      !robotSelection
                        ? "Select robot first"
                        : loadingDevices
                          ? "Loading devices..."
                          : "Select control device"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {controlDevices.map((device) => (
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
                onClick={() => refreshRobots()}
                title="Refresh control devices"
                disabled={!robotSelection}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleStart}
            disabled={!robotSelection || !controlSelection}
            className="h-10 px-4"
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            Start
          </Button>
                {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        <ThemeToggle />
        </div>

  
      </div>
    </header>
  );
};

export const Header = ({
  page,
  selectedRobot,
  selectedControl,
  onOpenSettings,
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
