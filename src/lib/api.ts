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

export interface DatasetListItem {
  id: number;
  name: string;
  description?: string | null;
}

export interface DatasetMetadataOverview {
  identity: {
    dataset_id: number;
    dataset_name: string;
  };
  ownership: {
    user_ids: number[];
  };
  robot: {
    robot_id: number | null;
    robot_dataset_robot_ids: number[];
  };
  description: {
    database_description: string | null;
    tasks: Array<Record<string, unknown>>;
  };
  state: {
    status: string;
    status_updated_at: string | null;
  };
  size: {
    total_episodes: number;
    total_frames: number;
  };
  episodes: Array<Record<string, unknown>>;
  ingestions: Array<Record<string, unknown>>;
  training_usage: {
    training_jobs: Array<Record<string, unknown>>;
    models: Array<Record<string, unknown>>;
  };
  visualization: {
    file_base_url: string;
    metadata_url: string;
    dataset_path: string;
    version: string | null;
    metadata: Record<string, unknown>;
    metadata_error: string | null;
  };
}

interface ApiDatasetItem {
  dataset_id: number;
  dataset_name: string;
  dataset_description?: string | null;
}

export interface DatasetsListResponse {
  datasets?: ApiDatasetItem[];
}

export interface DatasetListResult {
  datasets: string[];
  datasetItems: DatasetListItem[];
}

export const fetchDatasets = async (
  robotId?: string | null,
): Promise<DatasetListResult> => {
  try {
    const query = new URLSearchParams();
    if (robotId) {
      query.set("robot_id", robotId);
    }

    const queryString = query.toString();
    const datasetUrl = queryString ? `/datasets/?${queryString}` : "/datasets/";
    const response = await apiFetch(datasetUrl);
    const payload = await parseCloudApiResponse<DatasetsListResponse>(
      response
    );
    if (!response.ok) {
      throw new Error(
        formatApiError(payload, `Failed to fetch datasets (${response.status})`)
      );
    }

    const datasetItems = Array.isArray(payload.datasets)
      ? payload.datasets.filter(
          (item): item is ApiDatasetItem =>
            !!item &&
            typeof item === "object" &&
            "dataset_id" in item &&
            "dataset_name" in item &&
            typeof (item as ApiDatasetItem).dataset_id === "number" &&
            typeof (item as ApiDatasetItem).dataset_name === "string"
        )
        .map((item) => ({
          id: item.dataset_id,
          name: item.dataset_name,
          description: item.dataset_description,
        }))
      : [];

    const datasets = datasetItems.map((item) => item.name);

    return {
      datasets,
      datasetItems,
    };
  } catch (error) {
    console.error("Failed to fetch datasets:", error);
    throw error;
  }
};

export const createDataset = async (
  datasetName: string,
  robotId: string,
  description: string,
): Promise<void> => {
  try {
    const response = await apiFetch(`/datasets/create/${datasetName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ robot_id: robotId, description }),
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

export const updateDatasetDescription = async (
  datasetId: string | number,
  description: string,
): Promise<void> => {
  try {
    const response = await apiFetch(
      `/datasets/${encodeURIComponent(datasetId)}/description`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
      },
    );

    if (!response.ok) {
      const detail = await parseCloudApiResponse<unknown>(response);
      throw new Error(
        formatApiError(
          detail,
          `Failed to update dataset description (${response.status})`,
        ),
      );
    }
  } catch (error) {
    console.error("Failed to update dataset description:", error);
    throw error;
  }
};

export const fetchDatasetMetadataOverview = async (
  datasetId: string | number,
): Promise<DatasetMetadataOverview> => {
  const response = await apiFetch(
    `/datasets/${encodeURIComponent(datasetId)}/metadata-overview`,
  );
  const payload = await parseCloudApiResponse<DatasetMetadataOverview>(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        payload,
        `Failed to fetch dataset metadata (${response.status})`,
      ),
    );
  }

  return payload;
};

export const cloneDataset = async (
  datasetId: string | number,
): Promise<{ dataset_id?: string; message?: string }> => {
  const response = await apiFetch(
    `/datasets/${encodeURIComponent(datasetId)}/clone`,
    {
      method: "POST",
    },
  );
  const payload = await parseCloudApiResponse<{
    dataset_id?: string;
    message?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(payload, `Failed to clone dataset (${response.status})`),
    );
  }

  return payload;
};

export const deleteDataset = async (datasetId: string | number): Promise<void> => {
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
