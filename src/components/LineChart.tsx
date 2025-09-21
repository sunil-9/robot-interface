import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Maximize2, Minimize2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebSocket } from "@/hooks/useWebSocket";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  title: string;
  type: "state" | "action";
  jointIndex?: number;
  availableJoints?: string[];
  onJointIndexChange?: (index: number) => void;
}

export const LineChart = ({ title, type, jointIndex = 0, availableJoints = [], onJointIndexChange }: LineChartProps) => {
  const [data, setData] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastUpdateTime = useRef<number>(0);
  
  // Keep 15 minutes of data (900 seconds at 1Hz)
  const MAX_DATA_POINTS = 900;
  const UPDATE_THROTTLE_MS = 1000; // Update UI every 1 second max

  // WebSocket connection to ROS2 bridge
  const { isConnected, lastMessage, error } = useWebSocket({
    url: 'ws://localhost:8080', // Default WebSocket port from your bridge
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    // Handle replay messages (initial buffered data)
    if (lastMessage.replay) {
      const relevantMessages = lastMessage.replay.filter(msg => msg.role === type);
      if (relevantMessages.length > 0) {
        const newData: number[] = [];
        const newLabels: string[] = [];
        
        relevantMessages.slice(-MAX_DATA_POINTS).forEach(msg => {
          const value = extractDataValue(msg);
          if (value !== null) {
            newData.push(value);
            newLabels.push(new Date(msg.received_at).toLocaleTimeString());
          }
        });
        
        setData(newData);
        setLabels(newLabels);
      }
      return;
    }

    // Handle real-time messages with throttling
    if (lastMessage.role === type) {
      const now = Date.now();
      
      // Throttle UI updates to prevent performance issues
      if (now - lastUpdateTime.current < UPDATE_THROTTLE_MS) {
        return;
      }
      
      const value = extractDataValue(lastMessage);
      if (value !== null) {
        const newTime = new Date(lastMessage.received_at).toLocaleTimeString();
        
        setData(prev => [...prev.slice(-(MAX_DATA_POINTS - 1)), value]);
        setLabels(prev => [...prev.slice(-(MAX_DATA_POINTS - 1)), newTime]);
        lastUpdateTime.current = now;
      }
    }
  }, [lastMessage, type]);

  // Extract numeric value from WebSocket message
  const extractDataValue = (message: any): number | null => {
    const normalized = message.normalized;
    if (!normalized) return null;

    // For JointState messages, handle both array and object formats
    if (normalized.positions) {
      const indexKey = jointIndex.toString();
      if (Array.isArray(normalized.positions) && normalized.positions.length > jointIndex) {
        return normalized.positions[jointIndex];
      } else if (typeof normalized.positions === 'object' && normalized.positions[indexKey] !== undefined) {
        return normalized.positions[indexKey];
      }
    }

    // For Float64MultiArray messages, use selected index
    if (normalized.data && normalized.data.length > jointIndex) {
      return normalized.data[jointIndex];
    }

    // For JointTrajectory messages, use selected position of last point
    if (normalized.last_point_positions && normalized.last_point_positions.length > jointIndex) {
      return normalized.last_point_positions[jointIndex];
    }

    return null;
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data,
        borderColor: type === "state" ? "hsl(195, 100%, 50%)" : "hsl(195, 100%, 40%)",
        backgroundColor: type === "state" ? "hsl(195, 100%, 50%, 0.1)" : "hsl(195, 100%, 40%, 0.1)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.4,
      },
    ],
  };

  const getOptions = (isModal = false): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'hsl(222, 15%, 10%)',
        titleColor: 'hsl(210, 20%, 95%)',
        bodyColor: 'hsl(210, 20%, 95%)',
        borderColor: 'hsl(195, 100%, 50%)',
        borderWidth: 1,
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'hsl(222, 15%, 20%)',
        },
        ticks: {
          color: 'hsl(210, 10%, 60%)',
          maxTicksLimit: isModal ? 20 : 10,
        },
      },
      y: {
        display: true,
        grid: {
          color: 'hsl(222, 15%, 20%)',
        },
        ticks: {
          color: 'hsl(210, 10%, 60%)',
        },
      },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
    },
  });

  const ChartContent = ({ isModal = false }: { isModal?: boolean }) => (
    <div className={`bg-chart-bg rounded-lg p-2 relative group ${
      isModal ? "h-full" : "h-48"
    }`}>
      <Line data={chartData} options={getOptions(isModal)} />
      
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
  );

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            {availableJoints.length > 0 && onJointIndexChange && (
              <Select value={jointIndex.toString()} onValueChange={(value) => onJointIndexChange(parseInt(value))}>
                <SelectTrigger className="w-40 h-7 text-xs">
                  <SelectValue placeholder="Select joint" />
                </SelectTrigger>
                <SelectContent>
                  {availableJoints.map((joint, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {joint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
                {error ? 'Error' : 'Connecting...'}
              </div>
            )}
          </div>
        </div>
        <ChartContent />
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-6">
          <div className="h-[70vh]">
            <h3 className="text-lg font-medium mb-4 text-foreground">{title} - Fullscreen</h3>
            <ChartContent isModal />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};