import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Gamepad2, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

interface HelpDialogProps {
  className?: string;
  children?: React.ReactNode;
  inline?: boolean;
}

export function HelpDialog({ className, children, inline = false }: HelpDialogProps) {
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
        inline
          ? "relative"
          : "fixed bottom-0 left-1/2 z-50 -translate-x-1/2",
      )}
    >
      {/* Collapsed state - just the button */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className={cn(
            inline
              ? "rounded-full bg-slate-600 text-slate-200 border-0 backdrop-blur-sm hover:bg-slate-500 hover:text-white"
              : "rounded-t-2xl rounded-b-none border-b-0 bg-card/95 backdrop-blur-sm",
            children ? "" : "h-9 w-9",
            className,
          )}
        >
          <HelpCircle
            className={cn("h-5 w-5", children && "h-5 w-5")}
          />
        </Button>
      </div>

      {/* Expanded panel */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-auto transition-all duration-300 ease-in-out",
          inline ? "bottom-full mb-3" : "bottom-0",
          isOpen
            ? "translate-y-0 opacity-95"
            : "translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <div className="rounded-t-xl  bg-card/95 backdrop-blur-sm shadow-xl w-[450px]">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 r">
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
              className="h-6 w-6 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Content */}

          <div >
            {imageError ? (
              <div className="flex h-[350px] w-[450px] items-center justify-center bg-muted">
                <p className="text-muted-foreground text-sm">No help found</p>
              </div>
            ) : (
              <img
                src={helpImageSrc}
                alt="Controller instructions"
                className="h-[350px] w-[450px] rounded object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
