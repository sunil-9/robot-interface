import { apiFetch } from "@/lib/apiClient";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";

/**
 * Dataset information structure from info.json
 */
interface DatasetInfo {
  codebase_version: string;
  robot_type: string | null;
  total_episodes: number;
  total_frames: number;
  total_tasks: number;
  chunks_size: number;
  data_files_size_in_mb: number;
  video_files_size_in_mb: number;
  fps: number;
  splits: Record<string, string>;
  data_path: string;
  video_path: string;
  features: Record<string, unknown>;
}

interface DatasetVisualizationDescriptor {
  dataset_id: string;
  source: "backend_proxy";
  file_base_url: string;
  metadata_url: string;
  episode_metadata_paths?: string[];
  dataset_path?: string | null;
  version?: string | null;
  metadata: DatasetInfo;
}

const descriptorCache = new Map<string, DatasetVisualizationDescriptor>();
const descriptorRequestCache = new Map<
  string,
  Promise<DatasetVisualizationDescriptor>
>();

const splitRepoId = (repoId: string): { datasetId: string } => {
  const segments = repoId.split("/").filter(Boolean);
  if (segments.length === 0) {
    throw new Error("Dataset repo id is required.");
  }

  return {
    datasetId: segments[segments.length - 1],
  };
};

const joinFileUrl = (baseUrl: string, path: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

const fetchDatasetDescriptor = async (
  repoId: string,
): Promise<DatasetVisualizationDescriptor> => {
  const { datasetId } = splitRepoId(repoId);
  const response = await apiFetch(
    `/datasets/${encodeURIComponent(datasetId)}/visualization`,
    {
      cache: "no-store",
    },
  );
  const payload = await parseCloudApiResponse<
    DatasetVisualizationDescriptor | unknown
  >(response);

  if (!response.ok) {
    throw new Error(
      formatApiError(
        payload,
        `Failed to resolve dataset visualization info (${response.status})`,
      ),
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("file_base_url" in payload) ||
    !("metadata" in payload)
  ) {
    throw new Error("Dataset visualization response is missing required fields.");
  }

  return payload as DatasetVisualizationDescriptor;
};

const getDatasetDescriptor = async (
  repoId: string,
): Promise<DatasetVisualizationDescriptor> => {
  const cached = descriptorCache.get(repoId);
  if (cached) {
    return cached;
  }

  const pending = descriptorRequestCache.get(repoId);
  if (pending) {
    return pending;
  }

  const request = fetchDatasetDescriptor(repoId)
    .then((descriptor) => {
      descriptorCache.set(repoId, descriptor);
      descriptorRequestCache.delete(repoId);
      return descriptor;
    })
    .catch((error) => {
      descriptorRequestCache.delete(repoId);
      throw error;
    });

  descriptorRequestCache.set(repoId, request);
  return request;
};

export function invalidateDatasetDescriptorCache(
  repoIdOrDatasetId?: string | number | null,
): void {
  if (repoIdOrDatasetId === undefined || repoIdOrDatasetId === null) {
    descriptorCache.clear();
    descriptorRequestCache.clear();
    return;
  }

  const targetDatasetId = splitRepoId(String(repoIdOrDatasetId)).datasetId;
  const cacheKeys = new Set([
    ...descriptorCache.keys(),
    ...descriptorRequestCache.keys(),
  ]);

  for (const cacheKey of cacheKeys) {
    if (splitRepoId(cacheKey).datasetId === targetDatasetId) {
      descriptorCache.delete(cacheKey);
      descriptorRequestCache.delete(cacheKey);
    }
  }
}

/**
 * Fetches dataset information from the configured visualization source.
 */
export async function getDatasetInfo(repoId: string): Promise<DatasetInfo> {
  const descriptor = await getDatasetDescriptor(repoId);
  return descriptor.metadata;
}

export async function getEpisodeMetadataPaths(repoId: string): Promise<string[]> {
  const descriptor = await getDatasetDescriptor(repoId);
  return Array.isArray(descriptor.episode_metadata_paths)
    ? descriptor.episode_metadata_paths
    : [];
}

/**
 * Gets the dataset version by reading codebase_version from info.json.
 */
export async function getDatasetVersion(repoId: string): Promise<string> {
  try {
    const datasetInfo = await getDatasetInfo(repoId);
    const codebaseVersion = datasetInfo.codebase_version;

    if (!codebaseVersion) {
      throw new Error("Dataset info.json does not contain codebase_version");
    }

    const supportedVersions = ["v3.0", "v2.1", "v2.0"];
    if (!supportedVersions.includes(codebaseVersion)) {
      throw new Error(
        `Dataset ${repoId} has codebase version ${codebaseVersion}, which is not supported. ` +
          "This tool only works with dataset versions 3.0, 2.1, or 2.0. " +
          "Please use a compatible dataset version.",
      );
    }

    return codebaseVersion;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Dataset ${repoId} is not compatible with this visualizer. ` +
        "Failed to read dataset information from the configured source.",
    );
  }
}

export function buildVersionedUrl(
  repoId: string,
  version: string,
  path: string,
): string {
  void version;

  const descriptor = descriptorCache.get(repoId);
  if (descriptor) {
    return joinFileUrl(descriptor.file_base_url, path);
  }

  throw new Error(
    `Dataset descriptor for '${repoId}' is not loaded. Fetch dataset metadata before building asset URLs.`,
  );
}
