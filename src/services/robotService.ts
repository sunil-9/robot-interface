import { API_CONFIG } from "@/config/api";
import {
  ApiOperatorDevice,
  AppRobot,
  ControlDevice,
  OperatorDevicesResponse,
  Robot,
  RobotsResponse,
} from "@/types/robot";
import {
  formatApiError,
  parseCloudApiResponse,
} from "@/utils/apiResponse";

export interface RobotFetchResult {
  appRobots: AppRobot[];
  rawRobots: Robot[];
}

export const robotService = {
  /**
   * Fetch available robots from the API
   * @returns Promise with available robots
   */
  async fetchRobots(): Promise<RobotFetchResult> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROBOTS}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
        }
      );

      const data = await parseCloudApiResponse<RobotsResponse>(response);

      if (!response.ok) {
        throw new Error(
          formatApiError(data, `Failed to fetch robots: ${response.status}`)
        );
      }
      const rawRobots = Array.isArray(data.robots) ? data.robots : [];

      // Map API robots to application robots format
      const appRobots = rawRobots.map(mapApiRobotToAppRobot);

      return {
        appRobots,
        rawRobots,
      };
    } catch (error) {
      console.error("Error fetching robots:", error);
      throw error;
    }
  },

  // WebRTC test connection method removed - no longer needed

  /**
   * Fetch available operator devices from the API
   * @returns Promise with available operator devices
   */
  async fetchOperatorDevices(): Promise<ControlDevice[]> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.OPERATOR_DEVICES}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
        }
      );

      const data = await parseCloudApiResponse<OperatorDevicesResponse>(
        response
      );

      if (!response.ok) {
        throw new Error(
          formatApiError(
            data,
            `Failed to fetch operator devices: ${response.status}`
          )
        );
      }

      // Map API devices to application control devices format
      return data.devices.map(mapApiDeviceToControlDevice);
    } catch (error) {
      console.error("Error fetching operator devices:", error);
      throw error;
    }
  },
};

/**
 * Helper function to map API robot format to application robot format
 */
function mapApiRobotToAppRobot(robot: Robot): AppRobot {
  // Map robot_id to a more readable name
  // This is a simple example - you might want to customize this mapping
  const nameMapping: Record<string, string> = {
    jackal_kinova: "Jackal with Kinova Arm",
    spot: "Boston Dynamics Spot",
    stretch: "Hello Robot Stretch",
  };

  // Default capabilities based on robot type
  const capabilities: Record<string, string[]> = {
    jackal_kinova: ["Mobile Base", "Robotic Arm", "Object Manipulation"],
    spot: ["Quadruped Locomotion", "Terrain Navigation", "Camera Vision"],
    stretch: ["Indoor Navigation", "Telescoping Arm", "Picking Tasks"],
  };

  // Generate robot name and default specifications
  const robotId = robot.robot_id;
  const name = nameMapping[robotId] || `Robot ${robotId}`;

  const operatorCount =
    robot.signaling?.operator_count ?? robot.signaling?.controller_count ?? 0;

  return {
    id: robotId,
    name: name,
    description: `Connected robot with endpoint at ${robot.address}`,
    image: `/robots/${robotId}.png`, // Assuming you have images with matching names
    capabilities: capabilities[robotId] || ["Remote Operation"],
    specifications: {
      Status: robot.signaling.robot_connected ? "Connected" : "Disconnected",
      Address: robot.address,
      "Last Seen": new Date(robot.last_seen).toLocaleString(),
      Heartbeat: `${robot.heartbeat_interval} seconds`,
      Operators: operatorCount,
    },
    status: robot.signaling.robot_connected ? "online" : "offline",
    address: robot.address,
  };
}

/**
 * Helper function to map API operator device format to application control device format
 */
function mapApiDeviceToControlDevice(device: ApiOperatorDevice): ControlDevice {
  // Generate a unique ID based on the device name
  const deviceId =
    device.type + "-" + device.name.toLowerCase().replace(/\s+/g, "-");

  // Map device type to description
  const descriptions: Record<string, string> = {
    gamepad: "Game controller for precise robot operation",
    input: "Standard computer input device",
    industrial: "Professional industrial control device",
  };

  // Get description based on type or use a default
  const description =
    descriptions[device.type] || `${device.type} control device`;

  // Fallback image map if SVG is not available
  const imageMap: Record<string, string> = {
    gamepad: "/controls/joystick.png",
    input: "/controls/keyboard.png",
    industrial: "/controls/smartpad.png",
  };

  return {
    id: deviceId,
    name: device.name,
    description: description,
    image: imageMap[device.type] || undefined,
    svgContent: device.image_svg, // Pass through the SVG content for inline rendering
  };
}
