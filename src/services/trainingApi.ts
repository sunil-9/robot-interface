import { API_CONFIG } from "@/config/api";
import { apiFetch } from "@/lib/apiClient";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";

const TRAINING_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING}`;

export interface TrainingJob {
  dataset_id: string;
  policy_type: string;
  mode: string;
  requested_steps: number;
  checkpoint_interval: number;
  started_at: string;
  resume_from: string;
  current_step: number;
  target_step: number;
}

export interface TrainingJobDetail {
  job: TrainingJob;
}

type TrainingJobApiResponse = TrainingJobDetail | string | null;

export interface TrainingJobFetchResult {
  job: TrainingJob | null;
  message?: string;
}

/**
 * Fetch the active training job for a dataset (if any).
 * Returns { job: null } when the API reports TRAINING_NOT_RUNNING.
 */
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
  datasetRef: string | number,
): Promise<CheckpointStatusFetchResult> => {
  if (datasetRef === "" || datasetRef === null || datasetRef === undefined) {
    return { status: null };
  }

  const normalizedDatasetRef = String(datasetRef);

  const response = await apiFetch(
    `${TRAINING_BASE_URL}/${encodeURIComponent(normalizedDatasetRef)}/checkpoints/status`,
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
  datasetRef: string | number,
): Promise<CheckpointDetailsFetchResult> => {
  if (datasetRef === "" || datasetRef === null || datasetRef === undefined) {
    return { details: null };
  }

  const normalizedDatasetRef = String(datasetRef);

  const response = await apiFetch(
    `${TRAINING_BASE_URL}/${encodeURIComponent(normalizedDatasetRef)}/checkpoints`,
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

export const fetchTrainingJobStatus = async (
  datasetRef: string | number,
): Promise<TrainingJobFetchResult> => {
  if (datasetRef === "" || datasetRef === null || datasetRef === undefined) {
    return { job: null };
  }

  const normalizedDatasetRef = String(datasetRef);

  const response = await apiFetch(
    `${TRAINING_BASE_URL}/jobs/${encodeURIComponent(normalizedDatasetRef)}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
    },
  );

  const data = await parseCloudApiResponse<TrainingJobApiResponse>(response);

  if (response.status === 404) {
    return {
      job: null,
      message: formatApiError(
        data,
        `No active training job for dataset '${normalizedDatasetRef}'`,
      ),
    };
  }

  if (!response.ok) {
    throw new Error(
      formatApiError(data, "Failed to fetch training job status"),
    );
  }

  if (!data || typeof data !== "object" || !("job" in data)) {
    throw new Error("Unexpected training job response");
  }

  return { job: (data as TrainingJobDetail).job };
};
