import {
  defaultOnboardingProgress,
  ONBOARDING_RESTART_EVENT,
  readOnboardingProgress,
  writeOnboardingProgress,
} from "@/lib/onboarding";
import { useCallback, useEffect, useRef } from "react";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

interface OperatorOnboardingProps {
  enabled: boolean;
}

const walkthroughSteps: DriveStep[] = [
  {
    element: "[data-tour='robot-select']",
    popover: {
      title: "Select or add a robot",
      description:
        "Open this list to select an existing robot. Choose <b>Add robot</b> when you need to claim a new robot using its hash.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='control-select']",
    popover: {
      title: "Control device",
      description:
        "After selecting a robot, choose the device you will use for teleoperation.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='connect-button']",
    popover: {
      title: "Connect",
      description:
        "Select <b>Connect</b> to establish the live robot and control-device session. The button becomes available after both selections are made.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='record-episode']",
    popover: {
      title: "Record an episode",
      description:
        "Start a recording here. During recording, this same button becomes <b>Stop</b> so you can end and save the episode.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='pose-controls']",
    popover: {
      title: "Memorise a pose",
      description:
        "Save the robot's current pose for later restoration. Once saved, the clear control lets you delete the memorised pose after confirmation.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='help-button']",
    popover: {
      title: "Help",
      description:
        "Open the controller guide at any time. The Help panel also lets you restart this walkthrough.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='dataset-selector']",
    popover: {
      title: "Select or create a dataset",
      description:
        "Choose the dataset that will receive recorded episodes, or create a new dataset for a different task.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "[data-tour='more-streams-tab']",
    popover: {
      title: "Cameras",
      description:
        "Open additional camera views published by the robot and swap a secondary stream into the main view.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "[data-tour='episodes-tab']",
    popover: {
      title: "Episodes",
      description:
        "Browse, play, and manage recorded episodes. Delete actions require confirmation.",
      side: "left",
      align: "start",
    },
  },
  {
    element: "[data-tour='models-tab']",
    popover: {
      title: "Models",
      description:
        "Open Models to train and manage models associated with the selected dataset.",
      side: "left",
      align: "start",
    },
  },
];

export function OperatorOnboarding({ enabled }: OperatorOnboardingProps) {
  const driverRef = useRef<Driver | null>(null);
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
      startWalkthrough();
    };

    window.addEventListener(ONBOARDING_RESTART_EVENT, restart);
    return () => window.removeEventListener(ONBOARDING_RESTART_EVENT, restart);
  }, [enabled, startWalkthrough]);

  useEffect(() => {
    if (enabled && !readOnboardingProgress().completed) {
      startWalkthrough();
    }
  }, [enabled, startWalkthrough]);

  useEffect(
    () => () => {
      intentionalDestroyRef.current = true;
      driverRef.current?.destroy();
    },
    [],
  );

  if (!enabled) return null;

  return null;
}
