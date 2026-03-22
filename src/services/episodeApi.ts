import { API_CONFIG } from "@/config/api";
import { apiFetch } from "@/lib/apiClient";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";

const DATASETS_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DATASETS}`;

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

/**
 * List all episodes, optionally filtered by dataset
 */
type EpisodesApiResponse =
  | EpisodeListResponse
  | { detail?: DatasetDetailResponse | null };

export async function listEpisodes(
  datasetId?: string
): Promise<EpisodeListResponse> {
  const endpoint = `${DATASETS_BASE_URL}/${datasetId}`;
  const response = await apiFetch(endpoint);

  const data = await parseCloudApiResponse<EpisodesApiResponse>(response);

  if (!response.ok) {
    throw new Error(formatApiError(data, "Failed to fetch episodes"));
  }

  if ("detail" in data && data.detail) {
    const detail = data.detail;
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
 * Delete a single episode
 */
export async function deleteEpisode(
  datasetId: string,
  episodeId: string
): Promise<void> {

  const response = await apiFetch(
    `${DATASETS_BASE_URL}/${datasetId}/episodes/delete`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ episode_indices: [episodeId] }),
    }
  );

  if (!response.ok) {
    const detail = await parseCloudApiResponse<unknown>(response);
    throw new Error(formatApiError(detail, "Failed to delete episode"));
  }
}

/**
 * Get episode statistics
 */
// export interface EpisodeStatsResponse {

//   from_timestamp: number;
//   to_timestamp: number;
//   duration: number;
//   created_at: string | null;
//   frame_count: number;
// }

// export async function getEpisodeStats(
//   datasetId: string,
//   episodeId: string
// ): Promise<EpisodeStatsResponse> {
//   const response = await fetch(
//     `${DATASETS_BASE_URL}/${datasetId}/episodes/${episodeId}/stats`
//   );

//   const data = await parseCloudApiResponse<EpisodeStatsResponse>(response);

//   if (!response.ok) {
//     throw new Error(formatApiError(data, "Failed to fetch episode stats"));
//   }

//   return data;
// }
