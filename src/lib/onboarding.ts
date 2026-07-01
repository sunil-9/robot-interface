export const ONBOARDING_STORAGE_KEY = "im-operator-onboarding:v1";
export const ONBOARDING_RESTART_EVENT = "im-operator-onboarding:restart";

export interface OnboardingProgress {
  version: 1;
  robotAdded: boolean;
  robotConnected: boolean;
  episodeTourSeen: boolean;
  sidebarTourSeen: boolean;
  completed: boolean;
  skipped?: boolean;
}

export const defaultOnboardingProgress: OnboardingProgress = {
  version: 1,
  robotAdded: false,
  robotConnected: false,
  episodeTourSeen: false,
  sidebarTourSeen: false,
  completed: false,
};

export function readOnboardingProgress(): OnboardingProgress {
  if (typeof window === "undefined") {
    return defaultOnboardingProgress;
  }

  try {
    const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!stored) {
      return defaultOnboardingProgress;
    }

    const parsed = JSON.parse(stored) as Partial<OnboardingProgress>;
    if (parsed.version !== 1) {
      return defaultOnboardingProgress;
    }

    return { ...defaultOnboardingProgress, ...parsed };
  } catch {
    return defaultOnboardingProgress;
  }
}

export function writeOnboardingProgress(progress: OnboardingProgress) {
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
}

export function restartOnboarding() {
  window.dispatchEvent(new CustomEvent(ONBOARDING_RESTART_EVENT));
}
