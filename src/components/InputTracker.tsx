import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useEpisodeControlContext } from "@/hooks/useEpisodeControl";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import { Gamepad, Keyboard, MousePointer, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const FRAME_INTERVAL_MS = 20;
const AXIS_DEADZONE = 0.1;
const BUTTON_REPEAT_INTERVAL_MS = 500;
const BUTTON_ACTIVE_THRESHOLD = 0.1;

type GamepadState = {
  lastSent: number;
  axes: number[];
  buttons: Array<{ pressed: boolean; value: number }>;
};

type GamepadStateMap = Record<number, GamepadState>;

interface InputTrackerProps {
  controlType: string | null;
  session?: WebRTCSession;
}

export const InputTracker = ({ controlType, session }: InputTrackerProps) => {
  const episodeControl = useEpisodeControlContext();
  const [lastInput, setLastInput] = useState<{
    type: "mouse" | "keyboard" | "gamepad" | null;
    key?: string;
    button?: number;
    position?: { x: number; y: number };
    timestamp: number;
  } | null>(null);

  const [isVisible, setIsVisible] = useState(() => {
    const saved = localStorage.getItem("input-tracker-visible");
    return saved !== null ? saved === "true" : true;
  });
  const [gamepads, setGamepads] = useState<Gamepad[]>([]);
  const gamepadStateRef = useRef<GamepadStateMap>({});

  const frameRequestRef = useRef<number>();

  const canTrackKeyboard = !controlType
    ? true
    : controlType.toLowerCase().includes("keyboard");
  // const canTrackMouse = !controlType
  //   ? true
  //   : controlType.toLowerCase().includes("mouse");
  const canTrackGamepad = !controlType
    ? true
    : controlType.toLowerCase() === "ps5joystick";

  const sendTelemetry = useCallback(
    (payload: Record<string, unknown>) => {
      if (!session) {
        return;
      }
      const envelope = {
        type: "command",
        controller: controlType ?? "unknown",
        timestamp: Date.now(),
        ...payload,
      };
      const ok = session.sendControl(envelope);
      if (!ok) {
        console.warn("Failed to send input telemetry", envelope);
      }
    },
    [session, controlType],
  );

  // Track mouse movements and clicks
  // useEffect(() => {
  //   if (!canTrackMouse) return;

  //   const handleMouseMove = (e: MouseEvent) => {
  //     // Only track significant movements to avoid flooding
  //     if (lastInput && lastInput.type === "mouse" && lastInput.position) {
  //       const dx = Math.abs(e.clientX - lastInput.position.x);
  //       const dy = Math.abs(e.clientY - lastInput.position.y);
  //       // Only update if moved more than 50px
  //       if (dx < 50 && dy < 50) return;
  //     }

  //     setLastInput({
  //       type: "mouse",
  //       position: { x: e.clientX, y: e.clientY },
  //       timestamp: Date.now(),
  //     });
  //   };

  // const handleMouseClick = (e: MouseEvent) => {
  // setLastInput({
  //   type: "mouse",
  //   button: e.button,
  //   position: { x: e.clientX, y: e.clientY },
  //   timestamp: Date.now(),
  // });

  // toast({
  //   title: "Mouse Input",
  //   description: `Button: ${
  //     e.button === 0 ? "Left" : e.button === 1 ? "Middle" : "Right"
  //   } at X: ${e.clientX}, Y: ${e.clientY}`,
  //   duration: 1500,
  // });
  // };

  // window.addEventListener("mousemove", handleMouseMove);
  // window.addEventListener("mousedown", handleMouseClick);

  // return () => {
  //   window.removeEventListener("mousemove", handleMouseMove);
  //   window.removeEventListener("mousedown", handleMouseClick);
  // };
  // }, [canTrackMouse, lastInput]);

  // Track keyboard input

  useEffect(() => {
    if (!canTrackKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture F5, browser shortcuts etc.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      console.log("key pressed: ", e.key);

      setLastInput({
        type: "keyboard",
        key: e.key,
        timestamp: Date.now(),
      });

      sendTelemetry({
        source: "keyboard",
        key: e.key,
        code: e.code,
        repeat: e.repeat,
      });

      toast({
        title: "Keyboard Input",
        description: `Key: ${e.key} (${e.code})`,
        duration: 1500,
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canTrackKeyboard, sendTelemetry]);

  // Track gamepad/joystick input
  useEffect(() => {
    if (!canTrackGamepad) {
      return;
    }

    const pollGamepads = () => {
      const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const connected = Array.from(rawGamepads).filter(
        (item): item is Gamepad => Boolean(item),
      );

      setGamepads(connected);

      const now = Date.now();
      const stateMap = gamepadStateRef.current;

      // Clean up state for disconnected controllers
      Object.keys(stateMap).forEach((indexStr) => {
        const index = Number.parseInt(indexStr, 10);
        if (!connected.some((gamepad) => gamepad.index === index)) {
          delete stateMap[index];
        }
      });

      connected.forEach((gamepad) => {
        const index = gamepad.index;

        // Initialize state if needed
        if (!stateMap[index]) {
          stateMap[index] = {
            lastSent: 0,
            axes: gamepad.axes.map(() => 0),
            buttons: gamepad.buttons.map(() => ({ pressed: false, value: 0 })),
          };
        }

        const state = stateMap[index];

        // Check if enough time has passed since last send
        if (now - state.lastSent < FRAME_INTERVAL_MS) {
          return;
        }

        // Apply deadzone to axes
        const normalizedAxes = gamepad.axes.map((value) =>
          Math.abs(value) < AXIS_DEADZONE ? 0 : value,
        );

        // Check if any axes or buttons have changed
        const axesChanged = normalizedAxes.some(
          (value, idx) => Math.abs(value - (state.axes[idx] || 0)) > 0.01,
        );
        const buttonsChanged = gamepad.buttons.some(
          (button, idx) =>
            button.pressed !== state.buttons[idx]?.pressed ||
            Math.abs(button.value - (state.buttons[idx]?.value || 0)) > 0.01,
        );

        const axesActive = normalizedAxes.some((value) => value !== 0);
        const buttonsActive = gamepad.buttons.some(
          (button) => button.pressed || button.value > BUTTON_ACTIVE_THRESHOLD,
        );
        const shouldRepeat =
          !axesChanged &&
          !buttonsChanged &&
          (axesActive || buttonsActive) &&
          now - state.lastSent >= BUTTON_REPEAT_INTERVAL_MS;

        // Only send if something changed
        if (!axesChanged && !buttonsChanged && !shouldRepeat) {
          return;
        }

        // Update state
        if (axesChanged) {
          state.axes = [...normalizedAxes];
        }
        if (buttonsChanged) {
          state.buttons = gamepad.buttons.map((button) => ({
            pressed: button.pressed,
            value: button.value,
          }));
        }
        state.lastSent = now;

        // Build axes object
        const axesRecord: Record<string, number> = {};
        state.axes.forEach((value, idx) => {
          axesRecord[idx.toString()] = value;
        });

        // Build buttons object
        const buttonsRecord: Record<string, number> = {};
        state.buttons.forEach((button, idx) => {
          buttonsRecord[idx.toString()] = button.value;
        });

        // Update last input for UI
        setLastInput({
          type: "gamepad",
          timestamp: now,
        });

        // Send the complete gamepad state
        if (!session) {
          return;
        }

        // Button 0 = stop/end episode, Button 3 = start episode
        if (buttonsRecord[0] === 1) {
          episodeControl.endEpisode();
          return;
        }

        if (buttonsRecord[3] === 1) {
          episodeControl.startEpisode();
          return;
        }

        // Send control commands for all other inputs
        const payload = {
          type: "control",
          timestamp: now,
          device: {
            gamepad: {
              id: gamepad.id,
              index: gamepad.index,
            },
          },
          axes: axesRecord,
          buttons: buttonsRecord,
        };

        const ok = session.sendControl(payload);
        if (!ok) {
          console.warn("Failed to send gamepad state", payload);
        }
      });

      frameRequestRef.current = requestAnimationFrame(pollGamepads);
    };

    frameRequestRef.current = requestAnimationFrame(pollGamepads);

    const handleGamepadConnected = (event: GamepadEvent) => {
      toast({
        title: "Gamepad Connected",
        description: event.gamepad.id,
        duration: 3000,
      });
    };

    const handleGamepadDisconnected = (event: GamepadEvent) => {
      toast({
        title: "Gamepad Disconnected",
        description: event.gamepad.id,
        duration: 3000,
      });

      delete gamepadStateRef.current[event.gamepad.index];
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    return () => {
      if (frameRequestRef.current !== undefined) {
        cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = undefined;
      }
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected,
      );
    };
  }, [canTrackGamepad, session, episodeControl]);

  if (!isVisible) return null;

  const getInputIcon = () => {
    if (!lastInput) return <MousePointer className="h-4 w-4" />;

    switch (lastInput.type) {
      case "mouse":
        return <MousePointer className="h-4 w-4" />;
      case "keyboard":
        return <Keyboard className="h-4 w-4" />;
      case "gamepad":
        return <Gamepad className="h-4 w-4" />;
      default:
        return <MousePointer className="h-4 w-4" />;
    }
  };

  const getInputDescription = () => {
    if (!lastInput) return "No input detected";

    const timeSince = Math.round((Date.now() - lastInput.timestamp) / 1000);

    switch (lastInput.type) {
      case "mouse":
        return `Mouse ${
          lastInput.button !== undefined ? `button ${lastInput.button}` : "move"
        } ${
          lastInput.position
            ? `at (${lastInput.position.x}, ${lastInput.position.y})`
            : ""
        } ${timeSince > 0 ? `${timeSince}s ago` : "just now"}`;
      case "keyboard":
        return `Key "${lastInput.key}" ${
          timeSince > 0 ? `${timeSince}s ago` : "just now"
        }`;
      case "gamepad":
        return `Gamepad active ${
          timeSince > 0 ? `${timeSince}s ago` : "just now"
        }`;
      default:
        return "Unknown input";
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 z-50 max-w-xs border border-border bg-card/90 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.2)] backdrop-blur dark:shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className="mb-2 border-primary/30 bg-primary/10 px-2 py-0.5 text-primary"
        >
          {controlType
            ? controlType.charAt(0).toUpperCase() + controlType.slice(1)
            : "All"}{" "}
          Input Tracker
        </Badge>
        <button
          className="text-muted-foreground transition hover:text-foreground"
          onClick={() => {
            setIsVisible(false);
            localStorage.setItem("input-tracker-visible", "false");
          }}
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-1 flex items-center">
        <div className="mr-3 rounded-full bg-muted p-1.5 text-foreground">
          {getInputIcon()}
        </div>
        <div className="text-xs text-foreground">{getInputDescription()}</div>
      </div>

      {gamepads.length > 0 && (
        <div className="mt-2 border-t border-border pt-2">
          <div className="mb-1 text-xs text-muted-foreground">
            Connected gamepads:
          </div>
          {gamepads.map((gamepad, index) => (
            <div key={gamepad.id} className="truncate text-xs text-foreground">
              {index + 1}: {gamepad.id}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
