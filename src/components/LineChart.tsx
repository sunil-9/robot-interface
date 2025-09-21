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
}

export const LineChart = ({ title, type }: LineChartProps) => {
  const [data, setData] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        
        relevantMessages.slice(-50).forEach(msg => {
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

    // Handle real-time messages
    if (lastMessage.role === type) {
      const value = extractDataValue(lastMessage);
      if (value !== null) {
        const newTime = new Date(lastMessage.received_at).toLocaleTimeString();
        
        setData(prev => [...prev.slice(-49), value]);
        setLabels(prev => [...prev.slice(-49), newTime]);
      }
    }
  }, [lastMessage, type]);

  // Extract numeric value from WebSocket message
  const extractDataValue = (message: any): number | null => {
    const normalized = message.normalized;
    if (!normalized) return null;

    // For JointState messages, use first joint position
    if (normalized.positions && normalized.positions.length > 0) {
      return normalized.positions[0];
    }

    // For Float64MultiArray messages, use first data element
    if (normalized.data && normalized.data.length > 0) {
      return normalized.data[0];
    }

    // For JointTrajectory messages, use first position of last point
    if (normalized.last_point_positions && normalized.last_point_positions.length > 0) {
      return normalized.last_point_positions[0];
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
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
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