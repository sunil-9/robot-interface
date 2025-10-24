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

export interface RobotsResponse {
  robots: Robot[];
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
}

// API operator device interface
export interface ApiOperatorDevice {
  name: string;
  type: string;
  image_svg?: string;
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
