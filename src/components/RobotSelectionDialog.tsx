import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRobots } from "@/hooks/useRobots";
import { RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ControlDeviceCard,
  ControlDeviceSkeleton,
  EmptyControlDeviceState,
  EmptyRobotState,
  RobotCard,
  RobotSkeleton,
} from "./RobotSkeleton";

interface RobotSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRobot?: string | null;
  initialController?: string | null;
  onConfirm: (robotId: string, controllerId: string) => void;
}

export function RobotSelectionDialog({
  open,
  onOpenChange,
  initialRobot,
  initialController,
  onConfirm,
}: RobotSelectionDialogProps) {
  const [selectedRobot, setSelectedRobot] = useState<string | null>(
    initialRobot || null,
  );
  const [selectedControl, setSelectedControl] = useState<string | null>(
    initialController || null,
  );

  const {
    robots,
    controlDevices,
    loading,
    loadingDevices,
    error: robotsError,
    deviceError,
    refreshRobots,
  } = useRobots(selectedRobot || "");

  // Sync initial values when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedRobot(initialRobot || null);
      setSelectedControl(initialController || null);
    }
  }, [open, initialRobot, initialController]);

  const handleConfirm = () => {
    if (selectedRobot && selectedControl) {
      onConfirm(selectedRobot, selectedControl);
      onOpenChange(false);
    }
  };

  const canConfirm = selectedRobot && selectedControl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Robot & Control Device</DialogTitle>
          <DialogDescription>
            Choose a robot and control device to start your training session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Robot Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select Robot</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => refreshRobots()}
                title="Refresh robots list"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[300px] pr-4 border rounded-lg p-2">
              <div className="space-y-2">
                {loading ? (
                  <RobotSkeleton count={3} />
                ) : robots.length > 0 ? (
                  robots.map((robot) => (
                    <RobotCard
                      key={robot.id}
                      robot={robot}
                      selected={selectedRobot === robot.id}
                      onClick={() => {
                        setSelectedRobot(robot.id);
                        setSelectedControl(null);
                      }}
                      size="compact"
                    />
                  ))
                ) : (
                  <EmptyRobotState />
                )}

                {robotsError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive">
                    <p className="text-sm font-medium">Error loading robots</p>
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
              </div>
            </ScrollArea>
          </div>

          {/* Control Device Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select Control Device</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => refreshRobots()}
                title="Refresh control devices list"
                disabled={!selectedRobot}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[300px] pr-4 border rounded-lg p-2">
              <div className="space-y-2">
                {!selectedRobot ? (
                  <div className="p-4 rounded-lg bg-muted/10 border border-border text-muted-foreground">
                    <p className="text-sm font-medium">
                      Please select a robot first to view available control
                      devices.
                    </p>
                  </div>
                ) : loadingDevices ? (
                  <ControlDeviceSkeleton count={3} />
                ) : deviceError ? (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive text-destructive">
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
                    <ControlDeviceCard
                      key={device.id}
                      device={device}
                      selected={selectedControl === device.id}
                      onClick={() => setSelectedControl(device.id)}
                      size="compact"
                    />
                  ))
                ) : (
                  <EmptyControlDeviceState />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Start Training
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
