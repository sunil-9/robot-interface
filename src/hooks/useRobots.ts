import { useQuery } from "@tanstack/react-query";

import { fetchRobots, RobotPresenceSummary } from "@/lib/api";

export const ROBOTS_QUERY_KEY = ["cloud", "robots"];

export const useRobots = () => {
  return useQuery<RobotPresenceSummary[], Error>({
    queryKey: ROBOTS_QUERY_KEY,
    queryFn: fetchRobots,
    refetchInterval: 5000,
    staleTime: 2500,
  });
};
