import type { SidebarTab } from "@/components/SidebarTabs";

export const TRAINING_SIDEBAR_TAB_EVENT = "im:training-sidebar-tab";

export interface TrainingSidebarTabEventDetail {
  tab: SidebarTab;
}

export const isTrainingSidebarTab = (value: unknown): value is SidebarTab =>
  value === "secondary" || value === "episodes" || value === "models";

export const requestTrainingSidebarTab = (tab: SidebarTab) => {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("tab", tab);
  window.history.replaceState(
    window.history.state,
    "",
    `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
  );
  window.dispatchEvent(
    new CustomEvent<TrainingSidebarTabEventDetail>(
      TRAINING_SIDEBAR_TAB_EVENT,
      { detail: { tab } },
    ),
  );
};
