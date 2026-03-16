// Types for robot data received from the API
export interface Robot {
  robot_id: string;
  address: string;
  heartbeat_interval: number;
  last_seen: string;
  heartbeat_age_ms: number;
  expires_in_ms: number;
  signaling: {
    robot_connected: boolean;
    operator_count?: number;
    controller_count?: number;
  };
}

export interface ClaimedRobot {
  robot_id: string;
  friendly_name: string | null;
  is_live: boolean;
}

export interface RobotsResponse {
  robots: Robot[];
  claimed_robots: ClaimedRobot[];
}

// Map API robot data to our application robot format
export interface AppRobot {
  id: string;
  name: string;
  description: string;
  image?: string;
  capabilities: string[];
  specifications: Record<string, string | number | string[]>;
  status: "online" | "offline";
  address: string;
  is_live: boolean;
}

// API operator device interface
export interface ApiOperatorDevice {
  name: string;
  description: string;
  image?: string;
}

export interface OperatorDevicesResponse {
  devices: ApiOperatorDevice[];
}

// Control device interface for the application
export interface ControlDevice {
  id: string;
  name: string;
  description: string;
  image?: string;
  svgContent?: string; // Raw SVG content for inline rendering
}

export interface RobotsData {
  robots: AppRobot[];
  controlDevices: ControlDevice[];
}

export interface ClaimRobotResponse {
  user_id: number;
  robot_id: number;
  created: boolean;
}
