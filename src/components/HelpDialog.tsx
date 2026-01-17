import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Gamepad2, HelpCircle, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

interface HelpDialogProps {
  className?: string;
  children?: React.ReactNode;
}

export function HelpDialog({ className, children }: HelpDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const robot = params.get("robot");
  const controller = params.get("controller");
  const helpImageSrc =
    robot && controller
      ? `/help/${encodeURIComponent(robot)}/${encodeURIComponent(
          controller
        )}.png`
      : "/help/so_100_ps5_help.png";

  return (
    <div className="fixed bottom-0 left-1/2 z-50 -translate-x-1/2">
      {/* Collapsed state - just the button */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className={cn(
            "rounded-t-2xl rounded-b-none border-b-0 bg-card/95 backdrop-blur-sm",
            children ? "" : "h-9 w-9",
            className
          )}
        >
          <HelpCircle
            className={cn("h-5 w-5", children && "mr-2 h-3.5 w-3.5")}
          />
          {children ? (
            <>
              {children}
              <ChevronUp className="ml-2 h-4 w-4" />
            </>
          ) : (
            <span className="sr-only">Control Help</span>
          )}
        </Button>
      </div>

      {/* Expanded panel */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(100vw-2rem,900px)] transition-all duration-300 ease-in-out",
          isOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <div className="rounded-t-2xl border border-b-0 border-border bg-card/95 backdrop-blur-sm shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Controller Help</span>
              <span className="text-xs text-muted-foreground">
                {robot && controller
                  ? `${robot} • ${controller}`
                  : "Controls"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[65vh] overflow-y-auto">
            {imageError ? (
              <div className="flex h-48 w-full items-center justify-center rounded-lg border border-border bg-muted">
                <p className="text-muted-foreground">No help found</p>
              </div>
            ) : (
              <img
                src={helpImageSrc}
                alt="Controller instructions"
                className="h-auto max-h-[55vh] w-full rounded-lg border border-border object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
