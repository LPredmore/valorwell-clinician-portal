import React, { useState } from "react";
import Layout from '../components/layout/Layout';
import { ReportGenerator } from '../components/analytics/ReportGenerator';
import { useAppointments } from "@/hooks/useAppointments";
import * as TimeZoneUtils from "@/utils/timeZoneUtils";
import { DateTime } from "luxon";

/**
 * Reports Page
 * Displays report generation interface
 */
const Reports = () => {
  // Set date range for the last 90 days
  const [dateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: DateTime.now().minus({ days: 90 }).toJSDate(),
    to: DateTime.now().toJSDate(),
  });
  
  // Get user's timezone
  const timezone = TimeZoneUtils.ensureIANATimeZone(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  
  // Fetch appointments for the last 90 days
  const { appointments, isLoading } = useAppointments(
    null, // Fetch for all clinicians
    dateRange.from,
    dateRange.to,
    timezone
  );

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Utilization Reports</h1>
            <p className="text-muted-foreground">
              Generate and schedule appointment utilization reports
            </p>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ReportGenerator 
            appointments={appointments} 
            timezone={timezone} 
          />
        )}
      </div>
    </Layout>
  );
};

export default Reports;