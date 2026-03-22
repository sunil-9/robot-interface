import { apiFetch } from "@/lib/apiClient";
import {
  formatApiError,
  parseCloudApiResponse,
} from "@/utils/apiResponse";

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
  signaling_ws_url?: string;
}

export interface DiscoveredSignalingConfig {
  baseUrl?: string;
  wsUrl?: string;
}

export interface RobotCameraConfig {
  name?: string;
  topic?: string;
  position?: string;
  [key: string]: unknown;
}

export const fetchRobots = async (): Promise<RobotPresenceSummary[]> => {
  const response = await apiFetch("/robots");
  const payload = await parseCloudApiResponse<RobotPresenceListResponse>(
    response
  );
  if (!response.ok) {
    throw new Error(
      formatApiError(payload, `Failed to load robots (${response.status})`)
    );
  }
  return payload.robots ?? [];
};

export const fetchSignalingConfig =
  async (): Promise<DiscoveredSignalingConfig | null> => {
    try {
      const response = await apiFetch("/config/signaling");
      if (!response.ok) {
        return null;
      }
      const payload = await parseCloudApiResponse<SignalingConfigResponse>(
        response
      );
      return {
        baseUrl: payload.signaling_base_url ?? undefined,
        wsUrl: payload.signaling_ws_url ?? undefined,
      };
    } catch (error) {
      console.warn("Unable to fetch signaling config:", error);
      return null;
    }
  };

export const fetchRobotCameras = async (
  robotId: string
): Promise<RobotCameraConfig[]> => {
  if (!robotId) {
    return [];
  }

  try {
    const response = await apiFetch(
      `/robot-configs/${encodeURIComponent(robotId)}/camera`
    );
    if (!response.ok) {
      return [];
    }
    const payload = await parseCloudApiResponse<unknown>(response);
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload.filter(
      (item): item is RobotCameraConfig => !!item && typeof item === "object"
    );
  } catch (error) {
    console.warn(`Failed to load camera config for robot '${robotId}':`, error);
    return [];
  }
};

export interface DatasetsListResponse {
  datasets: string[];
}

export const fetchDatasets = async (): Promise<string[]> => {
  try {
    const response = await apiFetch("/datasets/");
    const payload = await parseCloudApiResponse<DatasetsListResponse>(
      response
    );
    if (!response.ok) {
      throw new Error(
        formatApiError(payload, `Failed to fetch datasets (${response.status})`)
      );
    }
    return payload.datasets ?? [];
  } catch (error) {
    console.error("Failed to fetch datasets:", error);
    throw error;
  }
};

export const createDataset = async (
  datasetId: string,
  robotId: string,
): Promise<void> => {
  try {
    const response = await apiFetch(`/datasets/create/${datasetId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ robot_id: robotId }),
    });

    if (!response.ok) {
      const detail = await parseCloudApiResponse<unknown>(response);
      throw new Error(
        formatApiError(detail, `Failed to create dataset (${response.status})`)
      );
    }
  } catch (error) {
    console.error("Failed to create dataset:", error);
    throw error;
  }
};

export const deleteDataset = async (datasetId: string): Promise<void> => {
  try {
    const response = await apiFetch(`/datasets/${encodeURIComponent(datasetId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const detail = await parseCloudApiResponse<unknown>(response);
      throw new Error(
        formatApiError(detail, `Failed to delete dataset (${response.status})`)
      );
    }
  } catch (error) {
    console.error("Failed to delete dataset:", error);
    throw error;
  }
};
