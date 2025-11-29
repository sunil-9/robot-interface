import { API_CONFIG } from "@/config/api";
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
export const fetchTrainingJobStatus = async (
  datasetId: string
): Promise<TrainingJobFetchResult> => {
  if (!datasetId) {
    return { job: null };
  }

  const response = await fetch(
    `${TRAINING_BASE_URL}/jobs/${encodeURIComponent(datasetId)}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
    }
  );

  const data = await parseCloudApiResponse<TrainingJobApiResponse>(response);

  if (response.status === 404) {
    return {
      job: null,
      message: formatApiError(
        data,
        `No active training job for dataset '${datasetId}'`
      ),
    };
  }

  if (!response.ok) {
    throw new Error(
      formatApiError(data, "Failed to fetch training job status")
    );
  }

  if (!data || typeof data !== "object" || !("job" in data)) {
    throw new Error("Unexpected training job response");
  }

  return { job: (data as TrainingJobDetail).job };
};
