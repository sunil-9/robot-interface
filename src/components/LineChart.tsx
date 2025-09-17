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
import { Card } from "@/components/ui/card";

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

  // Mock data generation
  useEffect(() => {
    const interval = setInterval(() => {
      const newValue = type === "state" 
        ? Math.sin(Date.now() / 1000) * 50 + Math.random() * 10
        : Math.cos(Date.now() / 800) * 30 + Math.random() * 15;
      
      const newTime = new Date().toLocaleTimeString();
      
      setData(prev => [...prev.slice(-49), newValue]);
      setLabels(prev => [...prev.slice(-49), newTime]);
    }, 100);

    return () => clearInterval(interval);
  }, [type]);

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

  const options: ChartOptions<'line'> = {
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
          maxTicksLimit: 10,
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
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-3 text-foreground">{title}</h3>
      <div className="h-48 bg-chart-bg rounded-lg p-2">
        <Line data={chartData} options={options} />
      </div>
    </Card>
  );
};