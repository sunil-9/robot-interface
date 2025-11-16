/**
 * Centralized API service for episode management
 * Maps to backend endpoints at /episodes
 */

import { API_CONFIG } from "@/config/api";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";

const EPISODES_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EPISODES}`;
const DATASETS_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DATASETS}`;

// Type definitions matching backend schemas
export interface EpisodeMetadata {
  replay_count: number;
  total_length: number;
  frame_count: number;
  created_at: string | null;
  updated_at: string | null;
  tags: string[];
  description?: string;
  quality_score?: number;
  custom_metadata: Record<string, unknown>;
}

export interface Episode {
  episode_index: string;
  duration?: number;
  created_at?: string;
}

export interface EpisodeListResponse {
  episodes: Episode[];
  total_count: number;
  dataset_id?: string;
}

interface DatasetEpisodeSummary {
  episode_index: number;
  duration: number;
  created_at: string;
}

interface DatasetDetailResponse {
  dataset_id: string;
  total_episodes: number;
  total_frames: number;
  episodes: DatasetEpisodeSummary[];
}

export interface EpisodeCreate {
  episode_id?: string;
  dataset_id: string;
  total_length: number;
  frame_count?: number;
  tags?: string[];
  description?: string;
  quality_score?: number;
  custom_metadata?: Record<string, unknown>;
}

export interface EpisodeUpdate {
  total_length?: number;
  frame_count?: number;
  tags?: string[];
  description?: string;
  quality_score?: number;
  custom_metadata?: Record<string, unknown>;
}

export interface EpisodeReplayResponse {
  episode_id: string;
  dataset_id: string;
  replay_count: number;
  message: string;
}

export interface BulkDeleteRequest {
  dataset_id: string;
  episode_ids: string[];
}

export interface BulkDeleteResponse {
  dataset_id: string;
  deleted_count: number;
  failed_count: number;
  deleted_episodes: string[];
  failed_episodes: string[];
  message: string;
}

/**
 * Create a new episode
 */
export async function createEpisode(
  episodeData: EpisodeCreate
): Promise<Episode> {
  const response = await fetch(EPISODES_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(episodeData),
  });

  const data = await parseCloudApiResponse<Episode>(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to create episode"));
  }

  return data;
}

/**
 * List all episodes, optionally filtered by dataset
 */
type EpisodesApiResponse =
  | EpisodeListResponse
  | { detail?: DatasetDetailResponse | null };

export async function listEpisodes(
  datasetId?: string
): Promise<EpisodeListResponse> {
  const endpoint = datasetId
    ? `${DATASETS_BASE_URL}/${datasetId}`
    : EPISODES_BASE_URL;
  const response = await fetch(endpoint);

  const data = await parseCloudApiResponse<EpisodesApiResponse>(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to fetch episodes"));
  }

  if ("detail" in data && data.detail) {
    const detail  = data.detail;
    console.log("this is epsode details",detail)
    const normalizedEpisodes: Episode[] = detail.episodes.map((episode) => { 
      const createdAt = episode.created_at;
      const duration = Number.isFinite(episode.duration) ? episode.duration : 0;
      return {
        episode_id: episode.episode_index.toString(),
        dataset_id: detail.dataset_id,
       episode_index: episode.episode_index.toString(),
      };
    });
    return {
      episodes: normalizedEpisodes,
      total_count: detail.total_episodes as number,
      dataset_id: detail.dataset_id,
    };
  }

  return data as EpisodeListResponse;
}

/**
 * Get a specific episode by dataset_id and episode_id
 */
export async function getEpisode(
  datasetId: string,
  episodeId: string
): Promise<Episode> {
  const response = await fetch(
    `${EPISODES_BASE_URL}/${datasetId}/${episodeId}`
  );

  const data = await parseCloudApiResponse<Episode>(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to fetch episode"));
  }

  return data;
}

/**
 * Update an episode's metadata
 */
export async function updateEpisode(
  datasetId: string,
  episodeId: string,
  updateData: EpisodeUpdate
): Promise<Episode> {
  const response = await fetch(
    `${EPISODES_BASE_URL}/${datasetId}/${episodeId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    }
  );

  const data = await parseCloudApiResponse<Episode>(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to update episode"));
  }

  return data;
}

/**
 * Delete a single episode
 */
export async function deleteEpisode(
  datasetId: string,
  episodeId: string
): Promise<void> {
  const response = await fetch(
    `${EPISODES_BASE_URL}/${datasetId}/${episodeId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const detail = await parseCloudApiResponse<unknown>(response);
    throw new Error(formatApiError(detail, "Failed to delete episode"));
  }
}

/**
 * Replay an episode (increments replay count)
 */
export async function replayEpisode(
  datasetId: string,
  episodeId: string
): Promise<EpisodeReplayResponse> {
  const response = await fetch(
    `${EPISODES_BASE_URL}/${datasetId}/${episodeId}/replay`,
    {
      method: "POST",
    }
  );

  const data = await parseCloudApiResponse<EpisodeReplayResponse>(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to replay episode"));
  }

  return data;
}

/**
 * Bulk delete multiple episodes
 */
export async function bulkDeleteEpisodes(
  deleteRequest: BulkDeleteRequest
): Promise<BulkDeleteResponse> {
  const response = await fetch(`${EPISODES_BASE_URL}/bulk-delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deleteRequest),
  });

  const data = await parseCloudApiResponse<BulkDeleteResponse>(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to bulk delete episodes"));
  }

  return data;
}

/**
 * Get episode statistics
 */
export async function getEpisodeStats(
  datasetId: string,
  episodeId: string
): Promise<{
  episode_id: string;
  dataset_id: string;
  total_length: number;
  frame_count: number;
  replay_count: number;
  created_at: string;
  updated_at: string;
  quality_score?: number;
}> {
  const response = await fetch(
    `${EPISODES_BASE_URL}/${datasetId}/${episodeId}/stats`
  );

  const data = await parseCloudApiResponse<{
    episode_id: string;
    dataset_id: string;
    total_length: number;
    frame_count: number;
    replay_count: number;
    created_at: string;
    updated_at: string;
    quality_score?: number;
  }>(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to fetch episode stats"));
  }

  return data;
}
