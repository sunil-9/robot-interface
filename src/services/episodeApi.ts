/**
 * Centralized API service for episode management
 * Maps to backend endpoints at /episodes
 */

import { API_CONFIG } from "@/config/api";

const EPISODES_BASE_URL = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EPISODES}`;

// Type definitions matching backend schemas
export interface EpisodeMetadata {
  replay_count: number;
  total_length: number;
  frame_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  description?: string;
  quality_score?: number;
  custom_metadata: Record<string, unknown>;
}

export interface Episode {
  episode_id: string;
  dataset_id: string;
  metadata: EpisodeMetadata;
  data_path?: string;
}

export interface EpisodeListResponse {
  episodes: Episode[];
  total_count: number;
  dataset_id?: string;
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create episode");
  }

  return response.json();
}

/**
 * List all episodes, optionally filtered by dataset
 */
export async function listEpisodes(
  datasetId?: string
): Promise<EpisodeListResponse> {
  const url = new URL(EPISODES_BASE_URL);
  if (datasetId) {
    url.searchParams.append("dataset_id", datasetId);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("Failed to fetch episodes");
  }

  return response.json();
}

/**
 * Get a specific episode by dataset_id and episode_id
 */
export async function getEpisode(
  datasetId: string,
  episodeId: string
): Promise<Episode> {
  const response = await fetch(`${EPISODES_BASE_URL}/${datasetId}/${episodeId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch episode");
  }

  return response.json();
}

/**
 * Update an episode's metadata
 */
export async function updateEpisode(
  datasetId: string,
  episodeId: string,
  updateData: EpisodeUpdate
): Promise<Episode> {
  const response = await fetch(`${EPISODES_BASE_URL}/${datasetId}/${episodeId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update episode");
  }

  return response.json();
}

/**
 * Delete a single episode
 */
export async function deleteEpisode(
  datasetId: string,
  episodeId: string
): Promise<void> {
  const response = await fetch(`${EPISODES_BASE_URL}/${datasetId}/${episodeId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete episode");
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to replay episode");
  }

  return response.json();
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to bulk delete episodes");
  }

  return response.json();
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch episode stats");
  }

  return response.json();
}
