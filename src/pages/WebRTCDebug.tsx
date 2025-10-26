import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRobots } from "@/hooks/useRobots";
import { useWebRTCSession } from "@/hooks/useWebRTCSession";
import type { Robot } from "@/types/robot";

const MAX_LOG_ENTRIES = 20;
const AXIS_DEADZONE = 0.08;
const AXIS_DELTA_THRESHOLD = 0.05;
const EMPTY_ROBOT_LIST: Robot[] = [];

const formatTimestamp = (date: Date) =>
  `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;

const RemoteVideoTile = ({
  cameraLabel,
  stream,
  connected,
}: {
  cameraLabel: string;
  stream: MediaStream | null;
  connected: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    if (!stream) {
      element.pause();
      element.srcObject = null;
      return;
    }

    if (element.srcObject !== stream) {
      element.srcObject = stream;
    }

    const playPromise = element.play();
    if (playPromise) {
      playPromise.catch((error) => {
        console.warn("Failed to autoplay remote stream:", error);
      });
    }

    return () => {
      element.pause();
      element.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-300">
        <span>{cameraLabel}</span>
        <Badge
          variant="outline"
          className={
            connected
              ? "border-green-500 text-green-300"
              : "border-yellow-500 text-yellow-200"
          }
        >
          {connected ? "connected" : "waiting"}
        </Badge>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded border border-purple-900/40 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-contain"
        />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Waiting for stream...
          </div>
        )}
      </div>
    </div>
  );
};

type GamepadSummary = {
  index: number;
  id: string;
};

type GamepadSnapshot = {
  index: number;
  id: string;
  timestamp: number;
  axes: Record<string, number>;
  buttons: Record<string, { pressed: boolean; value: number }>;
};

const WebRTCDebugPage = () => {
  const {
    robotPresence: robotPresenceList,
    loading: isLoading,
    error: robotsError,
    refreshRobots,
  } = useRobots();
  const robots = robotPresenceList ?? EMPTY_ROBOT_LIST;
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [commandPayload, setCommandPayload] = useState<string>("{}");
  const [telemetryLog, setTelemetryLog] = useState<
    Array<{ stamp: Date; data: unknown }>
  >([]);
  const [gamepadSummaries, setGamepadSummaries] = useState<GamepadSummary[]>([]);
  const [gamepadSnapshots, setGamepadSnapshots] = useState<GamepadSnapshot[]>(
    []
  );

  const session = useWebRTCSession(selectedRobot);
  const videoTiles = useMemo(() => {
    const matched =
      session.expectedCameras.length > 0
        ? session.expectedCameras.map((camera) => {
            const entry = session.remoteStreams.find(
              (item) => item.camera === camera
            );
            return {
              key: camera,
              label: camera,
              stream: entry?.stream ?? null,
              connected: Boolean(entry),
            };
          })
        : [];

    const extras = session.remoteStreams
      .filter((item) => {
        if (session.expectedCameras.length === 0) {
          return true;
        }
        if (!item.camera) {
          return true;
        }
        return !session.expectedCameras.includes(item.camera);
      })
      .map((item) => ({
        key: item.id,
        label: item.camera ?? item.id,
        stream: item.stream,
        connected: true,
      }));

    return [...matched, ...extras];
  }, [session.expectedCameras, session.remoteStreams]);

  useEffect(() => {
    if (!session.robotId) {
      setTelemetryLog([]);
      return;
    }

    const unsubscribe = session.onTelemetry((payload) => {
      setTelemetryLog((prev) => {
        const entry = { stamp: new Date(), data: payload };
        const next = [entry, ...prev];
        return next.slice(0, MAX_LOG_ENTRIES);
      });
    });

    return () => {
      unsubscribe();
    };
  }, [session]);

  const selectedRobotMeta = useMemo(
    () => robots.find((robot) => robot.robot_id === selectedRobot) ?? null,
    [robots, selectedRobot]
  );

  const { robotId: activeRobotId, telemetryOpen: telemetryActive, sendControl: sendTelemetryControl } = session;

  useEffect(() => {
    if (typeof navigator === "undefined" || !("getGamepads" in navigator)) {
      return;
    }

    let disposed = false;
    let animationFrameId = 0;
    const previousState = new Map<
      number,
      { buttons: Array<{ pressed: boolean; value: number }>; axes: number[] }
    >();

    const pollGamepads = () => {
      if (disposed) {
        return;
      }

      const rawGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const connected = Array.from(rawGamepads).filter((item): item is Gamepad => Boolean(item));

      const connectedIndexes = new Set(connected.map((gamepad) => gamepad.index));
      previousState.forEach((_, index) => {
        if (!connectedIndexes.has(index)) {
          previousState.delete(index);
        }
      });

      const snapshot = connected
        .map((gamepad) => ({
          index: gamepad.index,
          id: gamepad.id,
        }))
        .sort((a, b) => a.index - b.index);

      setGamepadSummaries((prev) => {
        if (
          prev.length === snapshot.length &&
          prev.every(
            (item, idx) =>
              item.index === snapshot[idx]?.index && item.id === snapshot[idx]?.id
          )
        ) {
          return prev;
        }
        return snapshot;
      });

      const snapshots: GamepadSnapshot[] = [];

      connected.forEach((gamepad) => {
        const stored =
          previousState.get(gamepad.index) ??
          {
            buttons: gamepad.buttons.map((button) => ({
              pressed: button.pressed,
              value: button.value,
            })),
            axes: [...gamepad.axes],
          };

        if (stored.buttons.length < gamepad.buttons.length) {
          stored.buttons = gamepad.buttons.map((button, idx) => ({
            pressed: stored.buttons[idx]?.pressed ?? button.pressed,
            value: stored.buttons[idx]?.value ?? button.value,
          }));
        }
        if (stored.axes.length < gamepad.axes.length) {
          stored.axes = gamepad.axes.map((value, idx) => stored.axes[idx] ?? value);
        }

        const normalizedAxes = gamepad.axes.map((value, index) => {
          const adjusted = index === 3 ? value * -1 : value;
          return Math.abs(adjusted) < AXIS_DEADZONE ? 0 : adjusted;
        });

        const axesRecord: Record<string, number> = {};
        normalizedAxes.forEach((value, index) => {
          axesRecord[index.toString()] = value;
        });

        const buttonsRecord: Record<string, { pressed: boolean; value: number }> = {};
        gamepad.buttons.forEach((button, index) => {
          buttonsRecord[index.toString()] = {
            pressed: button.pressed,
            value: button.value,
          };
        });

        const timestamp = Date.now();

        snapshots.push({
          index: gamepad.index,
          id: gamepad.id,
          timestamp,
          axes: axesRecord,
          buttons: buttonsRecord,
        });

        if (telemetryActive && activeRobotId) {
          const payload = {
            type: "control",
            timestamp,
            gamepad: { id: gamepad.id, index: gamepad.index },
            axes: axesRecord,
            buttons: buttonsRecord,
          };
          console.log("WebRTC sending control snapshot:", payload);
          const sent = sendTelemetryControl(payload);
          if (!sent) {
            console.warn("Failed to forward gamepad state over telemetry channel.");
          }
        }

        previousState.set(gamepad.index, {
          axes: normalizedAxes,
          buttons: gamepad.buttons.map((button) => ({
            pressed: button.pressed,
            value: button.value,
          })),
        });
      });

      setGamepadSnapshots((prev) => {
        if (prev.length === snapshots.length) {
          const same = prev.every((item, index) => {
            const next = snapshots[index];
            if (!next) {
              return false;
            }
            if (item.index !== next.index || item.id !== next.id) {
              return false;
            }
            const axesEqual =
              Object.keys(item.axes).length === Object.keys(next.axes).length &&
              Object.entries(item.axes).every(([key, value]) => next.axes[key] === value);
            if (!axesEqual) {
              return false;
            }
            const buttonsEqual =
              Object.keys(item.buttons).length === Object.keys(next.buttons).length &&
              Object.entries(item.buttons).every(([key, value]) => {
                const target = next.buttons[key];
                return (
                  target &&
                  target.pressed === value.pressed &&
                  target.value === value.value
                );
              });
            return buttonsEqual;
          });
          if (same) {
            return prev;
          }
        }
        return snapshots;
      });

      animationFrameId = window.requestAnimationFrame(pollGamepads);
    };

    animationFrameId = window.requestAnimationFrame(pollGamepads);

    return () => {
      disposed = true;
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      previousState.clear();
    };
  }, [activeRobotId, telemetryActive, sendTelemetryControl]);

  const handleSendPing = () => {
    session.sendControl({ type: "ping", timestamp: Date.now() });
  };

  const handleSendCommand = () => {
    try {
      const parsed = JSON.parse(commandPayload || "{}");
      session.sendControl({ type: "command", data: parsed });
    } catch (err) {
      console.warn("Invalid command payload:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-purple-900/40 bg-black/80 py-4">
        <div className="container mx-auto flex items-center justify-between px-6">
          <div>
            <h1 className="text-2xl font-semibold text-purple-300">
              WebRTC Debugger
            </h1>
            <p className="text-sm text-gray-400">
              Use this page to exercise the signaling flow between the operator
              UI and the robot backend via the cloud server.
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            className="text-purple-200 hover:text-white"
          >
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-6 py-6 lg:grid-cols-[320px_1fr]">
        <Card className="bg-gray-900 border-purple-900/40">
          <CardHeader>
            <CardTitle className="text-lg text-purple-200">
              1. Pick a Robot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => refreshRobots()}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            {robotsError && (
              <p className="text-sm text-red-300">
                {robotsError ?? "Failed to load robots."}
              </p>
            )}
            <ScrollArea className="h-64 rounded border border-purple-900/40 bg-gray-950/60 p-2">
              <div className="space-y-3">
                {robots.map((robot) => {
                  const isSelected = robot.robot_id === selectedRobot;
                  return (
                    <button
                      key={robot.robot_id}
                      type="button"
                      onClick={() => setSelectedRobot(robot.robot_id)}
                      className={`w-full rounded border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-purple-500 bg-purple-900/40 text-purple-100"
                          : "border-purple-900/40 bg-gray-900 hover:border-purple-700 hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{robot.robot_id}</span>
                        <Badge
                          variant="outline"
                          className={
                            robot.signaling?.robot_connected
                              ? "border-green-500 text-green-300"
                              : "border-yellow-500 text-yellow-200"
                          }
                        >
                          {robot.signaling?.robot_connected
                            ? "signaling"
                            : "waiting"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Controllers:{" "}
                        {robot.signaling?.controller_count ??
                          robot.signaling?.operator_count ??
                          0}{" "}
                        · Last heartbeat{" "}
                        {(robot.heartbeat_age_ms / 1000).toFixed(1)}s ago
                      </p>
                    </button>
                  );
                })}
                {robots.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No robots are advertising heartbeats.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-gray-900 border-purple-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-purple-200">
                2. Connection Status {selectedRobot ? `(${selectedRobot})` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200">
                <span>
                  Signaling:{" "}
                  <strong
                    className={
                      session.signalingConnected
                        ? "text-green-300"
                        : "text-yellow-200"
                    }
                  >
                    {session.signalingConnected ? "connected" : "connecting"}
                  </strong>
                </span>
                <span>
                  Connection: <strong>{session.connectionState}</strong>
                </span>
                <span>
                  Telemetry:{" "}
                  <strong
                    className={
                      session.telemetryOpen
                        ? "text-green-300"
                        : "text-yellow-200"
                    }
                  >
                    {session.telemetryOpen ? "open" : "pending"}
                  </strong>
                </span>
              </div>
              {session.lastError && (
                <p className="text-sm text-red-300">
                  Last error: {session.lastError}
                </p>
              )}
              {selectedRobotMeta && (
                <div className="rounded border border-purple-900/40 bg-gray-950/60 p-3 text-xs text-gray-300">
                  <p>
                    Heartbeat interval:{" "}
                    {selectedRobotMeta.heartbeat_interval ?? "n/a"}s
                  </p>
                  <p>
                    Last seen:{" "}
                    {new Date(selectedRobotMeta.last_seen).toLocaleTimeString()}
                  </p>
                  <p>
                    Operators connected:{" "}
                    {selectedRobotMeta.signaling?.controller_count ??
                      selectedRobotMeta.signaling?.operator_count ??
                      0}{" "}
                    · Robot signaling:{" "}
                    {selectedRobotMeta.signaling?.robot_connected
                      ? "online"
                      : "offline"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-purple-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-purple-200">
                3. Video / Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <p>Remote Media Streams</p>
                    {session.expectedCameras.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {session.expectedCameras.length} configured cameras
                      </span>
                    )}
                  </div>
                  {videoTiles.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {videoTiles.map((tile) => (
                        <RemoteVideoTile
                          key={tile.key}
                          cameraLabel={tile.label}
                          stream={tile.stream}
                          connected={tile.connected}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-purple-900/40 bg-gray-950/60 p-6 text-center text-sm text-gray-400">
                      No remote streams detected yet.
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-300">
                    Telemetry Log (latest {MAX_LOG_ENTRIES})
                  </p>
                  <ScrollArea className="h-60 rounded border border-purple-900/40 bg-gray-950/60 p-3 text-xs text-gray-200">
                    <div className="space-y-2">
                      {telemetryLog.map((entry, idx) => (
                        <div key={idx} className="rounded bg-gray-900/80 p-2">
                          <p className="text-purple-300">
                            {formatTimestamp(entry.stamp)}
                          </p>
                          <pre className="whitespace-pre-wrap break-words text-gray-200">
                            {JSON.stringify(entry.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                      {telemetryLog.length === 0 && (
                        <p className="text-gray-500">
                          No telemetry received yet.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-purple-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-purple-200">4. Gamepad Input Monitor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-300">Connected gamepads</p>
                {gamepadSummaries.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {gamepadSummaries.map((summary) => (
                      <div
                        key={`${summary.index}-${summary.id}`}
                        className="rounded border border-purple-900/40 bg-gray-950/70 p-2 text-xs text-gray-200"
                      >
                        <p className="text-purple-300 font-medium">
                          #{summary.index} &mdash; {summary.id || "Unnamed controller"}
                        </p>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">
                      Press any button to wake a sleeping controller.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    No gamepads detected. Connect a controller and press any button to wake it.
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-300">Current controller state</p>
                <ScrollArea className="mt-2 max-h-80 rounded border border-purple-900/40 bg-gray-950/60 p-3">
                  <div className="space-y-3">
                    {gamepadSnapshots.length > 0 ? (
                      gamepadSnapshots.map((snapshot) => (
                        <div
                          key={`${snapshot.index}-${snapshot.id}`}
                          className="space-y-2 rounded bg-gray-900/80 p-2 text-xs text-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-purple-300 font-medium">
                              #{snapshot.index} &mdash; {snapshot.id || "Controller"}
                            </p>
                            <span className="text-[10px] text-gray-500">
                              {formatTimestamp(new Date(snapshot.timestamp))}
                            </span>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Axes</p>
                            <div className="mt-1 grid grid-cols-2 gap-1">
                              {Object.entries(snapshot.axes).map(([key, value]) => (
                                <div
                                  key={`axis-${key}`}
                                  className="rounded border border-purple-900/40 bg-gray-950/70 px-2 py-1"
                                >
                                  <p className="font-medium text-purple-200">Axis {key}</p>
                                  <p className="text-gray-300">{value.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Buttons</p>
                            <div className="mt-1 grid grid-cols-2 gap-1">
                              {Object.entries(snapshot.buttons).map(([key, info]) => (
                                <div
                                  key={`button-${key}`}
                                  className={`rounded border px-2 py-1 ${
                                    info.pressed
                                      ? "border-green-600 bg-green-900/40 text-green-200"
                                      : "border-purple-900/40 bg-gray-950/70 text-gray-300"
                                  }`}
                                >
                                  <p className="font-medium">
                                    Button {key} {info.pressed ? "●" : ""}
                                  </p>
                                  <p className="text-gray-300">{info.value.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">No inputs captured yet.</p>
                    )}
                  </div>
                </ScrollArea>
                <p className="mt-2 text-xs text-gray-500">
                  Controller snapshots stream continuously over the telemetry channel.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-purple-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-purple-200">5. Send Control Messages</CardTitle>
              <CardTitle className="text-lg text-purple-200">
                4. Send Control Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSendPing}
                  disabled={!session.robotId || !session.telemetryOpen}
                  variant="outline"
                >
                  Send Ping
                </Button>
                <Button
                  onClick={handleSendCommand}
                  disabled={!session.robotId || !session.telemetryOpen}
                  variant="secondary"
                >
                  Send Command
                </Button>
                <Button
                  onClick={() => setSelectedRobot(null)}
                  disabled={!session.robotId}
                  variant="ghost"
                  className="text-red-300"
                >
                  Disconnect
                </Button>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="commandPayload"
                  className="text-sm text-gray-300"
                >
                  Command payload (JSON)
                </label>
                <Input
                  id="commandPayload"
                  value={commandPayload}
                  onChange={(event) => setCommandPayload(event.target.value)}
                  className="bg-gray-950 text-gray-100"
                />
              </div>
            </CardContent>
          </Card>

          <Separator className="border-purple-900/40" />
          <p className="text-xs text-gray-500">
            Tip: open browser devtools to inspect raw signaling messages and
            confirm ICE negotiation.
          </p>
        </div>
      </main>
    </div>
  );
};

export default WebRTCDebugPage;
