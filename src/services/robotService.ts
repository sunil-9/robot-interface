import { API_CONFIG } from "@/config/api";
import {
  ApiOperatorDevice,
  AppRobot,
  ClaimRobotResponse,
  ClaimedRobot,
  ControlDevice,
  OperatorDevicesResponse,
  Robot,
  RobotsResponse,
} from "@/types/robot";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";

export interface RobotFetchResult {
  appRobots: AppRobot[];
  rawRobots: Robot[];
}

export const robotService = {
  /**
   * Fetch available robots from the API
   * @returns Promise with available robots
   */
  async fetchRobots(accessToken: string): Promise<RobotFetchResult> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROBOTS}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
        },
      );
      if (!response.ok) {
        throw new Error(
          formatApiError(
            "api failed to respond",
            `Failed to fetch robots: ${response.status}`,
          ),
        );
      }

      const data = await parseCloudApiResponse<RobotsResponse>(response);

      const rawRobots = Array.isArray(data.robots) ? data.robots : [];
      const claimedRobots = Array.isArray(data.claimed_robots)
        ? data.claimed_robots
        : [];

      // Build a lookup of live presence data keyed by robot_id
      const liveMap = new Map(rawRobots.map((r) => [r.robot_id, r]));

      // Map all claimed robots (online + offline) to app format
      const appRobots = claimedRobots.map((claimed) =>
        mapClaimedRobotToAppRobot(
          claimed,
          liveMap.get(claimed.robot_id) ?? null,
        ),
      );

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
  async fetchOperatorDevices(robotId: string): Promise<ControlDevice[]> {
    try {
      if (!robotId) {
        throw new Error("Robot ID is required to fetch operator devices");
      }
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROBOT_CONFIGS}/${robotId}/${API_CONFIG.ENDPOINTS.OPERATOR_DEVICES}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
        },
      );

      const data =
        await parseCloudApiResponse<OperatorDevicesResponse>(response);

      if (!response.ok) {
        throw new Error(
          formatApiError(
            data,
            `Failed to fetch operator devices: ${response.status}`,
          ),
        );
      }

      // Map API devices to application control devices format
      return data.devices.map(mapApiDeviceToControlDevice);
    } catch (error) {
      console.error("Error fetching operator devices:", error);
      throw error;
    }
  },

  async claimRobot(
    accessToken: string,
    robotHash: string,
  ): Promise<ClaimRobotResponse> {
    const normalizedHash = robotHash.trim();
    if (!normalizedHash) {
      throw new Error("Robot hash is required");
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROBOT_CLAIM}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ robot_hash: normalizedHash }),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
      },
    );

    const data = await parseCloudApiResponse<ClaimRobotResponse>(response);
    if (!response.ok) {
      throw new Error(
        formatApiError(data, `Failed to claim robot: ${response.status}`),
      );
    }

    return data;
  },
};

const _nameMapping: Record<string, string> = {
  jackal_kinova: "Jackal with Kinova Arm",
  spot: "Boston Dynamics Spot",
  stretch: "Hello Robot Stretch",
};

const _capabilityMapping: Record<string, string[]> = {
  jackal_kinova: ["Mobile Base", "Robotic Arm", "Object Manipulation"],
  spot: ["Quadruped Locomotion", "Terrain Navigation", "Camera Vision"],
  stretch: ["Indoor Navigation", "Telescoping Arm", "Picking Tasks"],
};

/**
 * Map a claimed robot (possibly offline) plus optional live presence data to AppRobot.
 */
function mapClaimedRobotToAppRobot(
  claimed: ClaimedRobot,
  liveData: Robot | null,
): AppRobot {
  const robotId = claimed.robot_id;
  const name =
    claimed.friendly_name ?? _nameMapping[robotId] ?? `Robot ${robotId}`;

  const specs: Record<string, string | number | string[]> = {
    Status: claimed.is_live ? "Connected" : "Disconnected",
  };

  if (liveData) {
    const operatorCount =
      liveData.signaling?.operator_count ??
      liveData.signaling?.controller_count ??
      0;
    specs["Address"] = liveData.address;
    specs["Last Seen"] = new Date(liveData.last_seen).toLocaleString();
    specs["Heartbeat"] = `${liveData.heartbeat_interval} seconds`;
    specs["Operators"] = operatorCount;
  }

  return {
    id: robotId,
    name,
    description: liveData
      ? `Connected at ${liveData.address}`
      : "Offline robot",
    image: `/robots/${robotId}.png`,
    capabilities: _capabilityMapping[robotId] ?? ["Remote Operation"],
    specifications: specs,
    status: claimed.is_live ? "online" : "offline",
    address: liveData?.address ?? "",
    is_live: claimed.is_live,
  };
}

/**
 * Helper function to map API operator device format to application control device format
 */
function mapApiDeviceToControlDevice(device: ApiOperatorDevice): ControlDevice {
  // Generate a unique ID based on the device name
  const deviceId = device.name.toLowerCase().replace(/\s+/g, "-");

  // Get description based on type or use a default
  const description = device.description;
  return {
    id: deviceId,
    name: device.name,
    description: description,
    image: device.image,
  };
}
