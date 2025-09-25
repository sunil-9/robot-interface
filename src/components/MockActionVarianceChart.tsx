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
import { Maximize2, Minimize2 } from "lucide-react";
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
    url: "ws://localhost:8765",
    onMessage: handleWebSocketMessage,
  });

  // Generate mock data as fallback when WebSocket is not available
  useEffect(() => {
    if (!isConnected) {
      const generateMockData = () => {
        const newData: number[] = [];
        for (let i = 0; i < 10; i++) {
          // Generate values that simulate action variance patterns
          // Higher variance for middle joints (typically arm joints)
          let baseValue = 0;
          if (i >= 2 && i <= 7) {
            // Arm joints - higher variance
            baseValue = Math.random() * 0.04 + 0.01; // 0.01 to 0.05
          } else {
            // Wheel and gripper joints - lower variance
            baseValue = Math.random() * 0.02 + 0.002; // 0.002 to 0.022
          }

          // Add some sine wave variation for more realistic animation
          const timeVariation = Math.sin(Date.now() / 1000 + i) * 0.005;
          const finalValue = Math.max(
            0,
            Math.min(0.05, baseValue + timeVariation)
          );

          newData.push(finalValue);
        }
        setData(newData);
        setUsingWebSocketData(false);
      };

      generateMockData();

      // Update mock data every 2 seconds when WebSocket is not connected
      const interval = setInterval(generateMockData, 2000);

      return () => clearInterval(interval);
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
          label: function (context) {
            return `Variance: ${context.parsed.y.toFixed(4)}`;
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

  // Generate colors based on variance level (like the equalizer image you showed)
  const generateBarColors = (values: number[]) => {
    return values.map((value) => {
      // Normalize to 0-1 range for color calculation
      const normalized = value / 0.05;

      if (normalized < 0.3) {
        // Low variance - green
        return `rgba(34, 197, 94, 0.8)`;
      } else if (normalized < 0.6) {
        // Medium variance - yellow/orange
        return `rgba(251, 191, 36, 0.8)`;
      } else {
        // High variance - red/orange
        return `rgba(239, 68, 68, 0.8)`;
      }
    });
  };

  const chartData = useMemo(
    () => ({
      labels: [
        "Joint 1",
        "Joint 2",
        "Joint 3",
        "Joint 4",
        "Joint 5",
        "Joint 6",
        "Joint 7",
        "Joint 8",
        "Joint 9",
        "Joint 10",
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
      <Bar data={chartData} options={chartOptions} />
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
                {usingWebSocketData ? "Live WebSocket Data" : "Mock Data"}
                {isConnected && (
                  <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </span>
              <span>Range: 0.000 - 0.050</span>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-6xl h-[80vh] bg-gray-900 border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
          <div className="h-full">{ChartComponent}</div>
        </DialogContent>
      </Dialog>
    </>
  );
};
