import { robotService } from "@/services/robotService";
import { AppRobot, ControlDevice, Robot } from "@/types/robot";
import { useEffect, useState } from "react";

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

  const fetchRobots = async () => {
    if (!accessToken) {
      setError("Not authorized. Please log in.");
      setRobots([]);
      setRobotPresence([]);
      setControlDevices([]);
      setDeviceError(null);
      setLoadingDevices(false);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const { appRobots, rawRobots } = await robotService.fetchRobots();
      setRobots(appRobots);
      setRobotPresence(rawRobots);
      if (
        robotId &&
        !appRobots.some((robot) => String(robot.id) === robotId)
      ) {
        setControlDevices([]);
        setDeviceError(null);
        setLoadingDevices(false);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching robots:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch robots");
      setRobots([]);
      setRobotPresence([]);
      setControlDevices([]);
      setLoadingDevices(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch operator devices from the API
  const fetchControlDevices = async (robotId: string) => {
    if (!accessToken) {
      setControlDevices([]);
      setDeviceError("Not authorized. Please log in.");
      setLoadingDevices(false);
      return;
    }

    try {
      setLoadingDevices(true);
      setDeviceError(null);

      const fetchedDevices = await robotService.fetchOperatorDevices(robotId);
      setControlDevices(fetchedDevices);
    } catch (err) {
      console.error("Error fetching control devices:", err);
      setDeviceError(
        err instanceof Error ? err.message : "Failed to fetch control devices",
      );
      // Fallback to empty array if fetch fails
      setControlDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const refreshRobots = () => {
    fetchRobots();
  };

  const refreshControlDevices = () => {
    if (!accessToken || !robotId) {
      setControlDevices([]);
      setLoadingDevices(false);
      return;
    }
    fetchControlDevices(robotId);
  };

  // Initial fetch for robots only (re-runs when accessToken changes)
  useEffect(() => {
    fetchRobots();

    // Set up a refresh interval for robots (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchRobots();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [accessToken]);

  // Fetch control devices when robotId or auth changes
  useEffect(() => {
    if (!accessToken || !robotId) {
      setControlDevices([]);
      setDeviceError(accessToken ? null : "Not authorized. Please log in.");
      setLoadingDevices(false);
      return;
    }

    if (robotId) {
      fetchControlDevices(robotId);

      // Set up a refresh interval for control devices (every 30 seconds)
      const intervalId = setInterval(() => {
        fetchControlDevices(robotId);
      }, 30000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [robotId, accessToken]);

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