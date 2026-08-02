import { Button } from "@/components/ui/button";
import { ChevronDown, Gamepad2, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";
import { restartOnboarding } from "@/lib/onboarding";

interface HelpDialogProps {
  className?: string;
  children?: React.ReactNode;
  inline?: boolean;
}

export function HelpDialog({
  className,
  children,
  inline = false,
}: HelpDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const robot = params.get("robot");
  const controller = params.get("controller");
  const helpImageSrc =
    robot && controller
      ? `/help/${encodeURIComponent(robot)}/${encodeURIComponent(
          controller,
        )}.png`
      : "/help/default.png";

  return (
    <div
      className={cn(
        inline ? "relative" : "fixed bottom-0 left-1/2 z-50 -translate-x-1/2",
      )}
    >
      {/* Collapsed state - just the button */}
      <Button
        data-tour="help-button"
        variant="ghost"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          inline
            ? "rounded border border-border bg-background text-foreground transition-colors hover:bg-muted"
            : "rounded-t-lg rounded-b-none border-b-0 bg-card/95 backdrop-blur-sm",
          children ? "" : "h-9 w-9",
          className,
        )}
      >
        <HelpCircle className="h-4 w-4" />
        Help
      </Button>

      {/* Expanded panel */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-auto transition-all duration-300 ease-in-out",
          inline ? "bottom-full mb-3" : "bottom-0",
          isOpen
            ? "translate-y-0 opacity-95"
            : "translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <div className="operator-surface w-[450px] rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Help</span>
              <span className="text-xs text-muted-foreground">
                {robot && controller ? `${robot} • ${controller}` : "Controls"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded"
              onClick={() => setIsOpen(false)}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Content */}

          <div>
            {imageError ? (
              <div className="flex h-[350px] w-[450px] items-center justify-center bg-muted">
                <p className="text-muted-foreground text-sm">No help found</p>
              </div>
            ) : (
              <img
                src={helpImageSrc}
                alt="Controller instructions"
                className="h-[350px] w-[450px] object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <div className="border-t border-border px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                setIsOpen(false);
                restartOnboarding();
              }}
            >
              Restart guided tour
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
