/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiFetch } from "@/lib/apiClient";
import { parquetReadObjects } from "hyparquet";

export interface DatasetMetadata {
  codebase_version: string;
  robot_type: string | null;
  total_episodes: number;
  total_frames: number;
  total_tasks: number;
  total_videos?: number;
  total_chunks?: number;
  chunks_size: number;
  fps: number;
  splits: Record<string, string>;
  data_path: string;
  video_path: string | null;
  features: Record<
    string,
    {
      dtype: string;
      shape: any[];
      names: any[] | Record<string, any> | null;
      info?: Record<string, any>;
    }
  >;
}

type ParquetFetchOptions = {
  signal?: AbortSignal;
};

const parquetFileCache = new Map<string, Promise<ArrayBuffer>>();

export function invalidateParquetFileCache(url?: string): void {
  if (url) {
    parquetFileCache.delete(url);
    return;
  }

  parquetFileCache.clear();
}

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

// Fetch and parse the Parquet file
export async function fetchParquetFile(
  url: string,
  options: ParquetFetchOptions = {},
): Promise<ArrayBuffer> {
  const { signal } = options;
  throwIfAborted(signal);

  const cachedRequest = parquetFileCache.get(url);
  if (cachedRequest) {
    return withAbortSignal(cachedRequest, signal);
  }

  const request = apiFetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      }

      return res.arrayBuffer();
    })
    .catch((error) => {
      parquetFileCache.delete(url);
      throw error;
    });

  parquetFileCache.set(url, request);
  return withAbortSignal(request, signal);
}

// Read parquet file and return objects with column names as keys
export async function readParquetAsObjects(
  fileBuffer: ArrayBuffer,
  columns: string[] = [],
): Promise<Record<string, any>[]> {
  return parquetReadObjects({
    file: fileBuffer,
    columns: columns.length > 0 ? columns : undefined,
  });
}
