import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { type WebRTCSession } from "@/hooks/useWebRTCSession";
import { Gamepad, Keyboard, MousePointer, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface InputTrackerProps {
  controlType: string | null;
  session?: WebRTCSession;
}

export const InputTracker = ({ controlType, session }: InputTrackerProps) => {
  const [lastInput, setLastInput] = useState<{
    type: "mouse" | "keyboard" | "gamepad" | null;
    key?: string;
    button?: number;
    position?: { x: number; y: number };
    timestamp: number;
  } | null>(null);

  const [isVisible, setIsVisible] = useState(true);
  const [gamepads, setGamepads] = useState<Gamepad[]>([]);

  type GamepadStateType = {
    buttons: Array<{ pressed: boolean; value: number }>;
    axes: number[];
  };

  const [gamepadState, setGamepadState] = useState<
    Record<string, GamepadStateType>
  >({});

  const canTrackKeyboard = !controlType
    ? true
    : controlType.toLowerCase().includes("keyboard");
  const canTrackMouse = !controlType
    ? true
    : controlType.toLowerCase().includes("mouse");
  const canTrackGamepad = !controlType
    ? true
    : controlType.toLowerCase().includes("gamepad") ||
      controlType.toLowerCase().includes("joystick");

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
    [session, controlType]
  );

  // Track mouse movements and clicks
  useEffect(() => {
    if (!canTrackMouse) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Only track significant movements to avoid flooding
      if (lastInput && lastInput.type === "mouse" && lastInput.position) {
        const dx = Math.abs(e.clientX - lastInput.position.x);
        const dy = Math.abs(e.clientY - lastInput.position.y);
        // Only update if moved more than 50px
        if (dx < 50 && dy < 50) return;
      }

      setLastInput({
        type: "mouse",
        position: { x: e.clientX, y: e.clientY },
        timestamp: Date.now(),
      });
    };

    const handleMouseClick = (e: MouseEvent) => {
      setLastInput({
        type: "mouse",
        button: e.button,
        position: { x: e.clientX, y: e.clientY },
        timestamp: Date.now(),
      });

      toast({
        title: "Mouse Input",
        description: `Button: ${
          e.button === 0 ? "Left" : e.button === 1 ? "Middle" : "Right"
        } at X: ${e.clientX}, Y: ${e.clientY}`,
        duration: 1500,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseClick);
    };
  }, [canTrackMouse, lastInput]);

  // Track keyboard input
  useEffect(() => {
    if (!canTrackKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture F5, browser shortcuts etc.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

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
    if (!canTrackGamepad) return;

    let animationFrameId: number;

    const updateGamepadState = () => {
      // Get all gamepads
      const connectedGamepads = navigator.getGamepads();
      const activeGamepads: Gamepad[] = [];

      for (const gamepad of connectedGamepads) {
        if (gamepad) {
          activeGamepads.push(gamepad);
        }
      }

      if (activeGamepads.length > 0) {
        setGamepads(activeGamepads);

        // Check for button presses
        activeGamepads.forEach((gamepad) => {
          const id = gamepad.id;
          const currentState = gamepadState[id] || { buttons: [] };

          // Check if any button state changed
          gamepad.buttons.forEach((button, index) => {
            const wasPressed =
              currentState.buttons && currentState.buttons[index]?.pressed;
            const isPressed = button.pressed;

            if (isPressed && !wasPressed) {
              setLastInput({
                type: "gamepad",
                button: index,
                timestamp: Date.now(),
              });

              sendTelemetry({
                source: "gamepad",
                kind: "button",
                button: index,
                value: button.value,
              });

              toast({
                title: "Gamepad Input",
                description: `Button: ${index} pressed`,
                duration: 1500,
              });
            }
          });

          // Store new state
          setGamepadState((prev) => ({
            ...prev,
            [id]: {
              buttons: gamepad.buttons.map((b) => ({
                pressed: b.pressed,
                value: b.value,
              })),
              axes: [...gamepad.axes],
            },
          }));

          // Check for significant axis movements
          gamepad.axes.forEach((axis, index) => {
            if (Math.abs(axis) > 0.5) {
              // Get previous axis value safely - handle potential undefined/incompatible types
              const prevAxis =
                typeof currentState === "object" &&
                currentState !== null &&
                "axes" in currentState &&
                Array.isArray(currentState.axes)
                  ? currentState.axes[index] || 0
                  : 0;

              // Only toast if significant change
              if (Math.abs(axis - prevAxis) > 0.3) {
                setLastInput({
                  type: "gamepad",
                  key: `axis-${index}`,
                  timestamp: Date.now(),
                });

                sendTelemetry({
                  source: "gamepad",
                  kind: "axis",
                  axis: index,
                  value: axis,
                });

                toast({
                  title: "Joystick Input",
                  description: `Axis ${index}: ${axis.toFixed(2)}`,
                  duration: 1500,
                });
              }
            }
          });
        });
      }

      animationFrameId = requestAnimationFrame(updateGamepadState);
    };

    // Start polling for gamepad input
    animationFrameId = requestAnimationFrame(updateGamepadState);

    // Handle gamepad connections
    const handleGamepadConnected = (e: GamepadEvent) => {
      toast({
        title: "Gamepad Connected",
        description: e.gamepad.id,
        duration: 3000,
      });
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      toast({
        title: "Gamepad Disconnected",
        description: e.gamepad.id,
        duration: 3000,
      });

      setGamepadState((prev) => {
        const newState = { ...prev };
        delete newState[e.gamepad.id];
        return newState;
      });
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected
      );
    };
  }, [canTrackGamepad, gamepadState, sendTelemetry]);

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
        return `${
          lastInput.button !== undefined
            ? `Button ${lastInput.button}`
            : lastInput.key || "Input"
        } ${timeSince > 0 ? `${timeSince}s ago` : "just now"}`;
      default:
        return "Unknown input";
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 z-50 bg-black/30 backdrop-blur-sm border-gray-800 shadow-lg p-3 max-w-xs">
      <div className="flex justify-between items-center">
        <Badge
          variant="outline"
          className="bg-purple-900/30 border-purple-800 px-2 py-0.5 mb-2"
        >
          {controlType
            ? controlType.charAt(0).toUpperCase() + controlType.slice(1)
            : "All"}{" "}
          Input Tracker
        </Badge>
        <button
          className="text-gray-500 hover:text-gray-300"
          onClick={() => setIsVisible(false)}
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center mt-1">
        <div className="bg-gray-800 rounded-full p-1.5 mr-3">
          {getInputIcon()}
        </div>
        <div className="text-xs text-gray-300">{getInputDescription()}</div>
      </div>

      {gamepads.length > 0 && (
        <div className="mt-2 border-t border-gray-800 pt-2">
          <div className="text-xs text-gray-500 mb-1">Connected gamepads:</div>
          {gamepads.map((gamepad, index) => (
            <div key={gamepad.id} className="text-xs text-gray-400 truncate">
              {index + 1}: {gamepad.id}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
