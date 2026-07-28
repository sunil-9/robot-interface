import { robotService } from "@/services/robotService";
import { AppRobot, ControlDevice, Robot } from "@/types/robot";
import { useCallback, useEffect, useRef, useState } from "react";

const appRobotSignature = (robot: AppRobot): string =>
  [
    robot.id,
    robot.name ?? "",
    robot.robotType,
    robot.description,
    robot.image ?? "",
    robot.status,
    robot.address,
    robot.is_live ? "1" : "0",
  ].join("\u0000");

const robotPresenceSignature = (robot: Robot): string =>
  [
    robot.robot_id,
    robot.robot_type ?? "",
    robot.address,
    robot.heartbeat_interval,
    robot.last_seen,
    robot.signaling.robot_connected ? "1" : "0",
    robot.signaling.operator_count ?? "",
    robot.signaling.controller_count ?? "",
  ].join("\u0000");

const controlDeviceSignature = (device: ControlDevice): string =>
  [
    device.id,
    device.name,
    device.description,
    device.image ?? "",
    device.svgContent ?? "",
  ].join("\u0000");

function sameList<T>(
  current: T[],
  next: T[],
  getSignature: (item: T) => string,
): boolean {
  if (current.length !== next.length) return false;

  for (let index = 0; index < current.length; index += 1) {
    if (getSignature(current[index]) !== getSignature(next[index])) {
      return false;
    }
  }

  return true;
}

function keepReferenceWhenSame<T>(
  getSignature: (item: T) => string,
): (current: T[], next: T[]) => T[] {
  return (current, next) =>
    sameList(current, next, getSignature) ? current : next;
}

const keepAppRobotsReference = keepReferenceWhenSame(appRobotSignature);
const keepRobotPresenceReference = keepReferenceWhenSame(robotPresenceSignature);
const keepControlDevicesReference = keepReferenceWhenSame(controlDeviceSignature);

