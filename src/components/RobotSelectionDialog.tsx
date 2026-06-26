import { ControlCenterDialog } from "@/components/control-center/ControlCenterDialog";
import { getControlCenterTabConfig } from "@/components/control-center/tabs";
import type { ControlCenterTab } from "@/components/control-center/types";
import { useEffect, useState } from "react";

interface RobotSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRobot?: string | null;
  initialController?: string | null;
  initialTab?: ControlCenterTab;
  onConfirm: (robotId: string, controllerId: string) => void;
}

export type { ControlCenterTab };

export function RobotSelectionDialog({
  open,
  onOpenChange,
  initialTab = "account",
}: RobotSelectionDialogProps) {
  const [activeTab, setActiveTab] = useState<ControlCenterTab>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const dialogContent = getControlCenterTabConfig(activeTab);

  return (
    <ControlCenterDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogContent.title}
      description={dialogContent.description}
      size={activeTab === "account" ? "compact" : "default"}
    >
      {dialogContent.renderPanel({
        onClose: () => onOpenChange(false),
      })}
    </ControlCenterDialog>
  );
}
