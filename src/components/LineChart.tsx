import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Maximize2, Minimize2, Wifi, WifiOff } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface JointStatesMessage {
  topic: string;
  role: string;
  received_at: number;
  normalized: {
    names: string[];
    positions: number[];
    velocities: number[];
    efforts: number[];
  };
}

interface LineChartProps {
  title: string;
  type?: "state" | "action";
}

export const LineChart = ({ title }: LineChartProps) => {
  const [jointData, setJointData] = useState<Record<string, number[]>>({});
  const [labels, setLabels] = useState<string[]>([]);
  const [jointNames, setJointNames] = useState<string[]>([]);
  const [visibleJoints, setVisibleJoints] = useState<Record<string, boolean>>(
    {}
  );
  const [dataType, setDataType] = useState<
    "positions" | "velocities" | "efforts"
  >("positions");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const MAX_DATA_POINTS = 50;
  const UPDATE_INTERVAL = 100; // Update chart every 100ms to batch updates

  // Use refs to store data efficiently without causing re-renders
  const dataBufferRef = React.useRef<Record<string, number[]>>({});
  const labelsBufferRef = React.useRef<string[]>([]);
  const lastUpdateTime = React.useRef<number>(0);
  const pendingUpdate = React.useRef<boolean>(false);

  // WebSocket connection to ROS2 bridge
  const { isConnected, lastMessage, error } = useWebSocket({
    url: "ws://localhost:8080/ws",
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  // Efficient function to add data point to a joint
  const addDataPoint = React.useCallback(
    (jointName: string, value: number) => {
      if (!dataBufferRef.current[jointName]) {
        dataBufferRef.current[jointName] = [];
      }

      const jointArray = dataBufferRef.current[jointName];
      jointArray.push(value);

      // Remove oldest data point if we exceed max points
      if (jointArray.length > MAX_DATA_POINTS) {
        jointArray.shift(); // More efficient than slice for removing first element
      }
    },
    [MAX_DATA_POINTS]
  );

  // Efficient function to add label
  const addLabel = React.useCallback(
    (label: string) => {
      labelsBufferRef.current.push(label);

      // Remove oldest label if we exceed max points
      if (labelsBufferRef.current.length > MAX_DATA_POINTS) {
        labelsBufferRef.current.shift();
      }
    },
    [MAX_DATA_POINTS]
  );

  // Batch update function to update state efficiently
  const batchUpdateChart = React.useCallback(() => {
    if (!pendingUpdate.current) return;

    // Create shallow copies of the data for React state update
    const newJointData: Record<string, number[]> = {};
    Object.keys(dataBufferRef.current).forEach((jointName) => {
      newJointData[jointName] = [...dataBufferRef.current[jointName]];
    });

    setJointData(newJointData);
    setLabels([...labelsBufferRef.current]);
    pendingUpdate.current = false;
  }, []);

  // Handle WebSocket messages efficiently
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const message =
        typeof lastMessage === "string" ? JSON.parse(lastMessage) : lastMessage;

      // Check if this is a joint_states message
      if (
        message.topic === "/joint_states_for_collection" &&
        message.normalized
      ) {
        const { names, positions, velocities, efforts } = message.normalized;

        if (names && Array.isArray(names)) {
          // Initialize joint names and visibility on first message only
          if (!isInitialized) {
            setJointNames(names);
            const initialVisibility: Record<string, boolean> = {};
            names.forEach((name: string) => {
              initialVisibility[name] = true;
              dataBufferRef.current[name] = []; // Initialize empty arrays
            });
            setVisibleJoints(initialVisibility);
            setIsInitialized(true);
            return; // Skip processing this first message for setup
          }

          // Get current data based on selected type
          const currentData =
            dataType === "positions"
              ? positions
              : dataType === "velocities"
              ? velocities
              : efforts;

          // Add new data points efficiently
          names.forEach((name: string, index: number) => {
            const value = currentData?.[index] || 0;
            addDataPoint(name, value);
          });

          // Add timestamp label
          addLabel(new Date().toLocaleTimeString());
          pendingUpdate.current = true;

          // Batch updates to avoid too frequent re-renders
          const now = Date.now();
          if (now - lastUpdateTime.current >= UPDATE_INTERVAL) {
            lastUpdateTime.current = now;
            batchUpdateChart();
          }
        }
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  }, [
    lastMessage,
    dataType,
    isInitialized,
    addDataPoint,
    addLabel,
    batchUpdateChart,
  ]);

  // Handle data type changes - clear chart data
  useEffect(() => {
    if (!isInitialized) return;

    // When data type changes, clear existing data
    Object.keys(dataBufferRef.current).forEach((jointName) => {
      dataBufferRef.current[jointName] = [];
    });
    labelsBufferRef.current = [];
    setJointData({});
    setLabels([]);
  }, [dataType, isInitialized]);

  // Periodic update to ensure chart updates even with high-frequency data
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      if (pendingUpdate.current) {
        batchUpdateChart();
      }
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [isInitialized, batchUpdateChart, UPDATE_INTERVAL]);

  // Memoize color generation to avoid recalculation
  const jointColors = useMemo(() => {
    const colors: Record<string, string> = {};
    jointNames.forEach((jointName, index) => {
      const hue = (index * 360) / jointNames.length;
      colors[jointName] = `hsl(${hue}, 70%, 60%)`;
    });
    return colors;
  }, [jointNames]);

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    // Only create datasets for joints that have data
    const datasets = jointNames
      .filter((jointName) => jointData[jointName]?.length > 0)
      .map((jointName, index) => ({
        label: jointName,
        data: jointData[jointName] || [],
        borderColor: jointColors[jointName],
        backgroundColor: `${jointColors[jointName].replace(")", ", 0.1)")}`,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.4,
        hidden: !visibleJoints[jointName],
        // Performance optimizations
        spanGaps: true,
      }));

    return {
      labels,
      datasets,
    };
  }, [labels, jointData, jointNames, visibleJoints, jointColors]);

  const getOptions = (isModal = false): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll use custom checkboxes instead
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "hsl(222, 15%, 10%)",
        titleColor: "hsl(210, 20%, 95%)",
        bodyColor: "hsl(210, 20%, 95%)",
        borderColor: "hsl(195, 100%, 50%)",
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || "";
            const value = context.parsed.y.toFixed(4);
            return `${label}: ${value}`;
          },
        },
      },
    },
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: "hsl(222, 15%, 20%)",
        },
        ticks: {
          color: "hsl(210, 10%, 60%)",
          maxTicksLimit: isModal ? 20 : 8,
        },
      },
      y: {
        display: true,
        grid: {
          color: "hsl(222, 15%, 20%)",
        },
        ticks: {
          color: "hsl(210, 10%, 60%)",
        },
        title: {
          display: true,
          text: dataType.charAt(0).toUpperCase() + dataType.slice(1),
          color: "hsl(210, 10%, 60%)",
        },
      },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
    },
  });

  // Chart options
  const chartOptions = getOptions(false);
  const modalChartOptions = getOptions(true);

  // Memoize chart component to prevent unnecessary re-renders
  const ChartContent = React.memo(
    ({ isModal = false }: { isModal?: boolean }) => (
      <div
        className={`bg-gray-900 rounded-lg p-2 relative group ${
          isModal ? "h-full" : "h-64"
        }`}
      >
        <Line
          data={chartData}
          options={isModal ? modalChartOptions : chartOptions}
        />

        {/* Fullscreen button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isModal ? (
            <Minimize2 className="h-4 w-4 text-white" />
          ) : (
            <Maximize2 className="h-4 w-4 text-white" />
          )}
        </Button>
      </div>
    )
  );

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            <Select
              value={dataType}
              onValueChange={(value: typeof dataType) => setDataType(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positions">Positions</SelectItem>
                <SelectItem value="velocities">Velocities</SelectItem>
                <SelectItem value="efforts">Efforts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <Wifi className="h-3 w-3" />
                Live
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <WifiOff className="h-3 w-3" />
                {error ? "Error" : "Connecting..."}
              </div>
            )}
          </div>
        </div>

        {/* Joint visibility controls */}
        {jointNames.length > 0 && (
          <div className="mb-3 max-h-32 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {jointNames.map((jointName, index) => (
                <div key={jointName} className="flex items-center space-x-1">
                  <Checkbox
                    id={`joint-${jointName}`}
                    checked={visibleJoints[jointName] || false}
                    onCheckedChange={(checked) => {
                      setVisibleJoints((prev) => ({
                        ...prev,
                        [jointName]: !!checked,
                      }));
                    }}
                    className="h-3 w-3"
                  />
                  <label
                    htmlFor={`joint-${jointName}`}
                    className="text-xs cursor-pointer truncate"
                    style={{
                      color: jointColors[jointName],
                    }}
                    title={jointName}
                  >
                    {jointName}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <ChartContent />
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-6">
          <div className="h-[70vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">
                {title} - Fullscreen
              </h3>
              <Select
                value={dataType}
                onValueChange={(value: typeof dataType) => setDataType(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positions">Positions</SelectItem>
                  <SelectItem value="velocities">Velocities</SelectItem>
                  <SelectItem value="efforts">Efforts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ChartContent isModal />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
