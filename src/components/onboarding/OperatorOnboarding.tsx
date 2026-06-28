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
  writeOnboardingProgress,
} from "@/lib/onboarding";
import { Check, PanelRight, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

interface OperatorOnboardingProps {
  enabled: boolean;
}

const walkthroughSteps: DriveStep[] = [
  {
    element: "[data-tour='robot-select']",
    popover: {
      title: "Header · Select or add a robot",
      description:
        "Open this list to select an existing robot. Choose <b>Add robot</b> when you need to claim a new robot using its hash.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='control-select']",
    popover: {
      title: "Header · Control device",
      description:
        "After selecting a robot, choose the device you will use for teleoperation.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='connect-button']",
    popover: {
      title: "Header · Connect",
      description:
        "Select <b>Connect</b> to establish the live robot and control-device session. The button becomes available after both selections are made.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='record-episode']",
    popover: {
      title: "Footer · Record an episode",
      description:
        "Start a recording here. During recording, this same button becomes <b>Stop</b> so you can end and save the episode.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='pose-controls']",
    popover: {
      title: "Footer · Memorise a pose",
      description:
        "Save the robot's current pose for later restoration. Once saved, the clear control lets you delete the memorised pose after confirmation.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='help-button']",
    popover: {
      title: "Footer · Help",
      description:
        "Open the controller guide at any time. The Help panel also lets you restart this walkthrough.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='dataset-selector']",
    popover: {
      title: "Sidebar · Select or create a dataset",
      description:
        "Choose the dataset that will receive recorded episodes, or create a new dataset for a different task.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "[data-tour='more-streams-tab']",
    popover: {
      title: "Sidebar · More streams",
      description:
        "Open additional camera streams published by the robot and swap a secondary stream into the main view.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "[data-tour='episodes-tab']",
    popover: {
      title: "Sidebar · Episodes",
      description:
        "Browse, play, and manage recorded episodes. Delete actions require confirmation.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "[data-tour='models-tab']",
    popover: {
      title: "Sidebar · Models",
      description:
        "Open Models to train and manage models associated with the selected dataset.",
      side: "left",
      align: "start",
    },
  },
];

export function OperatorOnboarding({ enabled }: OperatorOnboardingProps) {
  const [introOpen, setIntroOpen] = useState(
    () => enabled && !readOnboardingProgress().completed,
  );
  const driverRef = useRef<Driver | null>(null);
  const wasEnabledRef = useRef(enabled);
  const intentionalDestroyRef = useRef(false);

  const saveFinished = useCallback((skipped: boolean) => {
    writeOnboardingProgress({
      ...defaultOnboardingProgress,
      episodeTourSeen: true,
      sidebarTourSeen: true,
      completed: true,
      skipped,
    });
  }, []);

  const stopWalkthrough = useCallback((skipped: boolean) => {
    intentionalDestroyRef.current = true;
    driverRef.current?.destroy();
    driverRef.current = null;
    saveFinished(skipped);
    window.setTimeout(() => {
      intentionalDestroyRef.current = false;
    }, 0);
  }, [saveFinished]);

  const startWalkthrough = useCallback(() => {
    setIntroOpen(false);
    intentionalDestroyRef.current = true;
    driverRef.current?.destroy();
    intentionalDestroyRef.current = false;

    const walkthrough = driver({
      animate: true,
      allowClose: true,
      overlayColor: "#020617",
      overlayOpacity: 0.72,
      stagePadding: 8,
      stageRadius: 14,
      popoverClass: "im-operator-tour",
      showButtons: ["previous", "next", "close"],
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Previous",
      doneBtnText: "Done",
      steps: walkthroughSteps,
      onPopoverRender: (popover) => {
        if (popover.footerButtons.querySelector("[data-onboarding-skip]")) {
          return;
        }
        const skip = document.createElement("button");
        skip.type = "button";
        skip.dataset.onboardingSkip = "true";
        skip.className = "im-tour-skip";
        skip.textContent = "Skip";
        skip.addEventListener("click", () => stopWalkthrough(true));
        popover.footerButtons.prepend(skip);
      },
      onDestroyed: () => {
        driverRef.current = null;
        if (!intentionalDestroyRef.current) {
          saveFinished(false);
        }
      },
    });

    driverRef.current = walkthrough;
    walkthrough.drive();
  }, [saveFinished, stopWalkthrough]);

  useEffect(() => {
    if (!enabled) return;

    const restart = () => {
      intentionalDestroyRef.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
      intentionalDestroyRef.current = false;
      writeOnboardingProgress(defaultOnboardingProgress);
      setIntroOpen(true);
    };

    window.addEventListener(ONBOARDING_RESTART_EVENT, restart);
    return () => window.removeEventListener(ONBOARDING_RESTART_EVENT, restart);
  }, [enabled]);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current && !readOnboardingProgress().completed) {
      setIntroOpen(true);
    }
    wasEnabledRef.current = enabled;
  }, [enabled]);

  useEffect(
    () => () => {
      intentionalDestroyRef.current = true;
      driverRef.current?.destroy();
    },
    [],
  );

  if (!enabled) return null;

  const sections = [
    "Header: robot and control device",
    "Footer: episodes, pose, and help",
    "Sidebar: datasets, streams, episodes, and models",
  ];

  return (
    <Dialog open={introOpen} onOpenChange={setIntroOpen}>
      <DialogContent className="overflow-hidden border-primary/20 p-0 sm:max-w-lg">
        <div className="bg-gradient-to-br from-primary/20 via-background to-cyan-500/10 px-6 pb-5 pt-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <PanelRight className="h-6 w-6" />
          </div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              Operator interface walkthrough
              <Sparkles className="h-5 w-5 text-primary" />
            </DialogTitle>
            <DialogDescription>
              A short, read-only tour of the three main areas. You will not be
              required to connect a robot or perform any action.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 px-6 py-5">
          {sections.map((section) => (
            <div
              key={section}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{section}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="border-t border-border/70 bg-muted/20 px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              setIntroOpen(false);
              saveFinished(true);
            }}
          >
            Skip
          </Button>
          <Button onClick={startWalkthrough} className="min-w-32">
            Start walkthrough
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
