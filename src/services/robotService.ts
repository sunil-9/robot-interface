import { API_CONFIG } from "@/config/api";
import { apiFetch } from "@/lib/apiClient";
import {
  ApiOperatorDevice,
  AppRobot,
  ClaimRobotResponse,
  ClaimedRobot,
  ControlDevice,
  OperatorDevicesResponse,
  Robot,
  RobotRenameResponse,
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
  async fetchRobots(): Promise<RobotFetchResult> {
    try {
      const response = await apiFetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROBOTS}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
        },
      );

      const payload = await parseCloudApiResponse<RobotsResponse>(response);

      if (!response.ok) {
        throw new Error(
          formatApiError(
            payload,
            `Failed to fetch robots: ${response.status}`,
          ),
        );
      }

      const rawRobots = Array.isArray(payload.robots) ? payload.robots : [];
      const claimedRobots = Array.isArray(payload.claimed_robots)
        ? payload.claimed_robots
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
      const response = await apiFetch(
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
    robotHash: string,
    friendlyName?: string | null,
  ): Promise<ClaimRobotResponse> {
    const normalizedHash = robotHash.trim();
    if (!normalizedHash) {
      throw new Error("Robot hash is required");
    }
    const normalizedFriendlyName = friendlyName?.trim() || null;

    const response = await apiFetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROBOT_CLAIM}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          robot_hash: normalizedHash,
          friendly_name: normalizedFriendlyName,
        }),
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

  async renameRobot(
    robotId: string,
    friendlyName?: string | null,
  ): Promise<RobotRenameResponse> {
    const normalizedRobotId = robotId.trim();
    if (!normalizedRobotId) {
      throw new Error("Robot ID is required");
    }

    const response = await apiFetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ROBOTS}/${normalizedRobotId}/friendly-name`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ friendly_name: friendlyName?.trim() || null }),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
      },
    );

    const data = await parseCloudApiResponse<RobotRenameResponse>(response);
    if (!response.ok) {
      throw new Error(
        formatApiError(data, `Failed to rename robot: ${response.status}`),
      );
    }

    return data;
  },
};

/**
 * Map a claimed robot (possibly offline) plus optional live presence data to AppRobot.
 */
function mapClaimedRobotToAppRobot(
  claimed: ClaimedRobot,
  liveData: Robot | null,
): AppRobot {
  const robotId = claimed.robot_id;
  const name = claimed.friendly_name?.trim();

  return {
    id: robotId,
    name,
    robotType: claimed.robot_type,
    description: liveData ? `Online robot` : "Offline robot",
    image: `/robots/${claimed.robot_type}.png`,
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
