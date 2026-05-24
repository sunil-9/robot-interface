import { AccountPanel } from "@/components/control-center/AccountPanel";
import { ActiveTrainingPanel } from "@/components/control-center/ActiveTrainingPanel";
import { ControlCenterDialog } from "@/components/control-center/ControlCenterDialog";
import { ModelsPanel } from "@/components/control-center/ModelsPanel";
import { SecurityPanel } from "@/components/control-center/SecurityPanel";
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

const controlCenterContent: Record<
  ControlCenterTab,
  {
    title: string;
    description: string;
  }
> = {
  account: {
    title: "Account",
    description: "Manage your operator profile and browser session.",
  },
  models: {
    title: "Models",
    description: "Browse and manage model assets for robot operation.",
  },
  training: {
    title: "Active Training",
    description: "Review live training jobs and current training status.",
  },
  security: {
    title: "Security",
    description: "Reset your password and manage account security settings.",
  },
};

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

  const dialogContent = controlCenterContent[activeTab];

  const renderPanel = () => {
    switch (activeTab) {
      case "account":
        return <AccountPanel onClose={() => onOpenChange(false)} />;
      case "models":
        return <ModelsPanel />;
      case "training":
        return <ActiveTrainingPanel />;
      case "security":
        return <SecurityPanel />;
      default:
        return null;
    }
  };

  return (
    <ControlCenterDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogContent.title}
      description={dialogContent.description}
    >
      {renderPanel()}
    </ControlCenterDialog>
  );
}
