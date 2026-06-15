import { AccountPanel } from "@/components/control-center/AccountPanel";
import { ActiveTrainingPanel } from "@/components/control-center/ActiveTrainingPanel";
import { ModelsPanel } from "@/components/control-center/ModelsPanel";
import { SecurityPanel } from "@/components/control-center/SecurityPanel";
import type { ControlCenterTab } from "@/components/control-center/types";
import {
  Activity,
  LogIn,
  Package,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

interface ControlCenterRenderContext {
  onClose: () => void;
}

export interface ControlCenterTabConfig {
  id: ControlCenterTab;
  label: string;
  unauthenticatedLabel?: string;
  icon: LucideIcon;
  unauthenticatedIcon?: LucideIcon;
  title: string;
  description: string;
  showInHeader: boolean;
  renderPanel: (context: ControlCenterRenderContext) => ReactNode;
}

export const controlCenterTabs: ControlCenterTabConfig[] = [
  {
    id: "account",
    label: "Account",
    unauthenticatedLabel: "Login",
    icon: UserRound,
    unauthenticatedIcon: LogIn,
    title: "Account",
    description: "Manage your operator profile and browser session.",
    showInHeader: true,
    renderPanel: ({ onClose }) => <AccountPanel onClose={onClose} />,
  },
  {
    id: "models",
    label: "Models",
    icon: Package,
    title: "Models",
    description: "Browse and manage model assets for robot operation.",
    showInHeader: false,
    renderPanel: () => <ModelsPanel />,
  },
  {
    id: "training",
    label: "Active Training",
    icon: Activity,
    title: "Active Training",
    description: "Review live training jobs and current training status.",
    showInHeader: true,
    renderPanel: () => <ActiveTrainingPanel />,
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    title: "Security",
    description: "Reset your password and manage account security settings.",
    showInHeader: true,
    renderPanel: () => <SecurityPanel />,
  },
];

export const headerControlCenterTabs = controlCenterTabs.filter(
  (tab) => tab.showInHeader,
);

export const getControlCenterTabConfig = (
  tabId: ControlCenterTab,
): ControlCenterTabConfig =>
  controlCenterTabs.find((tab) => tab.id === tabId) ?? controlCenterTabs[0];
