/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DatasetMetadata,
  fetchParquetFile,
  readParquetAsObjects,
} from "../utils/parquetUtils";
import { pick } from "../utils/pick";
import {
  buildVersionedUrl,
  getDatasetInfo,
  getDatasetVersion,
  getEpisodeMetadataPaths,
} from "../utils/versionUtils";

const SERIES_NAME_DELIMITER = " | ";


type EpisodeMetadataCacheEntry = {
  rowsByEpisodeId: Map<number, any>;
  scannedPaths: Set<string>;
};

const episodeMetadataCache = new Map<string, EpisodeMetadataCacheEntry>();

const getEpisodeMetadataCacheEntry = (
  repoId: string,
): EpisodeMetadataCacheEntry => {
  let entry = episodeMetadataCache.get(repoId);
  if (!entry) {
    entry = {
      rowsByEpisodeId: new Map<number, any>(),
      scannedPaths: new Set<string>(),
    };
    episodeMetadataCache.set(repoId, entry);
  }

  return entry;
};

export function invalidateEpisodeMetadataCache(
  repoIdOrDatasetId?: string | number | null,
): void {
  if (repoIdOrDatasetId === undefined || repoIdOrDatasetId === null) {
    episodeMetadataCache.clear();
    return;
  }

  const targetDatasetId = String(repoIdOrDatasetId).split("/").filter(Boolean).at(-1);
  for (const cacheKey of episodeMetadataCache.keys()) {
    const cacheDatasetId = cacheKey.split("/").filter(Boolean).at(-1);
    if (cacheDatasetId === targetDatasetId) {
      episodeMetadataCache.delete(cacheKey);
    }
  }
}

export async function getEpisodeData(
  org: string,
  dataset: string,
  episodeId: number,
  signal?: AbortSignal,
) {
  const repoId = `${org}/${dataset}`;
  const startedAt = performance.now();
  try {
    const versionStartedAt = performance.now();
    const version = await getDatasetVersion(repoId, signal);

    const infoStartedAt = performance.now();
    const info = await getDatasetInfo(repoId, signal);

    if (info.video_path === null) {
      throw new Error("Only videos datasets are supported in this visualizer.\nPlease use Rerun visualizer for images datasets.");
    }

    const data = await getEpisodeDataV3(repoId, version, info, episodeId, signal);
    // logVisualizationTiming("episode data total", startedAt, {
    //   repoId,
    //   episodeId,
    // });
    return data;
  } catch (err) {
    if (isAbortError(err)) {
      throw err;
    }
    console.error("Error loading episode data:", err);
    throw err;
  }
}

// v3.0 implementation with segmentation support for all episodes
async function getEpisodeDataV3(
  repoId: string,
  version: string,
  info: DatasetMetadata,
  episodeId: number,
  signal?: AbortSignal,
) {
  const startedAt = performance.now();
  const datasetInfo = {
    repoId,
    total_frames: info.total_frames,
    total_episodes: info.total_episodes,
    fps: info.fps,
  };

  // Generate episodes list based on total_episodes from dataset info
  const episodes = Array.from({ length: info.total_episodes }, (_, i) => i);

  // Load episode metadata to get timestamps for episode 0
  const episodeMetadataStartedAt = performance.now();
  const episodeMetadata = await loadEpisodeMetadataV3Simple(
    repoId,
    version,
    episodeId,
    info.chunks_size,
    info.total_episodes,
    signal,
  );

  // Create video info with segmentation using the metadata
  const videoInfoStartedAt = performance.now();
  const videosInfo = extractVideoInfoV3WithSegmentation(repoId, version, info, episodeMetadata);


  // Load episode data for charts
  const chartDataStartedAt = performance.now();
  const { chartDataGroups, ignoredColumns, task } = await loadEpisodeDataV3(repoId, version, info, episodeMetadata, signal);


  // Calculate duration from episode length and FPS if available
  const duration = episodeMetadata.length ? episodeMetadata.length / info.fps : 
                   (episodeMetadata.video_to_timestamp - episodeMetadata.video_from_timestamp);
  
  return {
    datasetInfo,
    episodeId,
    videosInfo,
    chartDataGroups,
    episodes,
    ignoredColumns,
    duration,
    task,
  };
}

