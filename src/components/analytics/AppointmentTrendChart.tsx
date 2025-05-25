import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { AppointmentTrend } from "@/types/analytics";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { DateTime } from "luxon";

interface AppointmentTrendChartProps {
  trend: AppointmentTrend;
  height?: number;
}

/**
 * Appointment Trend Chart Component
 * Displays appointment trends over time
 */
export const AppointmentTrendChart: React.FC<AppointmentTrendChartProps> = ({
  trend,
  height = 300
}) => {
  // Prepare data for the chart
  const chartData = trend.data.map(item => {
    // Format date based on period
    let formattedDate = item.date;
    
    if (trend.period === 'daily') {
      formattedDate = DateTime.fromISO(item.date).toFormat('MMM d');
    } else if (trend.period === 'weekly') {
      formattedDate = `Week ${DateTime.fromISO(item.date).toFormat('W')}`;
    } else if (trend.period === 'monthly') {
      formattedDate = DateTime.fromISO(item.date).toFormat('MMM yyyy');
    } else if (trend.period === 'quarterly') {
      formattedDate = `Q${DateTime.fromISO(item.date).toFormat('q yyyy')}`;
    } else if (trend.period === 'yearly') {
      formattedDate = DateTime.fromISO(item.date).toFormat('yyyy');
    }
    
    return {
      date: formattedDate,
      count: item.count,
      utilizationRate: parseFloat(item.utilizationRate.toFixed(1))
    };
  });

  // Define chart colors
  const chartConfig = {
    count: {
      label: "Appointment Count",
      theme: {
        light: "#2563eb",
        dark: "#3b82f6",
      },
    },
    utilizationRate: {
      label: "Utilization Rate (%)",
      theme: {
        light: "#16a34a",
        dark: "#22c55e",
      },
    },
  };

  // Calculate average utilization rate for reference line
  const avgUtilizationRate = chartData.reduce((sum, item) => sum + item.utilizationRate, 0) / chartData.length;

  return (
    <div style={{ width: "100%", height: height }}>
      <ChartContainer config={chartConfig}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickMargin={10}
            interval={0}
            angle={chartData.length > 12 ? -45 : 0}
            textAnchor={chartData.length > 12 ? "end" : "middle"}
            height={chartData.length > 12 ? 80 : 30}
          />
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            stroke="#2563eb"
            domain={[0, 'auto']}
            tickFormatter={(value) => `${value}`}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#16a34a"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Appointments
                        </span>
                        <span className="font-bold text-xs">
                          {payload[0].value}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Utilization
                        </span>
                        <span className="font-bold text-xs">
                          {payload[1].value}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            name="Appointment Count"
            yAxisId="left"
            stroke="var(--color-count)"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="utilizationRate"
            name="Utilization Rate (%)"
            yAxisId="right"
            stroke="var(--color-utilizationRate)"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <ReferenceLine 
            y={avgUtilizationRate} 
            yAxisId="right" 
            label={{ 
              value: `Avg: ${avgUtilizationRate.toFixed(1)}%`, 
              position: 'insideBottomRight',
              fill: '#16a34a',
              fontSize: 12
            }} 
            stroke="#16a34a" 
            strokeDasharray="3 3" 
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
};