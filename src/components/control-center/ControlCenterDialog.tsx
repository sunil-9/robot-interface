import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface ControlCenterDialogTab {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface ControlCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  size?: "compact" | "default";
  mandatory?: boolean;
  tabs?: ControlCenterDialogTab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  children: ReactNode;
}

export function ControlCenterDialog({
  open,
  onOpenChange,
  title,
  description,
  size = "default",
  mandatory = false,
  tabs = [],
  activeTab,
  onTabChange,
  children,
}: ControlCenterDialogProps) {
  const showTabs = tabs.length > 0 && activeTab && onTabChange;

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
        <div className="border-b border-border/80 bg-card/95">
          <DialogHeader className="px-5 pb-3 pt-4 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="operator-label px-0 text-primary">
                  Control Center
                </p>
                <DialogTitle className="mt-1 text-xl font-semibold leading-7 text-foreground">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {showTabs && (
            <div className="px-5 pb-4">
              <div
                className={cn(
                  "grid h-11 rounded-md border border-border bg-muted/55 p-1",
                  tabs.length === 1 && "grid-cols-1",
                  tabs.length === 2 && "grid-cols-2",
                  tabs.length === 3 && "grid-cols-3",
                  tabs.length > 3 && "auto-cols-fr grid-flow-col overflow-x-auto",
                )}
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={tab.disabled}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "inline-flex min-w-0 items-center justify-center gap-2 rounded px-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--primary)/0.24)]"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        tab.disabled && "cursor-not-allowed opacity-45",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[76vh]">
          <div className={cn(size === "compact" ? "p-5" : "p-6")}>
            {children}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
