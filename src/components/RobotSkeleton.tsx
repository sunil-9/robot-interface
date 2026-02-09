import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AppRobot, ControlDevice } from "@/types/robot";
import { CheckCircle2 } from "lucide-react";

interface RobotSkeletonProps {
  count?: number;
}

export function RobotSkeleton({ count = 3 }: RobotSkeletonProps) {
  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="p-4 rounded-lg border border-gray-700 bg-gray-800/50"
          >
            <div className="flex items-center">
              <Skeleton className="w-16 h-16 rounded-lg bg-gray-700" />
              <div className="ml-4 flex-grow">
                <Skeleton className="h-5 w-3/4 bg-gray-700 mb-2" />
                <Skeleton className="h-4 w-5/6 bg-gray-700/70" />
              </div>
            </div>
          </div>
        ))}
    </>
  );
}

export function EmptyRobotState() {
  return (
    <div className="p-8 text-center border border-dashed border-gray-700 rounded-lg bg-gray-800/30">
      <div className="text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mx-auto mb-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-lg font-medium mb-1">No Robots Online</h3>
        <p className="text-sm text-gray-500">
          There are currently no robots available for connection.
          <br />
          Please check that robots are powered on and connected to the network.
        </p>
      </div>
    </div>
  );
}

interface ControlDeviceSkeletonProps {
  count?: number;
}

export function ControlDeviceSkeleton({
  count = 3,
}: ControlDeviceSkeletonProps) {
  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={`device-skeleton-${index}`}
            className="p-4 rounded-lg border border-gray-700 bg-gray-800/50"
          >
            <div className="flex items-center">
              <Skeleton className="w-12 h-12 rounded-lg bg-gray-700" />
              <div className="ml-3">
                <Skeleton className="h-4 w-24 bg-gray-700 mb-2" />
                <Skeleton className="h-3 w-32 bg-gray-700/70" />
              </div>
            </div>
          </div>
        ))}
    </>
  );
}

export function EmptyControlDeviceState() {
  return (
    <div className="p-8 text-center border border-dashed border-gray-700 rounded-lg bg-gray-800/30">
      <div className="text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mx-auto mb-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <h3 className="text-lg font-medium mb-1">No Control Devices Found</h3>
        <p className="text-sm text-gray-500">
          There are currently no control devices available.
          <br />
          Please check your system configuration.
        </p>
      </div>
    </div>
  );
}

// Reusable Robot Card Component
interface RobotCardProps {
  robot: AppRobot;
  selected: boolean;
  onClick: () => void;
  size?: "default" | "compact";
}

export function RobotCard({
  robot,
  selected,
  onClick,
  size = "default",
}: RobotCardProps) {
  const isCompact = size === "compact";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-lg border transition-all",
        isCompact ? "p-3" : "p-4",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : "border-border bg-muted/60 hover:border-primary/40",
      )}
    >
      {/* Status indicator - positioned at top right of card */}
      <div
        className={cn(
          "absolute h-2 w-2 rounded-full top-2 right-2",
          robot.status === "online" ? "bg-green-500" : "bg-red-500",
        )}
      />

      <div className="flex items-center">
        <div
          className={cn(
            "bg-muted rounded-lg flex items-center justify-center overflow-hidden",
            isCompact ? "w-12 h-12" : "w-16 h-16",
          )}
        >
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
            <span
              className={cn(
                "text-muted-foreground",
                isCompact ? "text-xl" : "text-2xl",
              )}
            >
              {robot.name[0]}
            </span>
          )}
        </div>
        <div className={cn("flex-grow", isCompact ? "ml-3" : "ml-4")}>
          <h3 className={cn("font-medium", isCompact ? "text-sm" : "text-lg")}>
            {robot.name}
          </h3>
          <p
            className={cn(
              "text-muted-foreground line-clamp-1",
              isCompact ? "text-xs" : "text-sm",
            )}
          >
            {robot.description}
          </p>
        </div>
        {selected && (
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

// Reusable Control Device Card Component
interface ControlDeviceCardProps {
  device: ControlDevice;
  selected: boolean;
  onClick: () => void;
  size?: "default" | "compact";
}

export function ControlDeviceCard({
  device,
  selected,
  onClick,
  size = "default",
}: ControlDeviceCardProps) {
  const isCompact = size === "compact";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-lg border transition-all",
        isCompact ? "p-3" : "p-4",
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary/30"
          : "border-border bg-muted/60 hover:border-primary/40",
      )}
    >
      <div className="flex items-center">
        <div
          className={cn(
            "bg-muted rounded-lg flex items-center justify-center overflow-hidden",
            isCompact ? "w-10 h-10" : "w-12 h-12",
          )}
        >
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
            <span
              className={cn(
                "text-muted-foreground",
                isCompact ? "text-lg" : "text-xl",
              )}
            >
              {device.name[0]}
            </span>
          )}
        </div>
        <div className="ml-3 flex-grow">
          <h3 className={cn("font-medium", isCompact ? "text-sm" : "")}>
            {device.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {device.description}
          </p>
        </div>
        {selected && (
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
