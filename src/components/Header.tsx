import { AppMode } from "@/context/ModeContextDef";
import { useModeContext } from "@/hooks/useModeContext";
import { ArrowLeft, Circle, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface HeaderProps {
  page: string;
  selectedRobot?: boolean;
  selectedControl?: boolean;
}
export const Header = ({
  page,
  selectedRobot,
  selectedControl,
}: HeaderProps) => {
  const navigate = useNavigate();
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
    <header className="fixed left-1/2 top-4 z-50 -translate-x-1/2 opacity-50 transition-opacity hover:opacity-100">
      <div className="flex items-center gap-3 rounded-full border border-border bg-card/95 px-3 py-2 shadow-[0_10px_40px_rgba(15,23,42,0.15)] backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center text-center px-1">
          <h1
            className={`flex items-center justify-center gap-2 text-base font-semibold ${
              mode === AppMode.RECORDING ? "text-red-500" : "text-primary"
            }`}
          >
            {mode === AppMode.RECORDING && (
              <Circle className="h-3 w-3 fill-current animate-pulse" />
            )}
            {getModeLabel()}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {selectedRobot ? `${selectedRobot}` : ""}
            {selectedControl ? ` · ${selectedControl}` : ""}
          </p>
        </div>

        <ThemeToggle />
      </div>
    </header>
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
