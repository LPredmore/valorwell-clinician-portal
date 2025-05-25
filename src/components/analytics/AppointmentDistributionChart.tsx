import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from "recharts";
import { AppointmentDistribution } from "@/types/analytics";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface AppointmentDistributionChartProps {
  distribution: AppointmentDistribution;
  height?: number;
}

/**
 * Appointment Distribution Chart Component
 * Displays appointment distribution by time period
 */
export const AppointmentDistributionChart: React.FC<AppointmentDistributionChartProps> = ({
  distribution,
  height = 300
}) => {
  // Prepare data for the chart
  const chartData = distribution.data.map(item => ({
    name: item.timeLabel,
    appointments: item.count,
    duration: Math.round(item.duration / 60), // Convert minutes to hours
  }));

  // Define chart colors
  const chartConfig = {
    appointments: {
      label: "Appointments",
      theme: {
        light: "#2563eb",
        dark: "#3b82f6",
      },
    },
    duration: {
      label: "Duration (hours)",
      theme: {
        light: "#16a34a",
        dark: "#22c55e",
      },
    },
  };

  return (
    <div style={{ width: "100%", height: height }}>
      <ChartContainer config={chartConfig}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            tickMargin={10}
            interval={0}
            angle={distribution.data.length > 12 ? -45 : 0}
            textAnchor={distribution.data.length > 12 ? "end" : "middle"}
            height={distribution.data.length > 12 ? 80 : 30}
          />
          <YAxis yAxisId="left" orientation="left" stroke="#2563eb" />
          <YAxis yAxisId="right" orientation="right" stroke="#16a34a" />
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
                          Duration
                        </span>
                        <span className="font-bold text-xs">
                          {payload[1].value} hours
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
          <Bar
            dataKey="appointments"
            name="Appointments"
            yAxisId="left"
            fill="var(--color-appointments)"
            radius={[4, 4, 0, 0]}
            barSize={distribution.data.length > 12 ? 10 : 30}
          />
          <Bar
            dataKey="duration"
            name="Duration (hours)"
            yAxisId="right"
            fill="var(--color-duration)"
            radius={[4, 4, 0, 0]}
            barSize={distribution.data.length > 12 ? 10 : 30}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
};