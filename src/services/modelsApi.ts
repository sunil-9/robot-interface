import { API_CONFIG } from "@/config/api";
import { apiFetch } from "@/lib/apiClient";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";

const MODELS_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MODELS}`;

export interface ModelSummary {
  model_id: number;
  algorithm: string;
  description: string | null;
  total_steps: number;
  max_target_steps: number | null;
  active_job_status: string | null; // "queued" | "training" | null
  created_at: string;
}

export interface ModelListResponse {
  dataset_id: number;
  models: ModelSummary[];
}

export interface ModelCreatePayload {
  algorithm: string;
  description?: string;
  target_steps: number;
}

export interface ModelCreateResponse {
  model_id: number;
  job_id: number;
}

export interface TrainModelPayload {
  additional_steps: number;
}

export interface TrainModelResponse {
  model_id: number;
  job_id: number;
}

/**
 * Fetch all models linked to a dataset, with their active job status.
 */
export const fetchModelsForDataset = async (
  datasetId: number,
): Promise<ModelListResponse> => {
  const response = await apiFetch(
    `${MODELS_BASE_URL}?dataset_id=${encodeURIComponent(datasetId)}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
    },
  );

  const data = await parseCloudApiResponse<ModelListResponse | string | null>(
    response,
  );

  if (!response.ok) {
    throw new Error(
      formatApiError(data, "Failed to fetch models for dataset"),
    );
  }

  if (!data || typeof data !== "object" || !("models" in data)) {
    throw new Error("Unexpected models response");
  }

  return data;
};

/**
 * Create a new model, link it to the dataset, and queue an initial training job.
 */
export const createModelAndTrain = async (
  datasetId: number,
  payload: ModelCreatePayload,
): Promise<ModelCreateResponse> => {
  const response = await apiFetch(
    `${MODELS_BASE_URL}?dataset_id=${encodeURIComponent(datasetId)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
    },
  );

  const data = await parseCloudApiResponse<
    ModelCreateResponse | string | null
  >(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to create model"));
  }

  if (!data || typeof data !== "object" || !("model_id" in data)) {
    throw new Error("Unexpected create-model response");
  }

  return data;
};

/**
 * Queue a new training job for an existing model.
 */
export const trainExistingModel = async (
  modelId: number,
  datasetId: number,
  payload: TrainModelPayload,
): Promise<TrainModelResponse> => {
  const response = await apiFetch(
    `${MODELS_BASE_URL}/${encodeURIComponent(modelId)}/train?dataset_id=${encodeURIComponent(datasetId)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT.DEFAULT),
    },
  );

  const data = await parseCloudApiResponse<
    TrainModelResponse | string | null
  >(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to queue training job"));
  }

  if (!data || typeof data !== "object" || !("model_id" in data)) {
    throw new Error("Unexpected train-model response");
  }

  return data;
};
