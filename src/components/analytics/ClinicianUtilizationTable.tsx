import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClinicianUtilization } from "@/types/analytics";
import { Badge } from "@/components/ui/badge";

interface ClinicianUtilizationTableProps {
  clinicianUtilization: ClinicianUtilization[];
}

/**
 * Clinician Utilization Table Component
 * Displays utilization metrics for each clinician
 */
export const ClinicianUtilizationTable: React.FC<ClinicianUtilizationTableProps> = ({
  clinicianUtilization
}) => {
  // Sort by utilization rate (highest first)
  const sortedUtilization = [...clinicianUtilization].sort(
    (a, b) => b.utilizationRate - a.utilizationRate
  );

  // Function to determine utilization status and color
  const getUtilizationStatus = (rate: number): { status: string; color: string } => {
    if (rate >= 85) {
      return { status: "Excellent", color: "bg-green-500" };
    } else if (rate >= 70) {
      return { status: "Good", color: "bg-blue-500" };
    } else if (rate >= 50) {
      return { status: "Average", color: "bg-yellow-500" };
    } else {
      return { status: "Low", color: "bg-red-500" };
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Clinician</TableHead>
            <TableHead>Utilization</TableHead>
            <TableHead className="hidden md:table-cell">Appointments</TableHead>
            <TableHead className="hidden md:table-cell">Avg. Duration</TableHead>
            <TableHead className="hidden lg:table-cell">No-Show Rate</TableHead>
            <TableHead className="hidden lg:table-cell">Cancellation Rate</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedUtilization.map((util) => {
            const { status, color } = getUtilizationStatus(util.utilizationRate);
            
            return (
              <TableRow key={util.clinicianId}>
                <TableCell className="font-medium">{util.clinicianName}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <div className="w-16">{util.utilizationRate.toFixed(1)}%</div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color}`}
                        style={{ width: `${Math.min(util.utilizationRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{util.appointmentCount}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {Math.round(util.averageAppointmentDuration)} min
                </TableCell>
                <TableCell className="hidden lg:table-cell">{util.noShowRate.toFixed(1)}%</TableCell>
                <TableCell className="hidden lg:table-cell">{util.cancellationRate.toFixed(1)}%</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${color.replace('bg-', 'border-')} ${color.replace('bg-', 'text-')}`}
                  >
                    {status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};