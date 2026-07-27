/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTime } from "../context/time-context";

type DataGraphProps = {
  data: Array<Array<Record<string, number>>>;
  onChartsReady?: () => void;
};

type SeriesMetadata = {
  groups: Record<string, string[]>;
  singles: string[];
  groupColorMap: Record<string, string>;
};

const SERIES_NAME_DELIMITER = " | ";
const MAX_RENDERED_POINTS_PER_CHART = 900;

function flattenRow(
  row: Record<string, any>,
  prefix = "",
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "number") {
      result[prefix ? `${prefix}${SERIES_NAME_DELIMITER}${key}` : key] = value;
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenRow(
          value,
          prefix ? `${prefix}${SERIES_NAME_DELIMITER}${key}` : key,
        ),
      );
    }
  }

  if ("timestamp" in row) {
    result.timestamp = row.timestamp;
  }

  return result;
}

function buildSeriesMetadata(dataKeys: string[]): SeriesMetadata {
  const groups: Record<string, string[]> = {};
  const singles: string[] = [];

  dataKeys.forEach((key) => {
    const parts = key.split(SERIES_NAME_DELIMITER);
    if (parts.length > 1) {
      const group = parts[0];
      if (!groups[group]) groups[group] = [];
      groups[group].push(key);
    } else {
      singles.push(key);
    }
  });

  const allGroups = [...Object.keys(groups), ...singles];
  const groupColorMap: Record<string, string> = {};
  allGroups.forEach((group, idx) => {
    groupColorMap[group] = `hsl(${idx * (360 / Math.max(allGroups.length, 1))}, 100%, 50%)`;
  });

  return { groups, singles, groupColorMap };
}

