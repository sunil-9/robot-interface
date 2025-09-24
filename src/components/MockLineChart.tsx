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
import { Maximize2, Minimize2 } from "lucide-react";
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

interface MockLineChartProps {
  title: string;
  type: "state" | "command";
}

export const MockLineChart = ({ title, type }: MockLineChartProps) => {
  const [jointData, setJointData] = useState<Record<string, number[]>>({});
  const [labels, setLabels] = useState<string[]>([]);
  const [visibleJoints, setVisibleJoints] = useState<Record<string, boolean>>({});
  const [dataType, setDataType] = useState<"positions" | "velocities" | "efforts">("positions");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const MAX_DATA_POINTS = 30;

  // Mock joint names based on the provided data
  const jointNames = type === "state" 
    ? [
        "front_left_wheel",
        "front_right_wheel", 
        "kinova_arm_joint_1",
        "rear_left_wheel",
        "rear_right_wheel",
        "kinova_arm_joint_2",
        "kinova_arm_joint_3",
        "kinova_arm_joint_4",
        "kinova_arm_joint_5",
        "kinova_arm_joint_6",
        "finger_joint",
        "left_inner_knuckle_joint",
        "right_inner_knuckle_joint",
        "right_outer_knuckle_joint",
        "left_inner_finger_joint",
        "right_inner_finger_joint"
      ]
    : [
        "kinova_arm_joint_1",
        "kinova_arm_joint_3", 
        "kinova_arm_joint_5",
        "kinova_arm_joint_2",
        "kinova_arm_joint_4",
        "kinova_arm_joint_6",
        "finger_joint",
        "base_linear_forward",
        "base_linear_backward",
        "base_angular_left",
        "base_angular_right"
      ];

  // Initialize visibility
  useEffect(() => {
    const initialVisibility: Record<string, boolean> = {};
    jointNames.forEach((name) => {
      initialVisibility[name] = true;
    });
    setVisibleJoints(initialVisibility);
  }, []);

  // Generate smooth mock data
  useEffect(() => {
    const generateSmoothData = () => {
      const newData: Record<string, number[]> = {};
      const newLabels: string[] = [];

      for (let i = 0; i < MAX_DATA_POINTS; i++) {
        const time = (i * 30); // 30 seconds intervals for 15 minutes total
        const timestamp = new Date(Date.now() - (MAX_DATA_POINTS - i - 1) * 30000);
        newLabels.push(timestamp.toLocaleTimeString());

        jointNames.forEach((jointName, jointIndex) => {
          if (!newData[jointName]) {
            newData[jointName] = [];
          }

          let value = 0;
          
          if (type === "state") {
            // State data patterns
            if (dataType === "positions") {
              if (jointName.includes("wheel")) {
                value = Math.sin((time / 100) + jointIndex) * 0.5;
              } else if (jointName.includes("kinova_arm")) {
                value = Math.sin((time / 200) + jointIndex) * 1.5 + Math.cos((time / 150) + jointIndex) * 0.5;
              } else if (jointName.includes("finger") || jointName.includes("knuckle")) {
                value = Math.sin((time / 300) + jointIndex) * 0.1;
              }
            } else if (dataType === "velocities") {
              if (jointName.includes("wheel")) {
                value = Math.cos((time / 80) + jointIndex) * 0.05;
              } else if (jointName.includes("kinova_arm")) {
                value = Math.sin((time / 180) + jointIndex) * 0.1;
              } else {
                value = Math.sin((time / 250) + jointIndex) * 0.02;
              }
            } else if (dataType === "efforts") {
              if (jointName.includes("kinova_arm")) {
                value = Math.sin((time / 160) + jointIndex) * 3 + Math.cos((time / 120) + jointIndex) * 1;
              } else if (jointName.includes("wheel")) {
                value = Math.sin((time / 90) + jointIndex) * 0.02;
              } else {
                value = Math.sin((time / 200) + jointIndex) * 0.01;
              }
            }
          } else {
            // Command data patterns
            if (dataType === "positions") {
              if (jointName.includes("kinova_arm")) {
                value = Math.sin((time / 180) + jointIndex) * 1.2 + Math.cos((time / 120) + jointIndex) * 0.8;
              } else if (jointName === "finger_joint") {
                value = Math.sin((time / 250) + jointIndex) * 0.1;
              } else if (jointName.includes("base_")) {
                value = 0; // Base commands are typically 0
              }
            } else if (dataType === "velocities") {
              // Command velocities are all 0
              value = 0;
            } else if (dataType === "efforts") {
              if (jointName.includes("kinova_arm")) {
                // NaN values for arm joints in commands - we'll show as 0 for visualization
                value = 0;
              } else {
                value = 0;
              }
            }
          }

          newData[jointName].push(value);
        });
      }

      setJointData(newData);
      setLabels(newLabels);
    };

    generateSmoothData();
    
    // Update data every 5 seconds for command type
    let interval: NodeJS.Timeout | null = null;
    if (type === "command") {
      interval = setInterval(generateSmoothData, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [dataType, type, jointNames]);

  // Memoize color generation
  const jointColors = useMemo(() => {
    const colors: Record<string, string> = {};
    jointNames.forEach((jointName, index) => {
      const hue = (index * 360) / jointNames.length;
      colors[jointName] = `hsl(${hue}, 70%, 60%)`;
    });
    return colors;
  }, []);

  // Memoize chart data
  const chartData = useMemo(() => {
    const datasets = jointNames
      .filter((jointName) => jointData[jointName]?.length > 0)
      .map((jointName) => ({
        label: jointName,
        data: jointData[jointName] || [],
        borderColor: jointColors[jointName],
        backgroundColor: `${jointColors[jointName].replace(")", ", 0.1)")}`,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.4,
        hidden: !visibleJoints[jointName],
        spanGaps: true,
      }));

    return {
      labels,
      datasets,
    };
  }, [labels, jointData, visibleJoints, jointColors]);

  const getOptions = (isModal = false): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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

  const chartOptions = getOptions(false);
  const modalChartOptions = getOptions(true);

  const ChartContent = React.memo(({ isModal = false }: { isModal?: boolean }) => (
    <div className={`bg-gray-900 rounded-lg p-2 relative group ${isModal ? "h-full" : "h-64"}`}>
      <Line data={chartData} options={isModal ? modalChartOptions : chartOptions} />
      
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
  ));

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
            <div className="flex items-center gap-1 text-xs text-green-400">
              Mock Data
            </div>
          </div>
        </div>

        {/* Joint visibility controls */}
        <div className="mb-3 max-h-32 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
            {jointNames.map((jointName) => (
              <div key={jointName} className="flex items-center space-x-1">
                <Checkbox
                  id={`mock-joint-${jointName}`}
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
                  htmlFor={`mock-joint-${jointName}`}
                  className="text-xs cursor-pointer truncate"
                  style={{ color: jointColors[jointName] }}
                  title={jointName}
                >
                  {jointName}
                </label>
              </div>
            ))}
          </div>
        </div>

        <ChartContent />
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-6">
          <div className="h-[70vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">{title} - Fullscreen</h3>
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