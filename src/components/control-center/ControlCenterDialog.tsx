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
  mandatory?: boolean;
  children: ReactNode;
}

export function ControlCenterDialog({
  open,
  onOpenChange,
  title,
  description,
  size = "default",
  mandatory = false,
  children,
}: ControlCenterDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (mandatory && !nextOpen) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={!mandatory}
        onEscapeKeyDown={(event) => {
          if (mandatory) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (mandatory) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (mandatory) event.preventDefault();
        }}
        className={cn(
          "operator-surface overflow-hidden rounded-lg p-0 text-foreground",
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
