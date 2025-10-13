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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ChevronRight, Code, Info, Play } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import robotsData from "@/data/robots.json";

export default function Home() {
  const navigate = useNavigate();
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [selectedControl, setSelectedControl] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState("train");

  const handleStartSession = () => {
    if (selectedRobot && selectedControl) {
      // Store selections in sessionStorage for use across the app
      sessionStorage.setItem("selectedRobot", selectedRobot);
      sessionStorage.setItem("selectedControl", selectedControl);
      sessionStorage.setItem("activeMode", activeMode);

      // Navigate to the appropriate page based on mode
      switch (activeMode) {
        case "train":
          navigate("/train");
          break;
        case "test":
          navigate("/test");
          break;
        case "deploy":
          navigate("/deploy");
          break;
        default:
          navigate("/train");
      }
    }
  };

  const getSelectedRobotData = () => {
    return robotsData.robots.find((robot) => robot.id === selectedRobot);
  };

  const getSelectedControlData = () => {
    return robotsData.controlDevices.find(
      (device) => device.id === selectedControl
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 p-4 bg-black">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-purple-400">
            Robot Teaching Interface
          </h1>
          <p className="text-gray-400 text-sm">
            Select a robot and control device to begin
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Robot selection */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-800 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-xl">Select Robot</CardTitle>
                <CardDescription>Choose a robot to work with</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {robotsData.robots.map((robot) => (
                      <div
                        key={robot.id}
                        onClick={() => setSelectedRobot(robot.id)}
                        className={`relative p-4 rounded-lg cursor-pointer transition-all 
                        ${
                          selectedRobot === robot.id
                            ? "bg-purple-900/50 border-2 border-purple-500"
                            : "bg-gray-800/50 border border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="bg-gray-800 rounded-lg w-16 h-16 flex items-center justify-center overflow-hidden">
                            {/* Placeholder for robot image */}
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
                              <span className="text-2xl text-gray-500">
                                {robot.name[0]}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 flex-grow">
                            <h3 className="font-medium text-lg">
                              {robot.name}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-1">
                              {robot.description}
                            </p>
                          </div>
                          {selectedRobot === robot.id && (
                            <CheckCircle2 className="absolute top-4 right-4 text-purple-500 h-5 w-5" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Middle column: Control device selection */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-800 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-xl">Select Control Device</CardTitle>
                <CardDescription>
                  Choose how you want to control the robot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {robotsData.controlDevices.map((device) => (
                      <div
                        key={device.id}
                        onClick={() => setSelectedControl(device.id)}
                        className={`relative p-4 rounded-lg cursor-pointer transition-all 
                        ${
                          selectedControl === device.id
                            ? "bg-purple-900/50 border-2 border-purple-500"
                            : "bg-gray-800/50 border border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center">
                          <div className="bg-gray-800 rounded-lg w-12 h-12 flex items-center justify-center overflow-hidden">
                            {/* Placeholder for control device image */}
                            {device.image ? (
                              <img
                                src={device.image}
                                alt={device.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <span className="text-xl text-gray-500">
                                {device.name[0]}
                              </span>
                            )}
                          </div>
                          <div className="ml-3">
                            <h3 className="font-medium">{device.name}</h3>
                            <p className="text-xs text-gray-400 line-clamp-1">
                              {device.description}
                            </p>
                          </div>
                          {selectedControl === device.id && (
                            <CheckCircle2 className="absolute top-4 right-4 text-purple-500 h-5 w-5" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Robot details and start session */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-800 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-xl">Session Details</CardTitle>
                <CardDescription>
                  Configure and start your session
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedRobot ? (
                  <div className="space-y-6">
                    <div className="border-b border-gray-800 pb-4">
                      <h3 className="font-semibold text-lg mb-2 flex items-center">
                        <Info className="h-4 w-4 mr-2 text-purple-400" />
                        Robot Information
                      </h3>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <h4 className="font-medium text-purple-300">
                          {getSelectedRobotData()?.name}
                        </h4>
                        <p className="text-sm text-gray-300 mt-1">
                          {getSelectedRobotData()?.description}
                        </p>

                        <div className="mt-3">
                          <h5 className="text-xs uppercase text-gray-500 font-medium">
                            Capabilities
                          </h5>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {getSelectedRobotData()?.capabilities.map(
                              (cap, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="bg-purple-900/30 text-purple-300"
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
                              <span className="text-gray-500">{key}: </span>
                              <span className="text-gray-300">
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {selectedControl && (
                      <div className="border-b border-gray-800 pb-4">
                        <h3 className="font-semibold text-md mb-2">
                          Control Device
                        </h3>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <div className="flex items-center">
                            <div className="bg-gray-700 rounded-md w-10 h-10 flex items-center justify-center">
                              {getSelectedControlData()?.image ? (
                                <img
                                  src={getSelectedControlData()?.image}
                                  alt={getSelectedControlData()?.name}
                                  className="w-6 h-6"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <span className="text-lg text-gray-500">
                                  {getSelectedControlData()?.name[0]}
                                </span>
                              )}
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-medium">
                                {getSelectedControlData()?.name}
                              </h4>
                              <p className="text-xs text-gray-400">
                                {getSelectedControlData()?.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-md mb-2">
                        Mode Selection
                      </h3>
                      <Tabs
                        defaultValue="train"
                        className="w-full"
                        onValueChange={setActiveMode}
                      >
                        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                          <TabsTrigger
                            value="train"
                            className="data-[state=active]:bg-purple-800"
                          >
                            Train
                          </TabsTrigger>
                          <TabsTrigger
                            value="test"
                            className="data-[state=active]:bg-purple-800"
                          >
                            Test
                          </TabsTrigger>
                          <TabsTrigger
                            value="deploy"
                            className="data-[state=active]:bg-purple-800"
                          >
                            Deploy
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="train" className="mt-2">
                          <p className="text-sm text-gray-400">
                            Train the robot using demonstration data and create
                            new behaviors.
                          </p>
                        </TabsContent>
                        <TabsContent value="test" className="mt-2">
                          <p className="text-sm text-gray-400">
                            Test the robot's performance with previously trained
                            models.
                          </p>
                        </TabsContent>
                        <TabsContent value="deploy" className="mt-2">
                          <p className="text-sm text-gray-400">
                            Deploy trained models to the robot for real-world
                            operation.
                          </p>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-center">
                    <div className="text-gray-500">
                      <p className="mb-2">Select a robot and control device</p>
                      <p className="text-sm">Details will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-gray-800 pt-4">
                <Button
                  className="w-full bg-purple-700 hover:bg-purple-600 text-white"
                  size="lg"
                  disabled={!selectedRobot || !selectedControl}
                  onClick={handleStartSession}
                >
                  {activeMode === "train" && <Play className="mr-2 h-4 w-4" />}
                  {activeMode === "test" && <Code className="mr-2 h-4 w-4" />}
                  {activeMode === "deploy" && (
                    <ChevronRight className="mr-2 h-4 w-4" />
                  )}
                  Start{" "}
                  {activeMode === "train"
                    ? "Training"
                    : activeMode === "test"
                    ? "Testing"
                    : "Deployment"}{" "}
                  Session
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 bg-black">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          &copy; 2025 Robot Teaching Interface | Version 1.0.0
        </div>
      </footer>
    </div>
  );
}
