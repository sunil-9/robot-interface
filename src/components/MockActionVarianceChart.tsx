import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWebSocket } from "@/hooks/useWebSocket";
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
import { Maximize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MockActionVarianceChartProps {
  title: string;
}

export const MockActionVarianceChart = ({
  title,
}: MockActionVarianceChartProps) => {
  const [data, setData] = useState<number[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [usingWebSocketData, setUsingWebSocketData] = useState(false);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    (message: { topic: string; normalized?: { data?: number[] } }) => {
      try {
        if (
          message.topic === "/action_variance_windows" &&
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
    []
  );

  // WebSocket connection
  const { isConnected } = useWebSocket({
    url: "ws://localhost:8080/ws",
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
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        color: "white",
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        callbacks: {
          title: function (context) {
            return `Time Window: ${context[0].label}`;
          },
          label: function (context) {
            return `Action Variance: ${context.parsed.y.toFixed(4)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "white",
          font: {
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        max: 0.05,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "white",
          font: {
            size: 10,
          },
          callback: function (value) {
            return (value as number).toFixed(3);
          },
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
      labels: [
        "0.2s",
        "0.4s",
        "0.6s",
        "0.8s",
        "1.0s",
        "1.2s",
        "1.4s",
        "1.6s",
        "1.8s",
        "2.0s",
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
    <div className="h-full">
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">No Data Found</div>
            <div className="text-gray-500 text-sm">
              {!isConnected
                ? "WebSocket not connected"
                : "Waiting for action variance data..."}
            </div>
          </div>
        </div>
      ) : (
        <Bar data={chartData} options={chartOptions} />
      )}
    </div>
  );

  return (
    <>
      <Card className="bg-gray-900 border-gray-700 h-full">
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={() => setIsFullscreen(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">{ChartComponent}</div>
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
          </div>
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
    </>
  );
};
