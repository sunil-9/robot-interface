import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Info, Play, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Header } from "@/components/Header";
import InlineSvg from "@/components/InlineSvg";
import {
  ControlDeviceSkeleton,
  EmptyControlDeviceState,
  EmptyRobotState,
  RobotSkeleton,
} from "@/components/RobotSkeleton";
import { useRobots } from "@/hooks/useRobots";
import { cn } from "@/lib/utils";
import { AppRobot } from "@/types/robot";

export default function Home() {
  const navigate = useNavigate();
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [activeMode] = useState("train");

  // Fetch robots using our custom hook
  const {
    robots,
    controlDevices,
    loading,
    loadingDevices,
    error: robotsError,
    deviceError,
    refreshRobots,
    lastUpdated,
  } = useRobots(selectedRobot || "");

  const handleStartSession = () => {
    if (selectedRobot && selectedControl) {
      try {
        // Best practice: Store session data as JSON with timestamp for tracking
        const sessionData = {
          robot: selectedRobot,
          controller: selectedControl,
          mode: activeMode,
          timestamp: new Date().toISOString(),
        };

        // Store as JSON string for better data integrity
        sessionStorage.setItem("sessionData", JSON.stringify(sessionData));

        // Pass data via URL for deep links and bookmarking
        const qs = new URLSearchParams({
          robot: selectedRobot,
          controller: selectedControl,
        });

        // Navigate to training page
        navigate(`/train?${qs.toString()}`);

        // Log session start for monitoring/debugging
        console.info("Training session started", sessionData);
      } catch (error) {
        // Handle potential storage errors
        console.error("Failed to start session", error);
        // Could add user notification here if needed
      }
    }
  };

  const getSelectedRobotData = (): AppRobot | undefined => {
    return robots.find((robot) => robot.id === selectedRobot);
  };

  const getSelectedControlData = () => {
    return controlDevices.find((device) => device.id === selectedControl);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <Header page={"main"} />

      {/* Main content */}
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Robot selection */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  Select Robot
                </CardTitle>
                <CardDescription className="flex items-center justify-between text-muted-foreground">
                  <span>Choose a robot to work with</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => refreshRobots()}
                    title="Refresh robots list"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {loading ? (
                      <RobotSkeleton count={3} />
                    ) : robots.length > 0 ? (
                      robots.map((robot) => (
                        <div
                          key={robot.id}
                          onClick={() => setSelectedRobot(robot.id)}
                          className={cn(
                            "relative cursor-pointer rounded-lg border p-4 transition-all",
                            selectedRobot === robot.id
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                              : "border-border bg-muted/60 hover:border-primary/40"
                          )}
                        >
                          <div className="flex items-center">
                            <div className="bg-muted rounded-lg w-16 h-16 flex items-center justify-center overflow-hidden">
                              {/* Status indicator */}
                              <div
                                className={`absolute top-2 right-2 h-2 w-2 rounded-full ${
                                  robot.status === "online"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                              ></div>

                              {/* Robot image */}
                              {robot.image ? (
                                <img
                                  src={robot.image}
                                  alt={robot.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <span className="text-2xl text-muted-foreground">
                                  {robot.name[0]}
                                </span>
                              )}
                            </div>
                            <div className="ml-4 flex-grow">
                              <h3 className="font-medium text-lg">
                                {robot.name}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {robot.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyRobotState />
                    )}

                    {robotsError && (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive">
                        <p className="text-sm font-medium">
                          Error loading robots
                        </p>
                        <p className="text-xs mt-1">{robotsError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs h-7 bg-transparent border-destructive text-destructive hover:bg-destructive/20"
                          onClick={() => refreshRobots()}
                        >
                          <RefreshCcw className="h-3 w-3 mr-1" /> Try Again
                        </Button>
                      </div>
                    )}

                    {!loading && !robotsError && robots.length > 0 && (
                      <div className="pt-2 text-xs text-muted-foreground text-right">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Middle column: Control device selection */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  Select Control Device
                </CardTitle>
                <CardDescription className="flex items-center justify-between text-muted-foreground">
                  <span>Choose how you want to control the robot</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => refreshRobots()}
                    title="Refresh control devices list"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {!selectedRobot ? (
                      <div className="p-4 rounded-lg bg-muted/10 border border-border text-muted-foreground">
                        <p className="text-sm font-medium">
                          Please select a robot to view available control
                          devices.
                        </p>
                      </div>
                    ) : loadingDevices ? (
                      <ControlDeviceSkeleton count={3} />
                    ) : deviceError ? (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive">
                        <p className="text-sm font-medium">
                          Error loading control devices
                        </p>
                        <p className="text-xs mt-1">{deviceError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs h-7 bg-transparent border-destructive text-destructive hover:bg-destructive/20"
                          onClick={() => refreshRobots()}
                        >
                          <RefreshCcw className="h-3 w-3 mr-1" /> Try Again
                        </Button>
                      </div>
                    ) : controlDevices.length > 0 ? (
                      controlDevices.map((device) => (
                        <div
                          key={device.id}
                          onClick={() => setSelectedControl(device.id)}
                          className={cn(
                            "relative cursor-pointer rounded-lg border p-4 transition-all",
                            selectedControl === device.id
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                              : "border-border bg-muted/60 hover:border-primary/40"
                          )}
                        >
                          <div className="flex items-center">
                            <div className="bg-muted rounded-lg w-12 h-12 flex items-center justify-center overflow-hidden">
                              {/* Control device SVG or fallback image */}
                              {device.svgContent ? (
                                <InlineSvg
                                  content={device.svgContent}
                                  className="w-full h-full"
                                  alt={`${device.name} icon`}
                                  fallback={
                                    device.image ? (
                                      <img
                                        src={device.image}
                                        alt={device.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "/placeholder.svg";
                                        }}
                                      />
                                    ) : (
                                      <span className="text-xl text-muted-foreground">
                                        {device.name[0]}
                                      </span>
                                    )
                                  }
                                />
                              ) : device.image ? (
                                <img
                                  src={device.image}
                                  alt={device.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <span className="text-xl text-muted-foreground">
                                  {device.name[0]}
                                </span>
                              )}
                            </div>
                            <div className="ml-3">
                              <h3 className="font-medium">{device.name}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {device.description}
                              </p>
                            </div>
                            {selectedControl === device.id && (
                              <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyControlDeviceState />
                    )}

                    {!loadingDevices &&
                      !deviceError &&
                      controlDevices.length > 0 && (
                        <div className="pt-2 text-xs text-muted-foreground text-right">
                          Last updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                      )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Robot details and start session */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  Session Details
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure and start your session
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedRobot ? (
                  <div className="space-y-6">
                    <div className="border-b border-border pb-4">
                      <h3 className="font-semibold text-lg mb-2 flex items-center">
                        <Info className="h-4 w-4 mr-2 text-primary" />
                        Robot Information
                      </h3>
                      <div className="bg-muted/60 rounded-lg p-4">
                        <h4 className="font-medium text-primary">
                          {getSelectedRobotData()?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getSelectedRobotData()?.description}
                        </p>

                        <div className="mt-3">
                          <h5 className="text-xs uppercase text-muted-foreground font-medium">
                            Capabilities
                          </h5>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {getSelectedRobotData()?.capabilities.map(
                              (cap, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="bg-primary/10 text-primary"
                                >
                                  {cap}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {Object.entries(
                            getSelectedRobotData()?.specifications || {}
                          ).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="text-muted-foreground">
                                {key}:{" "}
                              </span>
                              <span className="text-foreground">
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {selectedControl && (
                      <div className="border-b border-border pb-4">
                        <h3 className="font-semibold text-md mb-2">
                          Control Device
                        </h3>
                        <div className="bg-muted/60 rounded-lg p-3">
                          <div className="flex items-center">
                            <div className="bg-muted rounded-md w-10 h-10 flex items-center justify-center">
                              {getSelectedControlData()?.svgContent ? (
                                <InlineSvg
                                  content={getSelectedControlData()?.svgContent}
                                  className="w-8 h-8"
                                  alt={`${getSelectedControlData()?.name} icon`}
                                />
                              ) : getSelectedControlData()?.image ? (
                                <img
                                  src={getSelectedControlData()?.image}
                                  alt={getSelectedControlData()?.name}
                                  className="w-6 h-6"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <span className="text-lg text-muted-foreground">
                                  {getSelectedControlData()?.name?.[0]}
                                </span>
                              )}
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-medium">
                                {getSelectedControlData()?.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {getSelectedControlData()?.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-center">
                    <div className="text-muted-foreground">
                      <p className="mb-2">Select a robot and control device</p>
                      <p className="text-sm">Details will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border pt-4">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                  disabled={!selectedRobot || !selectedControl}
                  onClick={handleStartSession}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Training Session
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 bg-card/80">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          &copy; 2025 Robot Teaching Interface | Version 1.0.0
        </div>
      </footer>
    </div>
  );
}
