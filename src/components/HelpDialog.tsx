import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Gamepad2, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

interface HelpDialogProps {
  className?: string;
  children?: React.ReactNode;
}

export function HelpDialog({ className, children }: HelpDialogProps) {
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
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size={children ? "default" : "icon"}
          className={cn(children ? "" : "h-9 w-9", className)}
        >
          <HelpCircle
            className={cn("h-5 w-5", children && "mr-2 h-3.5 w-3.5")}
          />
          {children ? children : <span className="sr-only">Control Help</span>}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="w-[min(100%-2rem,900px)] mx-auto rounded-t-2xl border border-border bg-background px-6 pb-6 pt-4 shadow-2xl max-h-[80vh] sm:max-h-[75vh]"
      >
        <SheetHeader className="w-full text-left">
          <SheetTitle className="flex items-center gap-2">
            <Gamepad2 className="h-6 w-6" />
            Controller Help
          </SheetTitle>
          <SheetDescription>
            {robot && controller
              ? `${robot} ${controller} controls`
              : "Controller instructions"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 w-full">
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
      </SheetContent>
    </Sheet>
  );
}
