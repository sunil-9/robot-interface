import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getTopicNameByRole } from "@/utils/websocketConfig";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { HelpCircle, Maximize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

interface ActionVarianceChartProps {
  title: string;
  overlay?: boolean;
  compact?: boolean;
  showTitle?: boolean;
}

export const ActionVarianceChart = ({
  title,
  overlay = false,
  compact = false,
  showTitle = true,
}: ActionVarianceChartProps) => {
  const [data, setData] = useState<number[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [usingWebSocketData, setUsingWebSocketData] = useState(false);

  // Get action variance topic name from configuration
  const actionVarianceTopicName = getTopicNameByRole("action_variance");

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    (message: { topic: string; normalized?: { data?: number[] } }) => {
      try {
        if (
          actionVarianceTopicName &&
          message.topic === actionVarianceTopicName &&
          message.normalized?.data
        ) {
          const newData = message.normalized.data;
          // Ensure we have exactly 10 data points and they are numbers
          if (Array.isArray(newData) && newData.length === 10) {
            const validData = newData.map((val) =>
              typeof val === "number" ? Math.max(0, Math.min(0.05, val)) : 0
            );
            setData(validData);
            setUsingWebSocketData(true);
          }
        }
      } catch (error) {
        console.error("Error processing action variance data:", error);
      }
    },
    [actionVarianceTopicName]
  );

  // WebSocket connection (no need to specify URL - will use config)
  const { isConnected } = useWebSocket({
    onMessage: handleWebSocketMessage,
  });

  // Clear data when WebSocket is not connected
  useEffect(() => {
    if (!isConnected) {
      setData([]);
      setUsingWebSocketData(false);
    }
  }, [isConnected]);

  // Chart configuration
  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y", // This makes the bar chart horizontal (90 degree rotation)
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: compact && showTitle,
        text: title,
        color: "white",
        font: {
          size: compact ? 12 : 16,
          weight: "bold",
        },
        padding: {
          top: 5,
          bottom: 5,
        },
      },
      tooltip: {
        callbacks: {
          title: function (context) {
            return `Time Window: ${context[0].label}`;
          },
          label: function (context) {
            return `Action Variance: ${context.parsed.x.toFixed(4)}`; // Changed to x since axes are swapped
          },
        },
      },
      annotation: {
        annotations:
          data.length > 0
            ? {
                medianLine: {
                  type: "line",
                  xMin:
                    data.length > 0
                      ? [...data].sort((a, b) => a - b)[
                          Math.floor(data.length / 2)
                        ]
                      : 0,
                  xMax:
                    data.length > 0
                      ? [...data].sort((a, b) => a - b)[
                          Math.floor(data.length / 2)
                        ]
                      : 0,
                  borderColor: "#8b5cf6",
                  borderWidth: 2,
                  borderDash: [5, 5],
                  label: {
                    display: true,
                    content: `Median: ${
                      data.length > 0
                        ? [...data]
                            .sort((a, b) => a - b) [
                              // eslint-disable-next-line no-unexpected-multiline
                              Math.floor(data.length / 2)
                            ].toFixed(3)
                        : "0.000"
                    }`,
                    position: "end",
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    font: {
                      size: 11,
                      weight: "bold",
                    },
                  },
                },
              }
            : {},
      },
    },
    scales: {
      y: {
        // This was x axis before rotation
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          display: !compact,
        },
        ticks: {
          color: "white",
          font: {
            size: compact ? 8 : 10,
          },
          display: !compact,
        },
        display: !compact,
      },
      x: {
        // This was y axis before rotation
        beginAtZero: true,
        max: 0.05,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          display: !compact,
        },
        ticks: {
          color: "white",
          font: {
            size: compact ? 8 : 12,
          },
          stepSize: 0.025,
          callback: function (value) {
            if (compact) {
              // Simplified labels for compact mode
              if (value === 0) return "L";
              if (value === 0.025) return "M";
              if (value === 0.05) return "H";
              return "";
            } else {
              // Regular labels
              if (value === 0) return "Low (0.000)";
              if (value === 0.025) return "Mid (0.025)";
              if (value === 0.05) return "High (0.050)";
              return (value as number).toFixed(3);
            }
          },
          display: !compact,
        },
      },
    },
    animation: {
      duration: 1000,
    },
  };

  // Generate colors based on variance level with smooth gradient (like audio equalizer)
  const generateBarColors = (values: number[]) => {
    return values.map((value) => {
      // Normalize to 0-1 range for color calculation
      const normalized = Math.min(value / 0.05, 1.0);

      if (normalized < 0.2) {
        // Very low variance - bright green
        return `rgba(16, 185, 129, 0.85)`;
      } else if (normalized < 0.4) {
        // Low variance - green to lime
        return `rgba(101, 163, 13, 0.85)`;
      } else if (normalized < 0.6) {
        // Medium variance - yellow/amber
        return `rgba(245, 158, 11, 0.85)`;
      } else if (normalized < 0.8) {
        // High variance - orange
        return `rgba(249, 115, 22, 0.85)`;
      } else {
        // Very high variance - red
        return `rgba(239, 68, 68, 0.85)`;
      }
    });
  };

  const chartData = useMemo(
    () => ({
      // Reverse the labels to maintain logical time flow after rotation
      labels: [
        "2.0s",
        "1.8s",
        "1.6s",
        "1.4s",
        "1.2s",
        "1.0s",
        "0.8s",
        "0.6s",
        "0.4s",
        "0.2s",
      ],
      datasets: [
        {
          data: data,
          backgroundColor: generateBarColors(data),
          borderColor: generateBarColors(data).map((color) =>
            color.replace("0.8", "1")
          ),
          borderWidth: 1,
          borderRadius: 2,
          borderSkipped: false,
        },
      ],
    }),
    [data]
  );

  const ChartComponent = (
    <div className="h-full relative bg-gray-200">
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">No Data Found</div>
            <div className="text-gray-500 text-sm">
              {!isConnected
                ? "WebSocket not connected"
                : "Waiting for action variance data..."}
            </div>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="mt-4 px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-md flex items-center justify-center mx-auto"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              <span>Chart Help</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute bottom-2 right-2 z-10">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="bg-gray-800 bg-opacity-70 text-purple-300 hover:text-white p-1 rounded-full"
              aria-label="Help"
              title="Show chart explanation"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>
          <Bar data={chartData} options={chartOptions} />
        </>
      )}
    </div>
  );

  return (
    <>
      <Card
        className={`${
          overlay ? "bg-opacity-75" : "bg-gray-900"
        }  h-full rounded-lg
          p-0  fixed top-8 left-0 z-50`}
        style={{
          width: compact ? "300px" : "400px",
          height: compact ? "220px" : "320px",
        }}
      >
        <div className={` h-full flex flex-col`}>
          {showTitle && (
            <div className="flex justify-between items-center mb-1">
              <h3
                className={`${
                  compact ? "text-xs" : "text-lg"
                } font-semibold text-white`}
              >
                {title}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsHelpOpen(true)}
                  className="text-purple-400 hover:text-white transition-colors p-1 bg-gray-800 rounded-full"
                  aria-label="Show help information"
                  title="What is this chart?"
                >
                  <HelpCircle
                    className={`${compact ? "h-4 w-4" : "h-5 w-5"}`}
                  />
                </button>
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="View fullscreen"
                  title="View fullscreen"
                >
                  <Maximize2 className={`${compact ? "h-3 w-3" : "h-4 w-4"}`} />
                </button>
              </div>
            </div>
          )}
          <div className={`flex-1 min-h-0 ${compact ? "h-28" : ""}`}>
            {ChartComponent}
          </div>
          {!compact && (
            <div className="mt-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>
                  {data.length === 0
                    ? !isConnected
                      ? "WebSocket Disconnected"
                      : "No Data Available"
                    : usingWebSocketData
                    ? "Live WebSocket Data"
                    : "Data Available"}
                  {isConnected && (
                    <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                  {!isConnected && (
                    <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </span>
                <span>Range: 0.000 - 0.050</span>
                <span className="hidden sm:inline text-xs text-gray-400 ml-4">
                  • Time windows show action variance over future 2.0s horizon
                </span>
              </div>

              {/* Color Legend */}
              <div className="mt-3 flex justify-center items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-300">Low (&lt; 0.01)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span className="text-gray-300">Mid (0.01-0.03)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-300">High (&gt; 0.03)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border-2 border-purple-500 border-dashed bg-transparent rounded"></div>
                  <span className="text-purple-400">Median</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-6xl h-[80vh] bg-gray-900 border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {/* remove minimize button for now 
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Minimize2 className="h-5 w-5" />
            </button> */}
          </div>
          <div className="h-full">{ChartComponent}</div>
        </DialogContent>
      </Dialog>

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 p-6 max-w-2xl">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4">
              Action Variance Chart Help
            </h2>

            <div className="space-y-4 text-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  What is this chart?
                </h3>
                <p className="mb-2">
                  The Action Variance Chart visualizes the predicted variance in
                  actions over different time windows up to 2.0 seconds in the
                  future. Lower variance indicates more predictable and stable
                  actions, while higher variance suggests more unpredictable
                  behavior.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Color Scale
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>
                      <strong>Green (Low Variance):</strong> Values below 0.01 -
                      Highly predictable actions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-lime-500 rounded"></div>
                    <span>
                      <strong>Lime Green:</strong> Values around 0.01-0.02 -
                      Moderately predictable actions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span>
                      <strong>Yellow/Amber:</strong> Values around 0.02-0.03 -
                      Medium variability in actions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span>
                      <strong>Orange:</strong> Values around 0.03-0.04 - High
                      variability in actions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>
                      <strong>Red (High Variance):</strong> Values above 0.04 -
                      Highly unpredictable actions
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Median Line
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-purple-500 border-dashed bg-transparent"></div>
                  <p>
                    The purple dashed line represents the median value of all
                    displayed variance values. This helps identify the central
                    tendency of the data.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Time Windows
                </h3>
                <p>
                  Each bar represents a specific time window in the future (from
                  0.2s to 2.0s). The horizontal axis shows the action variance
                  value (from 0.000 to 0.050).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Data Source
                </h3>
                <p>
                  This chart displays data received in real-time via WebSocket.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
