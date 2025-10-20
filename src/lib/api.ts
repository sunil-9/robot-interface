import { buildApiUrl } from "./config";

export interface RobotPresenceSummary {
  robot_id: string;
  address: string | null;
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
  signaling_base_url?: string;
  signaling_join_url?: string;
  signaling_poll_url?: string;
  signaling_message_url?: string;
}

export interface DiscoveredSignalingConfig {
  baseUrl?: string;
  joinUrl?: string;
  pollUrl?: string;
  messageUrl?: string;
}

export const fetchRobots = async (): Promise<RobotPresenceSummary[]> => {
  const response = await fetch(buildApiUrl("/robots"));
  if (!response.ok) {
    throw new Error(`Failed to load robots (${response.status})`);
  }
  const payload = (await response.json()) as RobotPresenceListResponse;
  return payload.robots ?? [];
};

export const fetchSignalingConfig = async (): Promise<DiscoveredSignalingConfig | null> => {
  try {
    const response = await fetch(buildApiUrl("/config/signaling"));
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as SignalingConfigResponse;
    return {
      baseUrl: payload.signaling_base_url ?? undefined,
      joinUrl: payload.signaling_join_url ?? undefined,
      pollUrl: payload.signaling_poll_url ?? undefined,
      messageUrl: payload.signaling_message_url ?? undefined,
    };
  } catch (error) {
    console.warn("Unable to fetch signaling config:", error);
    return null;
  }
};