export function useControlDevices(
  robotId: string | null,
  accessToken: string | null = null,
) {
  const [controlDevices, setControlDevices] = useState<ControlDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const fetchControlDevices = useCallback(async (showLoading = true) => {
    if (!accessToken || !robotId) {
      setControlDevices([]);
      setDeviceError(accessToken ? null : "Not authorized. Please log in.");
      setLoadingDevices(false);
      return;
    }

    try {
      if (showLoading) {
        setLoadingDevices(true);
      }
      setDeviceError(null);

      const fetchedDevices = await robotService.fetchOperatorDevices(robotId);
      setControlDevices((current) =>
        keepControlDevicesReference(current, fetchedDevices),
      );
    } catch (err) {
      console.error("Error fetching control devices:", err);
      setDeviceError(
        err instanceof Error ? err.message : "Failed to fetch control devices",
      );
      setControlDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, [accessToken, robotId]);

  useEffect(() => {
    void fetchControlDevices(true);

    if (!accessToken || !robotId) {
      return;
    }

    const intervalId = setInterval(() => {
      void fetchControlDevices(false);
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [accessToken, fetchControlDevices, robotId]);

  return {
    controlDevices,
    loadingDevices,
    deviceError,
    refreshControlDevices: fetchControlDevices,
  };
}

export function useRobots(
  robotId: string,
  accessToken: string | null = null,
) {
  const [robots, setRobots] = useState<AppRobot[]>([]);
  const [robotPresence, setRobotPresence] = useState<Robot[]>([]);
  const [controlDevices, setControlDevices] = useState<ControlDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const robotsRef = useRef<AppRobot[]>([]);
  const robotPresenceRef = useRef<Robot[]>([]);
  const controlDevicesRef = useRef<ControlDevice[]>([]);

  const fetchRobots = useCallback(async (showLoading = true) => {
    if (!accessToken) {
      setError("Not authorized. Please log in.");
      setRobots([]);
      setRobotPresence([]);
      setControlDevices([]);
      robotsRef.current = [];
      robotPresenceRef.current = [];
      controlDevicesRef.current = [];
      setDeviceError(null);
      setLoadingDevices(false);
      setLoading(false);
      return;
    }
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const { appRobots, rawRobots } = await robotService.fetchRobots();
      const nextRobots = keepAppRobotsReference(robotsRef.current, appRobots);
      const nextPresence = keepRobotPresenceReference(
        robotPresenceRef.current,
        rawRobots,
      );
      const robotsChanged = nextRobots !== robotsRef.current;
      const presenceChanged = nextPresence !== robotPresenceRef.current;

      if (robotsChanged) {
        robotsRef.current = nextRobots;
        setRobots(nextRobots);
      }
      if (presenceChanged) {
        robotPresenceRef.current = nextPresence;
        setRobotPresence(nextPresence);
      }
      if (
        robotId &&
        !appRobots.some((robot) => String(robot.id) === robotId)
      ) {
        setControlDevices([]);
        controlDevicesRef.current = [];
        setDeviceError(null);
        setLoadingDevices(false);
      }
      if (robotsChanged || presenceChanged) {
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Error fetching robots:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch robots");
      setRobots([]);
      setRobotPresence([]);
      robotsRef.current = [];
      robotPresenceRef.current = [];
      setControlDevices([]);
      controlDevicesRef.current = [];
      setLoadingDevices(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, robotId]);

  // Fetch operator devices from the API
  const fetchControlDevices = useCallback(async (robotId: string, showLoading = true) => {
    if (!accessToken) {
      setControlDevices([]);
      controlDevicesRef.current = [];
      setDeviceError("Not authorized. Please log in.");
      setLoadingDevices(false);
      return;
    }

    try {
      if (showLoading) {
        setLoadingDevices(true);
      }
      setDeviceError(null);

      const fetchedDevices = await robotService.fetchOperatorDevices(robotId);
      const nextDevices = keepControlDevicesReference(
        controlDevicesRef.current,
        fetchedDevices,
      );
      if (nextDevices !== controlDevicesRef.current) {
        controlDevicesRef.current = nextDevices;
        setControlDevices(nextDevices);
      }
    } catch (err) {
      console.error("Error fetching control devices:", err);
      setDeviceError(
        err instanceof Error ? err.message : "Failed to fetch control devices",
      );
      // Fallback to empty array if fetch fails
      setControlDevices([]);
      controlDevicesRef.current = [];
    } finally {
      setLoadingDevices(false);
    }
  }, [accessToken]);

  const refreshRobots = () => {
    void fetchRobots(true);
  };

  const refreshControlDevices = () => {
    if (!accessToken || !robotId) {
      setControlDevices([]);
      controlDevicesRef.current = [];
      setLoadingDevices(false);
      return;
    }
    void fetchControlDevices(robotId, true);
  };

  // Initial fetch for robots only (re-runs when accessToken changes)
  useEffect(() => {
    void fetchRobots(true);

    // Set up a background refresh interval for robots (every 30 seconds)
    const intervalId = setInterval(() => {
      void fetchRobots(false);
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [accessToken, fetchRobots]);

  // Fetch control devices when robotId or auth changes
  useEffect(() => {
    if (!accessToken || !robotId) {
      setControlDevices([]);
      controlDevicesRef.current = [];
      setDeviceError(accessToken ? null : "Not authorized. Please log in.");
      setLoadingDevices(false);
      return;
    }

    if (robotId) {
      void fetchControlDevices(robotId, true);

      // Set up a background refresh interval for control devices (every 30 seconds)
      const intervalId = setInterval(() => {
        void fetchControlDevices(robotId, false);
      }, 30000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [robotId, accessToken, fetchControlDevices]);

  return {
    robots,
    robotPresence,
    controlDevices,
    loading,
    loadingDevices,
    error,
    deviceError,
    refreshRobots,
    refreshControlDevices,
    lastUpdated,
  };
}
