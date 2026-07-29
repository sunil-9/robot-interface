import { apiFetch } from "@/lib/apiClient";
import { formatApiError, parseCloudApiResponse } from "@/utils/apiResponse";
import { DatasetMetadata, invalidateParquetFileCache } from "./parquetUtils";

interface DatasetVisualizationDescriptor {
  dataset_id: string;
  source: "backend_proxy";
  file_base_url: string;
  metadata_url: string;
  episode_metadata_paths?: string[];
  presigned_video_urls?: Record<string, string>;
  presigned_url_expires_in_seconds?: number | null;
  dataset_path?: string | null;
  version?: string | null;
  metadata: DatasetMetadata;
}

const descriptorCache = new Map<string, DatasetVisualizationDescriptor>();
const descriptorRequestCache = new Map<
  string,
  Promise<DatasetVisualizationDescriptor>
>();

const createAbortError = (): Error => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

const withAbortSignal = async <T,>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> => {
  throwIfAborted(signal);

  if (!signal) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(createAbortError());

    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
};

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
  signal?: AbortSignal,
): Promise<DatasetVisualizationDescriptor> => {
  const { datasetId } = splitRepoId(repoId);
  const response = await apiFetch(
    `/datasets/${encodeURIComponent(datasetId)}/visualization`,
    {
      cache: "no-store",
      signal,
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
  signal?: AbortSignal,
): Promise<DatasetVisualizationDescriptor> => {
  throwIfAborted(signal);

  const cached = descriptorCache.get(repoId);
  if (cached) {
    return cached;
  }

  const pending = descriptorRequestCache.get(repoId);
  if (pending) {
    return withAbortSignal(pending, signal);
  }

  const request = fetchDatasetDescriptor(repoId, signal)
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
  return withAbortSignal(request, signal);
};

export function invalidateDatasetDescriptorCache(
  repoIdOrDatasetId?: string | number | null,
): void {
  if (repoIdOrDatasetId === undefined || repoIdOrDatasetId === null) {
    descriptorCache.clear();
    descriptorRequestCache.clear();
    invalidateParquetFileCache();
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

  invalidateParquetFileCache();
}

/**
 * Fetches dataset information from the configured visualization source.
 */
export async function getDatasetInfo(
  repoId: string,
  signal?: AbortSignal,
): Promise<DatasetMetadata> {
  const descriptor = await getDatasetDescriptor(repoId, signal);
  return descriptor.metadata;
}

export async function getEpisodeMetadataPaths(
  repoId: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const descriptor = await getDatasetDescriptor(repoId, signal);
  return Array.isArray(descriptor.episode_metadata_paths)
    ? descriptor.episode_metadata_paths
    : [];
}

/**
 * Gets the dataset version by reading codebase_version from info.json.
 */
export async function getDatasetVersion(
  repoId: string,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const datasetInfo = await getDatasetInfo(repoId, signal);
    const codebaseVersion = datasetInfo.codebase_version;

    if (!codebaseVersion) {
      throw new Error("Dataset info.json does not contain codebase_version");
    }

    if (codebaseVersion !== "v3.0") {
      throw new Error(
        `Dataset ${repoId} has codebase version ${codebaseVersion}, which is not supported. ` +
          "This visualizer only supports v3.0 datasets.",
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
    const normalizedPath = path.replace(/^\/+/, "");
    const presignedVideoUrl = descriptor.presigned_video_urls?.[normalizedPath];
    if (presignedVideoUrl) {
      return presignedVideoUrl;
    }

    return joinFileUrl(descriptor.file_base_url, normalizedPath);
  }

  throw new Error(
    `Dataset descriptor for '${repoId}' is not loaded. Fetch dataset metadata before building asset URLs.`,
  );
}
