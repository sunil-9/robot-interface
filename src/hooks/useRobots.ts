import { robotService } from "@/services/robotService";
import { AppRobot, ControlDevice, Robot } from "@/types/robot";
import { useEffect, useState } from "react";

export function useRobots(robotId: string) {
  const [robots, setRobots] = useState<AppRobot[]>([]);
  const [robotPresence, setRobotPresence] = useState<Robot[]>([]);
  const [controlDevices, setControlDevices] = useState<ControlDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchRobots = async () => {
    try {
      setLoading(true);
      setError(null);

      const { appRobots, rawRobots } = await robotService.fetchRobots();
      setRobots(appRobots);
      setRobotPresence(rawRobots);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching robots:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch robots");
      setRobots([]);
      setRobotPresence([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch operator devices from the API
  const fetchControlDevices = async (robotId: string) => {
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

  // Refresh data
  const refreshData = () => {
    console.log("refreshing data");
    fetchRobots();
    fetchControlDevices(robotId);
  };

  // Initial fetch for robots only (runs once)
  useEffect(() => {
    fetchRobots();

    // Set up a refresh interval for robots (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchRobots();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Fetch control devices when robotId changes
  useEffect(() => {
    if (robotId) {
      fetchControlDevices(robotId);

      // Set up a refresh interval for control devices (every 30 seconds)
      const intervalId = setInterval(() => {
        fetchControlDevices(robotId);
      }, 30000);

      return () => {
        clearInterval(intervalId);
      };
    } else {
      // Clear control devices when no robot is selected
      setControlDevices([]);
      setLoadingDevices(false);
    }
  }, [robotId]);

  return {
    robots,
    robotPresence,
    controlDevices,
    loading,
    loadingDevices,
    error,
    deviceError,
    refreshRobots: refreshData, // Keep the same function name for compatibility
    lastUpdated,
  };
}

// import { useQuery } from "@tanstack/react-query";

// import { fetchRobots, RobotPresenceSummary } from "@/lib/api";

// export const ROBOTS_QUERY_KEY = ["cloud", "robots"];

// export const useRobots = () => {
//   return useQuery<RobotPresenceSummary[], Error>({
//     queryKey: ROBOTS_QUERY_KEY,
//     queryFn: fetchRobots,
//     refetchInterval: 5000,
//     staleTime: 2500,
//   });
// };
