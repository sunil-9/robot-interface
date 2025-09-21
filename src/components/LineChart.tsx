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
import { Checkbox } from "@/components/ui/checkbox";
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
  availableJoints?: string[];
}

export const LineChart = ({ title, type, availableJoints = [] }: LineChartProps) => {
  const [allJointData, setAllJointData] = useState<Record<number, number[]>>({});
  const [labels, setLabels] = useState<string[]>([]);
  const [visibleJoints, setVisibleJoints] = useState<Record<number, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastUpdateTime = useRef<number>(0);
  
  // Keep 15 minutes of data in 30 points (30 seconds per point)
  const MAX_DATA_POINTS = 30;
  const UPDATE_THROTTLE_MS = 30000; // Update UI every 30 seconds

  // WebSocket connection to ROS2 bridge
  const { isConnected, lastMessage, error } = useWebSocket({
    url: 'ws://localhost:8080', // Default WebSocket port from your bridge
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  // Initialize visible joints when availableJoints changes
  useEffect(() => {
    if (availableJoints.length > 0) {
      const initialVisibility: Record<number, boolean> = {};
      availableJoints.forEach((_, index) => {
        initialVisibility[index] = true; // Show all joints by default
      });
      setVisibleJoints(initialVisibility);
      
      // Initialize data arrays
      const initialData: Record<number, number[]> = {};
      availableJoints.forEach((_, index) => {
        initialData[index] = [];
      });
      setAllJointData(initialData);
    }
  }, [availableJoints]);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    // Handle replay messages (initial buffered data)
    if (lastMessage.replay) {
      const relevantMessages = lastMessage.replay.filter(msg => msg.role === type);
      if (relevantMessages.length > 0 && availableJoints.length > 0) {
        const newAllData: Record<number, number[]> = {};
        const newLabels: string[] = [];
        
        // Initialize arrays for each joint
        availableJoints.forEach((_, index) => {
          newAllData[index] = [];
        });
        
        relevantMessages.slice(-MAX_DATA_POINTS).forEach(msg => {
          const allValues = extractAllJointValues(msg);
          if (allValues && Object.keys(allValues).length > 0) {
            newLabels.push(new Date(msg.received_at).toLocaleTimeString());
            availableJoints.forEach((_, index) => {
              newAllData[index].push(allValues[index] || 0);
            });
          }
        });
        
        setAllJointData(newAllData);
        setLabels(newLabels);
      }
      return;
    }

    // Handle real-time messages with throttling
    if (lastMessage.role === type && availableJoints.length > 0) {
      const now = Date.now();
      
      // Throttle UI updates to prevent performance issues
      if (now - lastUpdateTime.current < UPDATE_THROTTLE_MS) {
        return;
      }
      
      const allValues = extractAllJointValues(lastMessage);
      if (allValues && Object.keys(allValues).length > 0) {
        const newTime = new Date(lastMessage.received_at).toLocaleTimeString();
        
        setAllJointData(prev => {
          const updated: Record<number, number[]> = {};
          availableJoints.forEach((_, index) => {
            const prevData = prev[index] || [];
            updated[index] = [...prevData.slice(-(MAX_DATA_POINTS - 1)), allValues[index] || 0];
          });
          return updated;
        });
        
        setLabels(prev => [...prev.slice(-(MAX_DATA_POINTS - 1)), newTime]);
        lastUpdateTime.current = now;
      }
    }
  }, [lastMessage, type, availableJoints]);

  // Extract all joint values from WebSocket message
  const extractAllJointValues = (message: any): Record<number, number> | null => {
    const normalized = message.normalized;
    if (!normalized) return null;

    const values: Record<number, number> = {};

    // For JointState messages, handle both array and object formats
    if (normalized.positions) {
      if (Array.isArray(normalized.positions)) {
        normalized.positions.forEach((value: number, index: number) => {
          values[index] = value;
        });
      } else if (typeof normalized.positions === 'object') {
        Object.keys(normalized.positions).forEach(key => {
          const index = parseInt(key);
          if (!isNaN(index) && normalized.positions[key] !== null) {
            values[index] = normalized.positions[key];
          }
        });
      }
    }

    // For Float64MultiArray messages
    if (normalized.data && Array.isArray(normalized.data)) {
      normalized.data.forEach((value: number, index: number) => {
        values[index] = value;
      });
    }

    // For JointTrajectory messages
    if (normalized.last_point_positions && Array.isArray(normalized.last_point_positions)) {
      normalized.last_point_positions.forEach((value: number, index: number) => {
        values[index] = value;
      });
    }

    return Object.keys(values).length > 0 ? values : null;
  };

  // Generate colors for each joint
  const generateColor = (index: number, total: number) => {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const chartData = {
    labels,
    datasets: availableJoints.map((jointName, index) => ({
      label: jointName,
      data: allJointData[index] || [],
      borderColor: generateColor(index, availableJoints.length),
      backgroundColor: `${generateColor(index, availableJoints.length).replace(')', ', 0.1)')}`,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      hidden: !visibleJoints[index], // Control visibility
    })),
  };

  const getOptions = (isModal = false): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 10,
          font: {
            size: 11,
          },
          color: 'hsl(210, 20%, 95%)',
        },
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
        
        {/* Joint visibility controls */}
        {availableJoints.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {availableJoints.map((jointName, index) => (
              <div key={index} className="flex items-center space-x-1">
                <Checkbox
                  id={`joint-${index}`}
                  checked={visibleJoints[index] || false}
                  onCheckedChange={(checked) => {
                    setVisibleJoints(prev => ({
                      ...prev,
                      [index]: !!checked
                    }));
                  }}
                  className="h-3 w-3"
                />
                <label 
                  htmlFor={`joint-${index}`} 
                  className="text-xs cursor-pointer"
                  style={{ color: generateColor(index, availableJoints.length) }}
                >
                  {jointName}
                </label>
              </div>
            ))}
          </div>
        )}
        
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