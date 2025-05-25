import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClinicianUtilization } from "@/types/analytics";

interface UtilizationMetricsCardProps {
  clinicianUtilization: ClinicianUtilization[];
}

/**
 * Utilization Metrics Card Component
 * Displays key utilization metrics
 */
export const UtilizationMetricsCard: React.FC<UtilizationMetricsCardProps> = ({
  clinicianUtilization
}) => {
  // Calculate overall metrics
  const metrics = useMemo(() => {
    if (!clinicianUtilization || clinicianUtilization.length === 0) {
      return {
        overallUtilization: 0,
        highestUtilization: 0,
        lowestUtilization: 0,
        averageNoShowRate: 0,
        totalAppointments: 0,
        totalHours: 0
      };
    }

    // Calculate total values
    const totalAvailableTime = clinicianUtilization.reduce(
      (sum, util) => sum + util.totalAvailableTime, 0
    );
    
    const totalBookedTime = clinicianUtilization.reduce(
      (sum, util) => sum + util.totalBookedTime, 0
    );
    
    const totalAppointments = clinicianUtilization.reduce(
      (sum, util) => sum + util.appointmentCount, 0
    );
    
    // Calculate rates
    const overallUtilization = totalAvailableTime > 0
      ? (totalBookedTime / totalAvailableTime) * 100
      : 0;
    
    const utilizationRates = clinicianUtilization.map(util => util.utilizationRate);
    const highestUtilization = Math.max(...utilizationRates);
    const lowestUtilization = Math.min(...utilizationRates);
    
    const averageNoShowRate = clinicianUtilization.reduce(
      (sum, util) => sum + util.noShowRate, 0
    ) / clinicianUtilization.length;
    
    // Convert minutes to hours
    const totalHours = totalBookedTime / 60;
    
    return {
      overallUtilization,
      highestUtilization,
      lowestUtilization,
      averageNoShowRate,
      totalAppointments,
      totalHours
    };
  }, [clinicianUtilization]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Overall Utilization
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.overallUtilization.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Average across all clinicians
          </p>
          <div className="mt-4 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{
                width: `${Math.min(metrics.overallUtilization, 100)}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Utilization Range
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            <div>
              <div className="text-xl font-bold">
                {metrics.highestUtilization.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Highest
              </p>
            </div>
            <div>
              <div className="text-xl font-bold">
                {metrics.lowestUtilization.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Lowest
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Booked Hours
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(metrics.totalHours)}
          </div>
          <p className="text-xs text-muted-foreground">
            Across {metrics.totalAppointments} appointments
          </p>
        </CardContent>
      </Card>
    </>
  );
};