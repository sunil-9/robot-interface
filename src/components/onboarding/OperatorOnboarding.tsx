import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultOnboardingProgress,
  ONBOARDING_RESTART_EVENT,
  readOnboardingProgress,
  type OnboardingProgress,
  writeOnboardingProgress,
} from "@/lib/onboarding";
import { Check, Circle, RadioTower, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

interface OperatorOnboardingProps {
  enabled: boolean;
  selectedRobot: string | null;
  selectedControl: string | null;
  pendingControl: string | null;
  isConnected: boolean;
  claimRobotOpen: boolean;
}

type SetupStage = "robot" | "claim" | "control" | "connect";

const SETUP_COPY: Record<
  SetupStage,
  { selector: string; title: string; description: string }
> = {
  robot: {
    selector: "[data-tour='robot-select']",
    title: "Add or select a robot",
    description:
      "Open the robot list. Choose <b>Add robot</b> to claim your first robot, or select one you already own.",
  },
  claim: {
    selector: "[data-tour='robot-hash']",
    title: "Claim your robot",
    description:
      "Enter the hash supplied with your robot, optionally give it a friendly name, then choose <b>Add robot</b>.",
  },
  control: {
    selector: "[data-tour='control-select']",
    title: "Choose a control device",
    description:
      "Select the controller you will use for teleoperation. The available devices are loaded from the selected robot.",
  },
  connect: {
    selector: "[data-tour='connect-button']",
    title: "Connect and verify",
    description:
      "Choose <b>Connect</b>. We will continue only after the live robot connection is established.",
  },
};

export function OperatorOnboarding({
  enabled,
  selectedRobot,
  selectedControl,
  pendingControl,
  isConnected,
  claimRobotOpen,
}: OperatorOnboardingProps) {
  const [progress, setProgress] = useState(readOnboardingProgress);
  const [introOpen, setIntroOpen] = useState(
    () => enabled && !readOnboardingProgress().completed,
  );
  const [tourRunning, setTourRunning] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const transitioningRef = useRef(false);
  const wasEnabledRef = useRef(enabled);

  const updateProgress = useCallback(
    (patch: Partial<OnboardingProgress>) => {
      setProgress((current) => {
        const next = { ...current, ...patch };
        writeOnboardingProgress(next);
        return next;
      });
    },
    [],
  );

  const stopDriver = useCallback(() => {
    transitioningRef.current = true;
    driverRef.current?.destroy();
    driverRef.current = null;
    window.setTimeout(() => {
      transitioningRef.current = false;
    }, 0);
  }, []);

  const skipTour = useCallback(() => {
    stopDriver();
    setIntroOpen(false);
    setTourRunning(false);
    updateProgress({
      completed: true,
      skipped: true,
      robotAdded: Boolean(selectedRobot),
      robotConnected: isConnected,
    });
  }, [isConnected, selectedRobot, stopDriver, updateProgress]);

  const addSkipButton = useCallback(
    (footerButtons: HTMLElement) => {
      if (footerButtons.querySelector("[data-onboarding-skip]")) {
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.onboardingSkip = "true";
      button.className = "im-tour-skip";
      button.textContent = "Skip tour";
      button.addEventListener("click", skipTour);
      footerButtons.prepend(button);
    },
    [skipTour],
  );

  const startFeatureTour = useCallback(() => {
    stopDriver();
    setTourRunning(true);

    const selectTab = (name: string) => {
      const tab = document.querySelector<HTMLElement>(
        `[data-tour='${name}']`,
      );
      tab?.click();
    };

    const featureDriver = driver({
      animate: true,
      allowClose: true,
      overlayColor: "#020617",
      overlayOpacity: 0.72,
      stagePadding: 8,
      stageRadius: 14,
      popoverClass: "im-operator-tour",
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Finish",
      onPopoverRender: (popover) => addSkipButton(popover.footerButtons),
      onDestroyed: () => {
        if (transitioningRef.current) return;
        setTourRunning(false);
        updateProgress({
          episodeTourSeen: true,
          sidebarTourSeen: true,
          completed: true,
          skipped: false,
        });
      },
      steps: [
        {
          element: "[data-tour='record-episode']",
          popover: {
            title: "Episode management",
            description:
              "Start recording an episode here. While recording, this same control becomes <b>Stop</b>, so you can safely end the episode from the bottom bar.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='pose-controls']",
          popover: {
            title: "Memorise a pose",
            description:
              "Save the robot's current pose for quick restoration. When a pose exists, the clear action asks for confirmation before deleting it.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='help-button']",
          popover: {
            title: "Controller help",
            description:
              "Open Help whenever you need the control map for the selected robot and controller. You can also restart this tour there.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "[data-tour='more-streams-tab']",
          popover: {
            title: "More streams",
            description:
              "View additional cameras published by the robot and swap a secondary camera into the main view.",
            side: "left",
            align: "start",
            onNextClick: (_element, _step, { driver: activeDriver }) => {
              selectTab("episodes-tab");
              window.setTimeout(() => activeDriver.moveNext(), 100);
            },
          },
        },
        {
          element: "[data-tour='episodes-tab']",
          popover: {
            title: "Episodes",
            description:
              "Browse recorded episodes, play them for review, and delete unwanted recordings. Deletion always requires confirmation.",
            side: "left",
            align: "start",
            onNextClick: (_element, _step, { driver: activeDriver }) => {
              selectTab("models-tab");
              window.setTimeout(() => activeDriver.moveNext(), 100);
            },
            onPrevClick: (_element, _step, { driver: activeDriver }) => {
              selectTab("more-streams-tab");
              window.setTimeout(() => activeDriver.movePrevious(), 100);
            },
          },
        },
        {
          element: "[data-tour='models-tab']",
          popover: {
            title: "Models",
            description:
              "Train and manage models for the active dataset from this workspace.",
            side: "left",
            align: "start",
            onPrevClick: (_element, _step, { driver: activeDriver }) => {
              selectTab("episodes-tab");
              window.setTimeout(() => activeDriver.movePrevious(), 100);
            },
          },
        },
      ],
    });

    driverRef.current = featureDriver;
    featureDriver.drive();
  }, [addSkipButton, stopDriver, updateProgress]);

  const startSetup = useCallback(() => {
    setIntroOpen(false);
    setTourRunning(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const restart = () => {
      stopDriver();
      const reset = {
        ...defaultOnboardingProgress,
        robotAdded: Boolean(selectedRobot),
        robotConnected: isConnected,
      };
      writeOnboardingProgress(reset);
      setProgress(reset);
      setTourRunning(false);
      setIntroOpen(true);
    };

    window.addEventListener(ONBOARDING_RESTART_EVENT, restart);
    return () => window.removeEventListener(ONBOARDING_RESTART_EVENT, restart);
  }, [enabled, isConnected, selectedRobot, stopDriver]);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current && !readOnboardingProgress().completed) {
      setIntroOpen(true);
    }
    wasEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!tourRunning || introOpen || !enabled) return;

    if (isConnected) {
      updateProgress({ robotAdded: true, robotConnected: true });
      if (!progress.episodeTourSeen || !progress.sidebarTourSeen) {
        window.setTimeout(startFeatureTour, 350);
      }
      return;
    }

    const activeControl = pendingControl || selectedControl;
    const stage: SetupStage = claimRobotOpen
      ? "claim"
      : !selectedRobot
        ? "robot"
        : !activeControl
          ? "control"
          : "connect";
    const copy = SETUP_COPY[stage];
    const timer = window.setTimeout(() => {
      const element = document.querySelector(copy.selector);
      if (!element) return;

      stopDriver();
      const setupDriver = driver({
        animate: true,
        allowClose: true,
        overlayColor: "#020617",
        overlayOpacity: 0.72,
        stagePadding: 8,
        stageRadius: 14,
        popoverClass: "im-operator-tour",
        showButtons: ["close"],
        disableActiveInteraction: false,
        onPopoverRender: (popover) => {
          addSkipButton(popover.footerButtons);
          const hint = document.createElement("span");
          hint.className = "im-tour-live-hint";
          hint.textContent = "Complete this action to continue";
          popover.footerButtons.appendChild(hint);
        },
        onDestroyed: () => {
          if (!transitioningRef.current) {
            setTourRunning(false);
          }
        },
      });
      driverRef.current = setupDriver;
      setupDriver.highlight({
        element: copy.selector,
        popover: {
          title: copy.title,
          description: copy.description,
          side: stage === "claim" ? "left" : "bottom",
          align: "start",
        },
      });
    }, 180);

    if (selectedRobot && !progress.robotAdded) {
      updateProgress({ robotAdded: true });
    }

    return () => window.clearTimeout(timer);
  }, [
    addSkipButton,
    claimRobotOpen,
    enabled,
    introOpen,
    isConnected,
    pendingControl,
    progress.episodeTourSeen,
    progress.robotAdded,
    progress.sidebarTourSeen,
    selectedControl,
    selectedRobot,
    startFeatureTour,
    stopDriver,
    tourRunning,
    updateProgress,
  ]);

  useEffect(() => () => driverRef.current?.destroy(), []);

  if (!enabled) return null;

  const checklist = [
    { label: "Add your first robot", done: Boolean(selectedRobot) },
    { label: "Select a control device", done: Boolean(pendingControl || selectedControl) },
    { label: "Verify the live connection", done: isConnected },
    { label: "Explore episodes, streams, and models", done: progress.episodeTourSeen },
  ];

  return (
    <Dialog open={introOpen} onOpenChange={setIntroOpen}>
      <DialogContent className="overflow-hidden border-primary/20 p-0 sm:max-w-lg">
        <div className="bg-gradient-to-br from-primary/20 via-background to-cyan-500/10 px-6 pb-5 pt-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <RadioTower className="h-6 w-6" />
          </div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              Set up your operator workspace
              <Sparkles className="h-5 w-5 text-primary" />
            </DialogTitle>
            <DialogDescription className="text-sm">
              Connect your first robot through a guided setup, then take a
              quick, non-destructive tour of the operator tools.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 px-6 py-5">
          {checklist.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3"
            >
              <span
                className={
                  item.done
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"
                    : "flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground"
                }
              >
                {item.done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="border-t border-border/70 bg-muted/20 px-6 py-4">
          <Button variant="ghost" onClick={skipTour}>
            Skip for now
          </Button>
          <Button onClick={startSetup} className="min-w-32">
            Start setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
