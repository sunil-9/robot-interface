import { buildApiUrl } from "./config";

export interface RobotPresenceSummary {
  robot_id: string;
  address: string | null;
  capabilities: Record<string, unknown>;
  heartbeat_interval: number | null;
  last_seen: string;
  heartbeat_age_ms: number;
  expires_in_ms: number;
  signaling: {
    robot_connected: boolean;
    controller_count: number;
    [key: string]: unknown;
  };
}

export interface RobotPresenceListResponse {
  robots: RobotPresenceSummary[];
}

export interface SignalingConfigResponse {
  signaling_ws_url: string;
}

export const fetchRobots = async (): Promise<RobotPresenceSummary[]> => {
  const response = await fetch(buildApiUrl("/robots"));
  if (!response.ok) {
    throw new Error(`Failed to load robots (${response.status})`);
  }
  const payload = (await response.json()) as RobotPresenceListResponse;
  return payload.robots ?? [];
};

export const fetchSignalingConfig = async (): Promise<string | null> => {
  try {
    const response = await fetch(buildApiUrl("/config/signaling"));
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as SignalingConfigResponse;
    return payload.signaling_ws_url ?? null;
  } catch (error) {
    console.warn("Unable to fetch signaling config:", error);
    return null;
  }
};
