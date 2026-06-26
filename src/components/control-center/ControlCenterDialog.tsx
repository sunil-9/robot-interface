import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ControlCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  size?: "compact" | "default";
  children: ReactNode;
}

export function ControlCenterDialog({
  open,
  onOpenChange,
  title,
  description,
  size = "default",
  children,
}: ControlCenterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "overflow-hidden border-border bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.10),_transparent_32%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card)))] p-0 text-foreground shadow-2xl",
          size === "compact" ? "max-w-2xl" : "max-w-5xl",
        )}
      >
        <DialogHeader className="border-b border-border/80 px-6 py-4 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[76vh]">
          <div className={cn(size === "compact" ? "p-5" : "p-6")}>
            {children}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
