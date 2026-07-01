import { apiFetch } from "@/lib/apiClient";
import {
  formatApiError,
  parseCloudApiResponse,
} from "@/utils/apiResponse";

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

interface ApiDatasetItem {
  dataset_id: number;
  dataset_name: string;
  dataset_description?: string | null;
}

export interface DatasetsListResponse {
  datasets?: unknown[];
}

export interface DatasetListResult {
  datasets: string[];
  datasetItems: DatasetListItem[];
}

const isApiDatasetItem = (item: unknown): item is ApiDatasetItem =>
  !!item &&
  typeof item === "object" &&
  typeof (item as ApiDatasetItem).dataset_id === "number" &&
  typeof (item as ApiDatasetItem).dataset_name === "string";

export const fetchDatasets = async (
  robotId?: string | null,
): Promise<DatasetListResult> => {
  const normalizedRobotId = robotId?.trim();
  if (!normalizedRobotId) {
    return {
      datasets: [],
      datasetItems: [],
    };
  }

  try {
    const query = new URLSearchParams();
    query.set("robot_id", normalizedRobotId);

    const response = await apiFetch(`/datasets/?${query.toString()}`);
    const payload = await parseCloudApiResponse<DatasetsListResponse>(
      response
    );
    if (!response.ok) {
      throw new Error(
        formatApiError(payload, `Failed to fetch datasets (${response.status})`)
      );
    }

    const datasetItems = Array.isArray(payload.datasets)
      ? payload.datasets.filter(isApiDatasetItem).map((item) => ({
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

export const updateDataset = async (
  datasetId: string | number,
  updates: { name?: string; description?: string },
): Promise<void> => {
  const response = await apiFetch(
    `/datasets/${encodeURIComponent(datasetId)}/update`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    },
  );

  if (!response.ok) {
    const detail = await parseCloudApiResponse<unknown>(response);
    throw new Error(
      formatApiError(detail, `Failed to update dataset (${response.status})`),
    );
  }
};

export const cloneDataset = async (
  datasetId: string | number,
  datasetName: string,
): Promise<{ dataset_id?: string; message?: string }> => {
  const response = await apiFetch(
    `/datasets/${encodeURIComponent(datasetId)}/clone`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_name: datasetName }),
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
