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
  const { isConnected, lastMessage, error } = useWebSocket({
    url: "ws://localhost:8080",
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onMessage: (message) => {
      // Handle message processing in the useEffect below
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

    // Draw scale lines and labels
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= 5; i++) {
      const scaleValue = (maxValue / 5) * i;
      const y = padding + chartHeight - (scaleValue / maxValue) * chartHeight;

      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();

      // Scale labels
      ctx.fillStyle = "#9ca3af";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(scaleValue.toFixed(3), padding - 10, y + 3);
    }

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
    ctx.fillStyle = "#f3f4f6";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Action Variance Windows", width / 2, 25);
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
        {error && (
          <div className="text-sm text-red-500">WebSocket Error: {error}</div>
        )}
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
      </CardContent>
    </Card>
  );
};
