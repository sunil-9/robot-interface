import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useRobots } from "@/hooks/useRobots";
import { useWebRTCSession } from "@/hooks/useWebRTCSession";

const MAX_LOG_ENTRIES = 20;

const formatTimestamp = (date: Date) =>
  `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;

const WebRTCDebugPage = () => {
  const { data: robots = [], isLoading, error, refetch } = useRobots();
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [commandPayload, setCommandPayload] = useState<string>("{}");
  const [telemetryLog, setTelemetryLog] = useState<Array<{ stamp: Date; data: unknown }>>([]);

  const session = useWebRTCSession(selectedRobot);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }
    const element = videoRef.current;
    const stream = session.remoteStream ?? null;
    if (element.srcObject !== stream) {
      element.pause();
      element.srcObject = stream;
    }
    if (stream) {
      const playPromise = element.play();
      if (playPromise) {
        playPromise.catch((error) => {
          console.warn("Failed to autoplay remote stream:", error);
        });
      }
    } else {
      element.srcObject = null;
    }
  }, [session.remoteStream]);

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
            <h1 className="text-2xl font-semibold text-purple-300">WebRTC Debugger</h1>
            <p className="text-sm text-gray-400">
              Use this page to exercise the signaling flow between the operator UI and the robot
              backend via the cloud server.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-purple-200 hover:text-white">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-6 py-6 lg:grid-cols-[320px_1fr]">
        <Card className="bg-gray-900 border-purple-900/40">
          <CardHeader>
            <CardTitle className="text-lg text-purple-200">1. Pick a Robot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            {error && (
              <p className="text-sm text-red-300">
                {(error as Error).message ?? "Failed to load robots."}
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
                            robot.signaling.robot_connected
                              ? "border-green-500 text-green-300"
                              : "border-yellow-500 text-yellow-200"
                          }
                        >
                          {robot.signaling.robot_connected ? "signaling" : "waiting"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Controllers: {robot.signaling.controller_count} · Last heartbeat{" "}
                        {(robot.heartbeat_age_ms / 1000).toFixed(1)}s ago
                      </p>
                    </button>
                  );
                })}
                {robots.length === 0 && (
                  <p className="text-sm text-gray-400">No robots are advertising heartbeats.</p>
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
                  <strong className={session.signalingConnected ? "text-green-300" : "text-yellow-200"}>
                    {session.signalingConnected ? "connected" : "connecting"}
                  </strong>
                </span>
                <span>
                  Connection: <strong>{session.connectionState}</strong>
                </span>
                <span>
                  Telemetry:{" "}
                  <strong className={session.telemetryOpen ? "text-green-300" : "text-yellow-200"}>
                    {session.telemetryOpen ? "open" : "pending"}
                  </strong>
                </span>
              </div>
              {session.lastError && (
                <p className="text-sm text-red-300">Last error: {session.lastError}</p>
              )}
              {selectedRobotMeta && (
                <div className="rounded border border-purple-900/40 bg-gray-950/60 p-3 text-xs text-gray-300">
                  <p>Heartbeat interval: {selectedRobotMeta.heartbeat_interval ?? "n/a"}s</p>
                  <p>Last seen: {new Date(selectedRobotMeta.last_seen).toLocaleTimeString()}</p>
                  <p>
                    Operators connected: {selectedRobotMeta.signaling?.controller_count ?? 0} · Robot
                    signaling: {selectedRobotMeta.signaling?.robot_connected ? "online" : "offline"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-purple-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-purple-200">3. Video / Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-300">Remote Media Stream</p>
                  <div className="aspect-video w-full overflow-hidden rounded border border-purple-900/40 bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-300">Telemetry Log (latest {MAX_LOG_ENTRIES})</p>
                  <ScrollArea className="h-60 rounded border border-purple-900/40 bg-gray-950/60 p-3 text-xs text-gray-200">
                    <div className="space-y-2">
                      {telemetryLog.map((entry, idx) => (
                        <div key={idx} className="rounded bg-gray-900/80 p-2">
                          <p className="text-purple-300">{formatTimestamp(entry.stamp)}</p>
                          <pre className="whitespace-pre-wrap break-words text-gray-200">
                            {JSON.stringify(entry.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                      {telemetryLog.length === 0 && (
                        <p className="text-gray-500">No telemetry received yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-purple-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-purple-200">4. Send Control Messages</CardTitle>
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
                <label htmlFor="commandPayload" className="text-sm text-gray-300">
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
            Tip: open browser devtools to inspect raw signaling messages and confirm ICE negotiation.
          </p>
        </div>
      </main>
    </div>
  );
};

export default WebRTCDebugPage;
