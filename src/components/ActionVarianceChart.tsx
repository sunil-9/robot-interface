import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Wifi, WifiOff } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface ActionVarianceMessage {
  topic: string;
  role: string;
  received_at: number;
  normalized: {
    data: number[];
  };
}

interface ActionVarianceChartProps {
  title: string;
}

export const ActionVarianceChart: React.FC<ActionVarianceChartProps> = ({
  title,
}) => {
  const [varianceData, setVarianceData] = useState<number[]>(Array(10).fill(0));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // WebSocket connection to ROS2 bridge
  const { isConnected, lastMessage } = useWebSocket({
    url: "ws://localhost:8080/ws",
    onMessage: (message: ActionVarianceMessage) => {
      if (
        message.topic === "/action_variance_windows" &&
        message.normalized?.data
      ) {
        const newData = message.normalized.data.map((value: number) =>
          Math.max(0, Math.min(0.05, value))
        );
        setVarianceData(newData);
      }
    },
  });

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage) as ActionVarianceMessage;

        // Check if this is an action variance message
        if (
          message.topic === "/action_variance_windows" &&
          message.role === "action_variance"
        ) {
          if (
            message.normalized?.data &&
            Array.isArray(message.normalized.data)
          ) {
            // Ensure we have exactly 10 data points
            const newData = message.normalized.data.slice(0, 10);
            while (newData.length < 10) {
              newData.push(0);
            }
            setVarianceData(newData);
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    }
  }, [lastMessage]);

  // Draw the bar chart
  const drawChart = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    // Chart dimensions
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    const barWidth = chartWidth / 10;
    const maxValue = Math.max(0.05, Math.max(...varianceData)); // Ensure minimum scale of 0.05

    // Draw bars
    varianceData.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * barWidth + barWidth * 0.1;
      const y = padding + chartHeight - barHeight;
      const actualBarWidth = barWidth * 0.8;

      // Create gradient for each bar based on value
      const gradient = ctx.createLinearGradient(0, y + barHeight, 0, y);

      // Color based on value intensity
      if (value < 0.01) {
        // Low values - green gradient
        gradient.addColorStop(0, "#22c55e");
        gradient.addColorStop(1, "#16a34a");
      } else if (value < 0.03) {
        // Medium values - yellow/orange gradient
        gradient.addColorStop(0, "#eab308");
        gradient.addColorStop(1, "#f59e0b");
      } else {
        // High values - red/orange gradient
        gradient.addColorStop(0, "#ef4444");
        gradient.addColorStop(1, "#dc2626");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, actualBarWidth, barHeight);

      // Add subtle border
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, actualBarWidth, barHeight);

      // Draw bar index labels
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        (index + 1).toString(),
        x + actualBarWidth / 2,
        padding + chartHeight + 20
      );

      // Draw value labels on bars if they're tall enough
      if (barHeight > 20) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        const valueText = value.toFixed(3);
        ctx.fillText(valueText, x + actualBarWidth / 2, y + barHeight / 2 + 3);
      }
    });

    // Draw scale lines and labels with user-friendly labels
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Calculate median value
    const sortedData = [...varianceData].sort((a, b) => a - b);
    const median =
      sortedData.length % 2 === 0
        ? (sortedData[sortedData.length / 2 - 1] +
            sortedData[sortedData.length / 2]) /
          2
        : sortedData[Math.floor(sortedData.length / 2)];

    const medianY = padding + chartHeight - (median / maxValue) * chartHeight;

    // Draw Y-axis labels (Low, Mid, High)
    const labelPositions = [
      { label: "High", y: padding + 10, value: maxValue },
      { label: "Mid", y: padding + chartHeight / 2, value: maxValue / 2 },
      { label: "Low", y: padding + chartHeight - 10, value: 0 },
    ];

    labelPositions.forEach(({ label, y, value }) => {
      const lineY = padding + chartHeight - (value / maxValue) * chartHeight;

      // Draw grid line
      ctx.beginPath();
      ctx.moveTo(padding, lineY);
      ctx.lineTo(padding + chartWidth, lineY);
      ctx.stroke();

      // Draw label
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px monospace";
      ctx.textAlign = "right";
      ctx.fillText(label, padding - 15, lineY + 4);

      // Draw numeric value
      ctx.fillStyle = "#6b7280";
      ctx.font = "10px monospace";
      ctx.fillText(value.toFixed(3), padding - 15, lineY + 16);
    });

    // Draw median line
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, medianY);
    ctx.lineTo(padding + chartWidth, medianY);
    ctx.stroke();

    // Median label
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      `Median: ${median.toFixed(3)}`,
      padding + chartWidth - 120,
      medianY - 5
    );

    ctx.setLineDash([]);

    // Draw axes
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Chart title
    // ctx.fillStyle = "#f3f4f6";
    // ctx.font = "bold 14px monospace";
    // ctx.textAlign = "center";
    // ctx.fillText("Action Variance Windows", width / 2, 25);
  }, [varianceData]);

  // Animation loop for smooth updates
  useEffect(() => {
    const animate = () => {
      drawChart();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawChart]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      drawChart();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawChart]);

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-1 text-green-500">
                <Wifi className="w-4 h-4" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="w-full h-80 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full border border-gray-700 rounded bg-gray-900"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div className="mt-2 text-xs text-gray-400 text-center">
          Real-time action variance data (10 joints) • Range: 0.000-
          {Math.max(0.05, Math.max(...varianceData)).toFixed(3)}
        </div>

        {/* Color Legend */}
        <div className="mt-3 flex justify-center items-center gap-6 text-xs">
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
      </CardContent>
    </Card>
  );
};
