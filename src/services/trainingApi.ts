import { API_CONFIG } from "@/config/api";
import { apiFetch } from "@/lib/apiClient";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";

const TRAINING_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING}`;

export interface CheckpointStatus {
  dataset_id: string;
  available: boolean;
  latest_step: number;
}

export interface CheckpointStatusFetchResult {
  status: CheckpointStatus | null;
  message?: string;
}

export interface CheckpointFile {
  name: string;
  size: number;
}

export interface Checkpoint {
  step: number;
  path: string;
  modified_at: string;
  total_size: number;
  files: CheckpointFile[];
}

export interface CheckpointDetails {
  dataset_id: string;
  checkpoints: Checkpoint[];
}

export interface CheckpointDetailsFetchResult {
  details: CheckpointDetails | null;
  message?: string;
}

/**
 * Fetch checkpoint status for a dataset.
 */
export const fetchCheckpointStatus = async (
  datasetId: number | null,
): Promise<CheckpointStatusFetchResult> => {
  if (datasetId === null || !Number.isFinite(datasetId)) {
    return { status: null };
  }

  const normalizedDatasetId = String(datasetId);

  const response = await apiFetch(
    `${TRAINING_BASE_URL}/${encodeURIComponent(normalizedDatasetId)}/checkpoints/status`,
    {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
    },
  );

  // parseCloudApiResponse automatically unwraps ApiEnvelope { status, code, detail }
  // so we get CheckpointStatus directly
  const data = await parseCloudApiResponse<CheckpointStatus | string | null>(
    response,
  );

  if (!response.ok) {
    return {
      status: null,
      message: formatApiError(data, "Failed to fetch checkpoint status"),
    };
  }

  if (!data || typeof data !== "object" || !("dataset_id" in data)) {
    return { status: null, message: "Unexpected checkpoint status response" };
  }

  return { status: data };
};

/**
 * Fetch checkpoint details for a dataset.
 */
export const fetchCheckpointDetails = async (
  datasetId: number | null,
): Promise<CheckpointDetailsFetchResult> => {
  if (datasetId === null || !Number.isFinite(datasetId)) {
    return { details: null };
  }

  const normalizedDatasetId = String(datasetId);

  const response = await apiFetch(
    `${TRAINING_BASE_URL}/${encodeURIComponent(normalizedDatasetId)}/checkpoints`,
    {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
    },
  );

  const data = await parseCloudApiResponse<CheckpointDetails | string | null>(
    response,
  );

  if (!response.ok) {
    return {
      details: null,
      message: formatApiError(data, "Failed to fetch checkpoint details"),
    };
  }

  if (!data || typeof data !== "object" || !("dataset_id" in data)) {
    return { details: null, message: "Unexpected checkpoint details response" };
  }

  return { details: data };
};

