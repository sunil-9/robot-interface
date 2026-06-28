import { ControlCenterDialog } from "@/components/control-center/ControlCenterDialog";
import { getControlCenterTabConfig } from "@/components/control-center/tabs";
import type { ControlCenterTab } from "@/components/control-center/types";
import { useAuthSession } from "@/hooks/useAuthSession";
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
  const auth = useAuthSession();
  const [activeTab, setActiveTab] = useState<ControlCenterTab>(initialTab);
  const authenticationRequired = !auth.accessToken;
  const visibleTab = authenticationRequired ? "account" : activeTab;

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const dialogContent = getControlCenterTabConfig(visibleTab);

  return (
    <ControlCenterDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogContent.title}
      description={dialogContent.description}
      size={visibleTab === "account" ? "compact" : "default"}
      mandatory={authenticationRequired}
    >
      {dialogContent.renderPanel({
        onClose: () => {
          if (!authenticationRequired) onOpenChange(false);
        },
      })}
    </ControlCenterDialog>
  );
}