// Load episode data for v3.0 charts
async function loadEpisodeDataV3(
  repoId: string,
  version: string,
  info: DatasetMetadata,
  episodeMetadata: any,
  signal?: AbortSignal,
): Promise<{ chartDataGroups: any[]; ignoredColumns: string[]; task?: string }> {
  // Build data file path using chunk and file indices
  const dataChunkIndex = episodeMetadata.data_chunk_index || 0;
  const dataFileIndex = episodeMetadata.data_file_index || 0;
  const dataPath = `data/chunk-${dataChunkIndex.toString().padStart(3, "0")}/file-${dataFileIndex.toString().padStart(3, "0")}.parquet`;
  
  try {
    const dataUrl = buildVersionedUrl(repoId, version, dataPath);
    const fetchStartedAt = performance.now();
    const arrayBuffer = await fetchParquetFile(dataUrl, { signal });


    const readStartedAt = performance.now();
    const fullData = await readParquetAsObjects(arrayBuffer, []);

    
    // Extract the episode-specific data slice
    // Convert BigInt to number if needed
    const fromIndex = Number(episodeMetadata.dataset_from_index || 0);
    const toIndex = Number(episodeMetadata.dataset_to_index || fullData.length);
    
    // Find the starting index of this parquet file by checking the first row's index
    // This handles the case where episodes are split across multiple parquet files
    let fileStartIndex = 0;
    if (fullData.length > 0 && fullData[0].index !== undefined) {
      fileStartIndex = Number(fullData[0].index);
    }
    
    // Adjust indices to be relative to this file's starting position
    const localFromIndex = Math.max(0, fromIndex - fileStartIndex);
    const localToIndex = Math.min(fullData.length, toIndex - fileStartIndex);
    
    const episodeData = fullData.slice(localFromIndex, localToIndex);
    
    if (episodeData.length === 0) {
      return { chartDataGroups: [], ignoredColumns: [], task: undefined };
    }
    
    const processStartedAt = performance.now();
    const { chartDataGroups, ignoredColumns } = processEpisodeDataForCharts(episodeData, info, episodeMetadata);

    
    // First check for language_instruction fields in the data (preferred)
    let task: string | undefined;
    if (episodeData.length > 0) {
      const firstRow = episodeData[0];
      const languageInstructions: string[] = [];
      
      // Check for language_instruction field
      if (firstRow.language_instruction) {
        languageInstructions.push(firstRow.language_instruction);
      }
      
      // Check for numbered language_instruction fields
      let instructionNum = 2;
      while (firstRow[`language_instruction_${instructionNum}`]) {
        languageInstructions.push(firstRow[`language_instruction_${instructionNum}`]);
        instructionNum++;
      }
      
      // If no instructions found in first row, check a few more rows
      if (languageInstructions.length === 0 && episodeData.length > 1) {
        const middleIndex = Math.floor(episodeData.length / 2);
        const lastIndex = episodeData.length - 1;
        
        [middleIndex, lastIndex].forEach((idx) => {
          const row = episodeData[idx];
          
          if (row.language_instruction && languageInstructions.length === 0) {
            // Use this row's instructions
            if (row.language_instruction) {
              languageInstructions.push(row.language_instruction);
            }
            let num = 2;
            while (row[`language_instruction_${num}`]) {
              languageInstructions.push(row[`language_instruction_${num}`]);
              num++;
            }
          }
        });
      }
      
      // Join all instructions with line breaks
      if (languageInstructions.length > 0) {
        task = languageInstructions.join('\n');
      }
    }
    
    // If no language instructions found, fall back to tasks metadata
    if (!task) {
      try {
        // Load tasks metadata
        const tasksUrl = buildVersionedUrl(repoId, version, "meta/tasks.parquet");
        const tasksFetchStartedAt = performance.now();
        const tasksArrayBuffer = await fetchParquetFile(tasksUrl, { signal });
        const tasksDecodeStartedAt = performance.now();
        const tasksData = await readParquetAsObjects(tasksArrayBuffer, []);
        
        if (episodeData.length > 0 && tasksData && tasksData.length > 0) {
          const taskIndex = episodeData[0].task_index;
          
          // Convert BigInt to number for comparison
          const taskIndexNum = typeof taskIndex === 'bigint' ? Number(taskIndex) : taskIndex;
          
          // Look up task by index
          if (taskIndexNum !== undefined && taskIndexNum < tasksData.length) {
            const taskData = tasksData[taskIndexNum];
            // Extract task from __index_level_0__ field
            task = taskData.__index_level_0__ || taskData.task || taskData['task'] || taskData[0];
          }
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        // Could not load tasks metadata - dataset might not have language tasks
      }
    }
    
    return { chartDataGroups, ignoredColumns, task };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return { chartDataGroups: [], ignoredColumns: [], task: undefined };
  }
}

// Process episode data for charts (v3.0 compatible)
function processEpisodeDataForCharts(
  episodeData: any[],
  info: DatasetMetadata,
  episodeMetadata?: any,
): { chartDataGroups: any[]; ignoredColumns: string[] } {
  
  // Get numeric column features
  const columnNames = Object.entries(info.features)
    .filter(
      ([, value]) =>
        ["float32", "int32"].includes(value.dtype) &&
        value.shape.length === 1,
    )
    .map(([key, value]) => ({ key, value }));

  // Convert parquet data to chart format
  let seriesNames: string[] = [];
  
  // Dynamically create a mapping from numeric indices to feature names based on actual dataset features
  const v3IndexToFeatureMap: Record<string, string> = {};
  
  // Build mapping based on what features actually exist in the dataset
  const featureKeys = Object.keys(info.features);
  
  // Common feature order for v3.0 datasets (but only include if they exist)
  const expectedFeatureOrder = [
    'observation.state',
    'action', 
    'timestamp',
    'episode_index',
    'frame_index',
    'next.reward',
    'next.done',
    'index',
    'task_index'
  ];
  
  // Map indices to features that actually exist
  let currentIndex = 0;
  expectedFeatureOrder.forEach(feature => {
    if (featureKeys.includes(feature)) {
      v3IndexToFeatureMap[currentIndex.toString()] = feature;
      currentIndex++;
    }
  });
  
  // Columns to exclude from charts (note: 'task' is intentionally not excluded as we want to access it)
  const excludedColumns = ['index', 'task_index', 'episode_index', 'frame_index', 'next.done'];

  // Create columns structure with hierarchical names for vector features.
  const columns = Object.entries(info.features)
    .filter(([key, value]) => 
      ["float32", "int32"].includes(value.dtype) && 
      value.shape.length === 1 && 
      !excludedColumns.includes(key)
    )
    .map(([key, feature]) => {
      let column_names = feature.names;
      while (typeof column_names === "object") {
        if (Array.isArray(column_names)) break;
        column_names = Object.values(column_names ?? {})[0];
      }
      return {
        key,
        value: Array.isArray(column_names)
          ? column_names.map((name) => `${key}${SERIES_NAME_DELIMITER}${name}`)
          : Array.from(
              { length: feature.shape[0] || 1 },
              (_, i) => `${key}${SERIES_NAME_DELIMITER}${i}`,
            ),
      };
    });

  // First, extract all series from the first data row to understand the structure
  if (episodeData.length > 0) {
    const firstRow = episodeData[0];
    const allKeys: string[] = [];
    
    Object.entries(firstRow || {}).forEach(([key, value]) => {
      if (key === 'timestamp') return; // Skip timestamp, we'll add it separately
      
      // Map numeric key to feature name if available
      const featureName = v3IndexToFeatureMap[key] || key;
      
      // Skip if feature doesn't exist in dataset
      if (!info.features[featureName]) return;
      
      // Skip excluded columns
      if (excludedColumns.includes(featureName)) return;
      
      // Find the matching column definition to get proper names
      const columnDef = columns.find(col => col.key === featureName);
      if (columnDef && Array.isArray(value) && value.length > 0) {
        // Use the proper hierarchical naming from column definition
        columnDef.value.forEach((seriesName, idx) => {
          if (idx < value.length) {
            allKeys.push(seriesName);
          }
        });
      } else if (typeof value === 'number' && !isNaN(value)) {
        // For scalar numeric values
        allKeys.push(featureName);
      } else if (typeof value === 'bigint') {
        // For BigInt values
        allKeys.push(featureName);
      }
    });
    
    seriesNames = ["timestamp", ...allKeys];
  } else {
    // Fallback to column definitions when there is no episode row to inspect.
    seriesNames = [
      "timestamp",
      ...columns.map(({ value }) => value).flat(),
    ];
  }

  const chartData = episodeData.map((row, index) => {
    const obj: Record<string, number> = {};
    
    // Add timestamp aligned with video timing
    // For v3.0, we need to map the episode data index to the actual video duration
    let videoDuration = episodeData.length; // Fallback to data length
    if (episodeMetadata) {
      // Use actual video segment duration if available
      videoDuration = (episodeMetadata.video_to_timestamp || 30) - (episodeMetadata.video_from_timestamp || 0);
    }
    obj["timestamp"] = (index / Math.max(episodeData.length - 1, 1)) * videoDuration;
    
    // Add all data columns using hierarchical naming
    if (row && typeof row === 'object') {
      Object.entries(row).forEach(([key, value]) => {
        if (key === 'timestamp') {
          // Timestamp is already handled above
          return;
        }
        
        // Map numeric key to feature name if available
        const featureName = v3IndexToFeatureMap[key] || key;
        
        // Skip if feature doesn't exist in dataset
        if (!info.features[featureName]) return;
        
        // Skip excluded columns
        if (excludedColumns.includes(featureName)) return;
        
        // Find the matching column definition to get proper series names
        const columnDef = columns.find(col => col.key === featureName);
        
        if (Array.isArray(value) && columnDef) {
          // For array values like observation.state and action, use proper hierarchical naming
          value.forEach((val, idx) => {
            if (idx < columnDef.value.length) {
              const seriesName = columnDef.value[idx];
              obj[seriesName] = typeof val === 'number' ? val : Number(val);
            }
          });
        } else if (typeof value === 'number' && !isNaN(value)) {
          obj[featureName] = value;
        } else if (typeof value === 'bigint') {
          obj[featureName] = Number(value);
        } else if (typeof value === 'boolean') {
          // Convert boolean to number for charts
          obj[featureName] = value ? 1 : 0;
        }
      });
    }
    
    return obj;
  });

  // List of columns that are ignored (now we handle 2D data by flattening)
  const ignoredColumns = [
    ...Object.entries(info.features)
      .filter(
        ([, value]) =>
          ["float32", "int32"].includes(value.dtype) && value.shape.length > 2, // Only ignore 3D+ data
      )
      .map(([key]) => key),
    ...excludedColumns // Also include the manually excluded columns
  ];

  // Group related series by suffix so similarly named values chart together.
  const numericKeys = seriesNames.filter((k) => k !== "timestamp");
  const suffixGroupsMap: Record<string, string[]> = {};
  
  for (const key of numericKeys) {
    const parts = key.split(SERIES_NAME_DELIMITER);
    const suffix = parts[1] || parts[0]; // fallback to key if no delimiter
    if (!suffixGroupsMap[suffix]) suffixGroupsMap[suffix] = [];
    suffixGroupsMap[suffix].push(key);
  }
  const suffixGroups = Object.values(suffixGroupsMap);
  

  // Compute min/max for each suffix group
  const groupStats: Record<string, { min: number; max: number }> = {};
  suffixGroups.forEach((group) => {
    let min = Infinity, max = -Infinity;
    for (const row of chartData) {
      for (const key of group) {
        const v = row[key];
        if (typeof v === "number" && !isNaN(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    groupStats[group[0]] = { min, max };
  });

  // Group by similar scale
  const scaleGroups: Record<string, string[][]> = {};
  const used = new Set<string>();
  const SCALE_THRESHOLD = 2;
  for (const group of suffixGroups) {
    const groupId = group[0];
    if (used.has(groupId)) continue;
    const { min, max } = groupStats[groupId];
    if (!isFinite(min) || !isFinite(max)) continue;
    const logMin = Math.log10(Math.abs(min) + 1e-9);
    const logMax = Math.log10(Math.abs(max) + 1e-9);
    const unit: string[][] = [group];
    used.add(groupId);
    for (const other of suffixGroups) {
      const otherId = other[0];
      if (used.has(otherId) || otherId === groupId) continue;
      const { min: omin, max: omax } = groupStats[otherId];
      if (!isFinite(omin) || !isFinite(omax) || omin === omax) continue;
      const ologMin = Math.log10(Math.abs(omin) + 1e-9);
      const ologMax = Math.log10(Math.abs(omax) + 1e-9);
      if (
        Math.abs(logMin - ologMin) <= SCALE_THRESHOLD &&
        Math.abs(logMax - ologMax) <= SCALE_THRESHOLD
      ) {
        unit.push(other);
        used.add(otherId);
      }
    }
    scaleGroups[groupId] = unit;
  }

  // Flatten into chartGroups
  const chartGroups: string[][] = Object.values(scaleGroups)
    .sort((a, b) => b.length - a.length)
    .flatMap((suffixGroupArr) => {
      const merged = suffixGroupArr.flat();
      if (merged.length > 6) {
        const subgroups = [];
        for (let i = 0; i < merged.length; i += 6) {
          subgroups.push(merged.slice(i, i + 6));
        }
        return subgroups;
      }
      return [merged];
    });

  // Utility function to group row keys by suffix for the chart legend.
  function groupRowBySuffix(row: Record<string, number>): Record<string, any> {
    const result: Record<string, any> = {};
    const suffixGroups: Record<string, Record<string, number>> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === "timestamp") {
        result["timestamp"] = value;
        continue;
      }
      const parts = key.split(SERIES_NAME_DELIMITER);
      if (parts.length === 2) {
        const [prefix, suffix] = parts;
        if (!suffixGroups[suffix]) suffixGroups[suffix] = {};
        suffixGroups[suffix][prefix] = value;
      } else {
        result[key] = value;
      }
    }
    for (const [suffix, group] of Object.entries(suffixGroups)) {
      const keys = Object.keys(group);
      if (keys.length === 1) {
        // Use the full original name as the key
        const fullName = `${keys[0]}${SERIES_NAME_DELIMITER}${suffix}`;
        result[fullName] = group[keys[0]];
      } else {
        result[suffix] = group;
      }
    }
    return result;
  }

  const chartDataGroups = chartGroups.map((group) =>
    chartData.map((row) => groupRowBySuffix(pick(row, [...group, "timestamp"])))
  );


  return { chartDataGroups, ignoredColumns };
}


// Video info extraction with segmentation for v3.0
function extractVideoInfoV3WithSegmentation(
  repoId: string,
  version: string,
  info: DatasetMetadata,
  episodeMetadata: any,
): any[] {
  // Get video features from dataset info
  const videoFeatures = Object.entries(info.features)
    .filter(([, value]) => value.dtype === "video");

  const videosInfo = videoFeatures.map(([videoKey]) => {
    // Check if we have per-camera metadata in the episode row
    const cameraSpecificKeys = Object.keys(episodeMetadata).filter(key => 
      key.startsWith(`videos/${videoKey}/`)
    );
    
    let chunkIndex, fileIndex, segmentStart, segmentEnd;
    
    if (cameraSpecificKeys.length > 0) {
      // Use camera-specific metadata
      const chunkValue = episodeMetadata[`videos/${videoKey}/chunk_index`];
      const fileValue = episodeMetadata[`videos/${videoKey}/file_index`];
      chunkIndex = typeof chunkValue === 'bigint' ? Number(chunkValue) : (chunkValue || 0);
      fileIndex = typeof fileValue === 'bigint' ? Number(fileValue) : (fileValue || 0);
      segmentStart = episodeMetadata[`videos/${videoKey}/from_timestamp`] || 0;
      segmentEnd = episodeMetadata[`videos/${videoKey}/to_timestamp`] || 30;
    } else {
      // Fallback to generic video metadata
      chunkIndex = episodeMetadata.video_chunk_index || 0;
      fileIndex = episodeMetadata.video_file_index || 0;
      segmentStart = episodeMetadata.video_from_timestamp || 0;
      segmentEnd = episodeMetadata.video_to_timestamp || 30;
    }
    
    const videoPath = `videos/${videoKey}/chunk-${chunkIndex.toString().padStart(3, "0")}/file-${fileIndex.toString().padStart(3, "0")}.mp4`;
    const fullUrl = buildVersionedUrl(repoId, version, videoPath);
    
    return {
      filename: videoKey,
      url: fullUrl,
      // Enable segmentation with timestamps from metadata
      isSegmented: true,
      segmentStart: segmentStart,
      segmentEnd: segmentEnd,
      segmentDuration: segmentEnd - segmentStart,
    };
  });

  return videosInfo;
}

// Metadata loading for v3.0 episodes
async function loadEpisodeMetadataV3Simple(
  repoId: string,
  version: string,
  episodeId: number,
  chunksSize: number | undefined,
  totalEpisodes?: number,
  signal?: AbortSignal,
): Promise<any> {
  const cacheEntry = getEpisodeMetadataCacheEntry(repoId);
  const cachedRow = cacheEntry.rowsByEpisodeId.get(episodeId);
  if (cachedRow) {
    return cachedRow;
  }

  // Pattern: meta/episodes/chunk-{chunk_index:03d}/file-{file_index:03d}.parquet
  // Prefer the backend-provided file list because deleted episodes can leave
  // sparse physical file indexes, e.g. file-001 with no file-000.
  const listedPaths = await getEpisodeMetadataPaths(repoId, signal);
  const candidatePaths = getEpisodeMetadataCandidatePaths(
    episodeId,
    chunksSize,
    totalEpisodes,
    listedPaths,
  );

  for (const episodesMetadataPath of candidatePaths) {
    const rowFromScannedFile = cacheEntry.rowsByEpisodeId.get(episodeId);
    if (rowFromScannedFile) {
      return rowFromScannedFile;
    }

    const episodesMetadataUrl = buildVersionedUrl(repoId, version, episodesMetadataPath);

    try {
      if (!cacheEntry.scannedPaths.has(episodesMetadataPath)) {
        const fetchStartedAt = performance.now();
        const arrayBuffer = await fetchParquetFile(episodesMetadataUrl, { signal });
        const decodeStartedAt = performance.now();
        const episodesData = await readParquetAsObjects(arrayBuffer, []);
        const cacheStartedAt = performance.now();
        cacheEpisodeMetadataRows(cacheEntry, episodesMetadataPath, episodesData);
      }

      const row = cacheEntry.rowsByEpisodeId.get(episodeId);
      if (row) return row;
    } catch (error) {
      if (isMissingMetadataFileError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Episode ${episodeId} not found in metadata (${candidatePaths.length} file(s) checked)`,
  );
}

function getEpisodeMetadataCandidatePaths(
  episodeId: number,
  configuredChunksSize: number | undefined,
  totalEpisodes: number | undefined,
  listedPaths: string[],
): string[] {
  const chunksSize = Math.max(1, configuredChunksSize ?? totalEpisodes ?? 1);
  const expectedChunkIndex = Math.floor(episodeId / chunksSize);
  const expectedFileIndex = episodeId % chunksSize;
  const expectedPath = buildEpisodeMetadataPath(
    expectedChunkIndex,
    expectedFileIndex,
  );
  const commonSingleFilePath = buildEpisodeMetadataPath(0, 0);
  const listedExpectedPaths = listedPaths.filter((path) => {
    const parsed = parseEpisodeMetadataPath(path);
    return (
      parsed !== null &&
      (parsed.fileIndex === expectedFileIndex || parsed.chunkIndex === expectedChunkIndex)
    );
  });

  if (listedPaths.length > 0) {
    return [
      ...new Set([
        expectedPath,
        commonSingleFilePath,
        ...listedExpectedPaths,
        ...listedPaths,
      ]),
    ];
  }

  const fallbackScanLimit = Math.max(totalEpisodes ?? 0, episodeId + 1, 100);
  const fallbackPaths = Array.from({ length: fallbackScanLimit + 1 }, (_, index) =>
    buildEpisodeMetadataPath(Math.floor(index / chunksSize), index % chunksSize),
  );

  return [...new Set([expectedPath, commonSingleFilePath, ...fallbackPaths])];
}

function buildEpisodeMetadataPath(chunkIndex: number, fileIndex: number): string {
  return `meta/episodes/chunk-${chunkIndex.toString().padStart(3, "0")}/file-${fileIndex.toString().padStart(3, "0")}.parquet`;
}

function parseEpisodeMetadataPath(
  path: string,
): { chunkIndex: number; fileIndex: number } | null {
  const match = /meta\/episodes\/chunk-(\d+)\/file-(\d+)\.parquet$/.exec(path);
  if (!match) return null;

  return {
    chunkIndex: Number.parseInt(match[1], 10),
    fileIndex: Number.parseInt(match[2], 10),
  };
}

function cacheEpisodeMetadataRows(
  cacheEntry: EpisodeMetadataCacheEntry,
  path: string,
  rows: Record<string, any>[],
): void {
  cacheEntry.scannedPaths.add(path);

  for (const row of rows) {
    const parsedRow = parseEpisodeRowSimple(row);
    cacheEntry.rowsByEpisodeId.set(parsedRow.episode_index, parsedRow);
  }
}

function isMissingMetadataFileError(error: unknown): boolean {
  return error instanceof Error && /:\s*404\b/.test(error.message);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

// Simple parser for episode row - focuses on key fields for episodes
function parseEpisodeRowSimple(row: any): any {
  if (row && typeof row === 'object') {
    if ('episode_index' in row) {
      // Convert BigInt values to numbers
      const toBigIntSafe = (value: any) => {
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'number') return value;
        return parseInt(value) || 0;
      };
      
      const episodeData: any = {
        episode_index: toBigIntSafe(row['episode_index']),
        data_chunk_index: toBigIntSafe(row['data/chunk_index']),
        data_file_index: toBigIntSafe(row['data/file_index']),
        dataset_from_index: toBigIntSafe(row['dataset_from_index']),
        dataset_to_index: toBigIntSafe(row['dataset_to_index']),
        length: toBigIntSafe(row['length']),
      };
      
      // Handle video metadata - look for video-specific keys
      const videoKeys = Object.keys(row).filter(key => key.includes('videos/') && key.includes('/chunk_index'));
      if (videoKeys.length > 0) {
        // Use the first video stream for basic info
        const firstVideoKey = videoKeys[0];
        const videoBaseName = firstVideoKey.replace('/chunk_index', '');
        
        episodeData.video_chunk_index = toBigIntSafe(row[`${videoBaseName}/chunk_index`]);
        episodeData.video_file_index = toBigIntSafe(row[`${videoBaseName}/file_index`]);
        episodeData.video_from_timestamp = row[`${videoBaseName}/from_timestamp`] || 0;
        episodeData.video_to_timestamp = row[`${videoBaseName}/to_timestamp`] || 0;
      } else {
        // Fallback video values
        episodeData.video_chunk_index = 0;
        episodeData.video_file_index = 0;
        episodeData.video_from_timestamp = 0;
        episodeData.video_to_timestamp = 30;
      }
      
      // Store the raw row data to preserve per-camera metadata
      // This allows extractVideoInfoV3WithSegmentation to access camera-specific timestamps
      Object.keys(row).forEach(key => {
        if (key.startsWith('videos/')) {
          episodeData[key] = row[key];
        }
      });
      
      return episodeData;
    }
  }

  throw new Error("Episode metadata row is missing v3.0 fields.");
}




// Safe wrapper for UI error display
export async function getEpisodeDataSafe(
  org: string,
  dataset: string,
  episodeId: number,
  signal?: AbortSignal,
): Promise<{ data?: any; error?: string }> {
  try {
    const data = await getEpisodeData(org, dataset, episodeId, signal);
    return { data };
  } catch (err: any) {
    if (isAbortError(err)) {
      throw err;
    }
    // Only expose the error message, not stack or sensitive info
    return { error: err?.message || String(err) || "Unknown error" };
  }
}