function findClosestDataIndex(
  chartData: Array<Record<string, number>>,
  time: number,
): number {
  if (!chartData.length) return 0;

  let low = 0;
  let high = chartData.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((chartData[mid].timestamp ?? 0) < time) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

function downsampleChartData(
  chartData: Array<Record<string, number>>,
): Array<Record<string, number>> {
  if (chartData.length <= MAX_RENDERED_POINTS_PER_CHART) {
    return chartData;
  }

  const lastIndex = chartData.length - 1;
  const stride = lastIndex / (MAX_RENDERED_POINTS_PER_CHART - 1);
  const result: Array<Record<string, number>> = [];
  let previousIndex = -1;

  for (let i = 0; i < MAX_RENDERED_POINTS_PER_CHART; i += 1) {
    const sourceIndex = Math.min(lastIndex, Math.round(i * stride));
    if (sourceIndex !== previousIndex) {
      result.push(chartData[sourceIndex]);
      previousIndex = sourceIndex;
    }
  }

  if (result.at(-1) !== chartData.at(-1)) {
    result.push(chartData[lastIndex]);
  }

  return result;
}

const StaticLineChart = React.memo(
  ({
    chartData,
    dataKeys,
    visibleKeys,
    groups,
    groupColorMap,
    onClick,
    onMouseMove,
    onMouseLeave,
  }: {
    chartData: Array<Record<string, number>>;
    dataKeys: string[];
    visibleKeys: string[];
    groups: Record<string, string[]>;
    groupColorMap: Record<string, string>;
    onClick: (data: any) => void;
    onMouseMove: (state: any) => void;
    onMouseLeave: () => void;
  }) => {
    const ticks = useMemo(
      () =>
        Array.from(
          new Set(chartData.map((point) => Math.ceil(point.timestamp))),
        ),
      [chartData],
    );
    const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys]);

    return (
      <div className="w-full h-80" onMouseLeave={onMouseLeave}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            syncId="episode-sync"
            margin={{ top: 24, right: 16, left: 0, bottom: 16 }}
            onClick={onClick}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="timestamp"
              label={{
                value: "time",
                position: "insideBottomLeft",
                fill: "#cbd5e1",
              }}
              domain={[
                chartData.at(0)?.timestamp ?? 0,
                chartData.at(-1)?.timestamp ?? 0,
              ]}
              ticks={ticks}
              stroke="#cbd5e1"
              minTickGap={20}
              allowDataOverflow={true}
            />
            <YAxis
              domain={["auto", "auto"]}
              stroke="#cbd5e1"
              interval={0}
              allowDataOverflow={true}
            />
            <Tooltip
              content={() => null}
              active={true}
              isAnimationActive={false}
            />

            {dataKeys.map((key) => {
              if (!visibleKeySet.has(key)) return null;

              const group = key.includes(SERIES_NAME_DELIMITER)
                ? key.split(SERIES_NAME_DELIMITER)[0]
                : key;
              const color = groupColorMap[group];
              let strokeDasharray: string | undefined;
              if (groups[group] && groups[group].length > 1) {
                const idxInGroup = groups[group].indexOf(key);
                if (idxInGroup > 0) strokeDasharray = "5 5";
              }

              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={color}
                  strokeDasharray={strokeDasharray}
                  dot={false}
                  activeDot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  },
);

const DynamicLegend = React.memo(
  ({
    chartData,
    dataKeys,
    visibleKeys,
    setVisibleKeys,
    hoveredTime,
    groups,
    singles,
    groupColorMap,
  }: {
    chartData: Array<Record<string, number>>;
    dataKeys: string[];
    visibleKeys: string[];
    setVisibleKeys: React.Dispatch<React.SetStateAction<string[]>>;
    hoveredTime: number | null;
    groups: Record<string, string[]>;
    singles: string[];
    groupColorMap: Record<string, string>;
  }) => {
    const { currentTime } = useTime();
    const closestIndex = findClosestDataIndex(
      chartData,
      hoveredTime != null ? hoveredTime : currentTime,
    );
    const currentData = chartData[closestIndex] || {};

    const isGroupChecked = (group: string) =>
      groups[group].every((key) => visibleKeys.includes(key));
    const isGroupIndeterminate = (group: string) =>
      groups[group].some((key) => visibleKeys.includes(key)) &&
      !isGroupChecked(group);

    const handleGroupCheckboxChange = (group: string) => {
      if (isGroupChecked(group)) {
        setVisibleKeys((prev) =>
          prev.filter((key) => !groups[group].includes(key)),
        );
      } else {
        setVisibleKeys((prev) =>
          Array.from(new Set([...prev, ...groups[group]])),
        );
      }
    };

    const handleCheckboxChange = (key: string) => {
      setVisibleKeys((prev) =>
        prev.includes(key)
          ? prev.filter((visibleKey) => visibleKey !== key)
          : [...prev, key],
      );
    };

    return (
      <div className="grid grid-cols-[repeat(auto-fit,250px)] gap-4 mx-8">
        {Object.entries(groups).map(([group, children]) => {
          const color = groupColorMap[group];
          return (
            <div key={group} className="mb-2">
              <label className="flex gap-2 cursor-pointer select-none font-semibold">
                <input
                  type="checkbox"
                  checked={isGroupChecked(group)}
                  ref={(el) => {
                    if (el) el.indeterminate = isGroupIndeterminate(group);
                  }}
                  onChange={() => handleGroupCheckboxChange(group)}
                  className="size-3.5 mt-1"
                  style={{ accentColor: color }}
                />
                <span className="text-sm w-40 text-white">{group}</span>
              </label>
              <div className="pl-7 flex flex-col gap-1 mt-1">
                {children.map((key) => (
                  <label
                    key={key}
                    className="flex gap-2 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={visibleKeys.includes(key)}
                      onChange={() => handleCheckboxChange(key)}
                      className="size-3.5 mt-1"
                      style={{ accentColor: color }}
                    />
                    <span
                      className={`text-xs break-all w-36 ${visibleKeys.includes(key) ? "text-white" : "text-gray-400"}`}
                    >
                      {key.slice(group.length + 1)}
                    </span>
                    <span
                      className={`text-xs font-mono ml-auto ${visibleKeys.includes(key) ? "text-orange-300" : "text-gray-500"}`}
                    >
                      {typeof currentData[key] === "number"
                        ? currentData[key].toFixed(2)
                        : "--"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {singles.map((key) => {
          const color = groupColorMap[key];
          return (
            <label key={key} className="flex gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleKeys.includes(key)}
                onChange={() => handleCheckboxChange(key)}
                className="size-3.5 mt-1"
                style={{ accentColor: color }}
              />
              <span
                className={`text-sm break-all w-40 ${visibleKeys.includes(key) ? "text-white" : "text-gray-400"}`}
              >
                {key}
              </span>
              <span
                className={`text-sm font-mono ml-auto ${visibleKeys.includes(key) ? "text-orange-300" : "text-gray-500"}`}
              >
                {typeof currentData[key] === "number"
                  ? currentData[key].toFixed(2)
                  : "--"}
              </span>
            </label>
          );
        })}
      </div>
    );
  },
);

const SingleDataGraph = React.memo(
  ({
    data,
    hoveredTime,
    setHoveredTime,
  }: {
    data: Array<Record<string, number>>;
    hoveredTime: number | null;
    setHoveredTime: React.Dispatch<React.SetStateAction<number | null>>;
  }) => {
    const { setCurrentTime } = useTime();
    const chartData = useMemo(() => data.map((row) => flattenRow(row)), [data]);
    const renderedChartData = useMemo(
      () => downsampleChartData(chartData),
      [chartData],
    );
    const dataKeys = useMemo(
      () =>
        chartData.length > 0
          ? Object.keys(chartData[0]).filter((key) => key !== "timestamp")
          : [],
      [chartData],
    );
    const { groups, singles, groupColorMap } = useMemo(
      () => buildSeriesMetadata(dataKeys),
      [dataKeys],
    );
    const [visibleKeys, setVisibleKeys] = useState<string[]>(dataKeys);

    useEffect(() => {
      setVisibleKeys(dataKeys);
    }, [dataKeys]);

    const handleMouseLeave = useCallback(() => {
      setHoveredTime(null);
    }, [setHoveredTime]);

    const handleMouseMove = useCallback(
      (state: any) => {
        const rawTime =
          state?.activePayload?.[0]?.payload?.timestamp ??
          state?.activeLabel ??
          null;
        const nextTime =
          typeof rawTime === "number" ? Math.round(rawTime * 100) / 100 : null;
        setHoveredTime((prev) => (prev === nextTime ? prev : nextTime));
      },
      [setHoveredTime],
    );

    const handleClick = useCallback(
      (data: any) => {
        if (data && data.activePayload && data.activePayload.length) {
          const timeValue = data.activePayload[0].payload.timestamp;
          setCurrentTime(timeValue);
        }
      },
      [setCurrentTime],
    );

    return (
      <div className="w-full">
        <StaticLineChart
          chartData={renderedChartData}
          dataKeys={dataKeys}
          visibleKeys={visibleKeys}
          groups={groups}
          groupColorMap={groupColorMap}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        <DynamicLegend
          chartData={chartData}
          dataKeys={dataKeys}
          visibleKeys={visibleKeys}
          setVisibleKeys={setVisibleKeys}
          hoveredTime={hoveredTime}
          groups={groups}
          singles={singles}
          groupColorMap={groupColorMap}
        />
      </div>
    );
  },
);

export const DataRecharts = React.memo(
  ({ data, onChartsReady }: DataGraphProps) => {
    const [hoveredTime, setHoveredTime] = useState<number | null>(null);

    useEffect(() => {
      if (typeof onChartsReady === "function") {
        onChartsReady();
      }
    }, [onChartsReady]);

    if (!Array.isArray(data) || data.length === 0) return null;

    return (
      <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
        {data.map((group, idx) => (
          <SingleDataGraph
            key={idx}
            data={group}
            hoveredTime={hoveredTime}
            setHoveredTime={setHoveredTime}
          />
        ))}
      </div>
    );
  },
);

StaticLineChart.displayName = "StaticLineChart";
DynamicLegend.displayName = "DynamicLegend";
SingleDataGraph.displayName = "SingleDataGraph";
DataRecharts.displayName = "DataGraph";

export default DataRecharts;
