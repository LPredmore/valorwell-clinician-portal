import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "@/hooks/useAppointments";
import * as TimeZoneUtils from "@/utils/timeZoneUtils";
import * as AnalyticsUtils from "@/utils/analyticsUtils";
import { AnalyticsFilter, AnalyticsTimePeriod, AppointmentDistribution } from "@/types/analytics";
import { AppointmentDistributionChart } from "./AppointmentDistributionChart";
import { UtilizationMetricsCard } from "./UtilizationMetricsCard";
import { AppointmentTrendChart } from "./AppointmentTrendChart";
import { ClinicianUtilizationTable } from "./ClinicianUtilizationTable";
import { OptimizationSuggestions } from "./OptimizationSuggestions";

/**
 * Analytics Dashboard Component
 * Main component for displaying calendar analytics
 */
const AnalyticsDashboard: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: DateTime.now().minus({ days: 30 }).toJSDate(),
    to: DateTime.now().toJSDate(),
  });
  
  const [filter, setFilter] = useState<AnalyticsFilter>({
    startDate: DateTime.now().minus({ days: 30 }).toISO(),
    endDate: DateTime.now().toISO(),
  });
  
  const [timePeriod, setTimePeriod] = useState<AnalyticsTimePeriod>(AnalyticsTimePeriod.WEEKLY);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const timezone = TimeZoneUtils.ensureIANATimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Fetch appointments using the existing hook
  const { appointments = [], isLoading: isLoadingAppointments } = useAppointments(
    null, // Fetch for all clinicians
    dateRange.from,
    dateRange.to,
    timezone
  );
  
  // Update filter when date range changes
  useEffect(() => {
    setFilter({
      ...filter,
      startDate: DateTime.fromJSDate(dateRange.from).toISO(),
      endDate: DateTime.fromJSDate(dateRange.to).toISO(),
    });
  }, [dateRange]);
  
  // Calculate analytics data
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["analytics", filter, timePeriod],
    queryFn: async () => {
      try {
        // Basic statistics
        const statistics = AnalyticsUtils.calculateAppointmentStatistics(appointments, filter);
        
        // Distribution by time period
        const distribution = AnalyticsUtils.calculateAppointmentDistribution(
          appointments,
          timePeriod,
          timezone
        );
        
        // Appointment trends
        const trend = AnalyticsUtils.calculateAppointmentTrend(
          appointments,
          AnalyticsTimePeriod.MONTHLY,
          timezone,
          filter
        );
        
        // Clinician utilization
        const clinicianIds = Array.from(new Set(appointments.map(appt => appt.clinician_id)));
        const clinicianUtilization = clinicianIds.map(clinicianId => 
          AnalyticsUtils.calculateClinicianUtilization(
            appointments,
            clinicianId as string,
            `Clinician ${(clinicianId as string).substring(0, 8)}`, // Simplified name
            8, // Default 8 hours per day
            5, // Default 5 days per week
            filter
          )
        );
        
        return {
          statistics,
          distribution,
          trend,
          clinicianUtilization
        };
      } catch (error) {
        console.error("Error calculating analytics:", error);
        toast({
          title: "Analytics Error",
          description: "Failed to calculate analytics data",
          variant: "destructive",
        });
        return null;
      }
    },
    enabled: appointments.length > 0 && !isLoadingAppointments,
  });
  
  // Format date range for display
  const formattedDateRange = `${DateTime.fromJSDate(dateRange.from).toFormat("MMM d, yyyy")} - ${DateTime.fromJSDate(dateRange.to).toFormat("MMM d, yyyy")}`;
  
  // Handle date range selection
  const handleDateRangeSelect = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
      setIsCalendarOpen(false);
    }
  };
  
  // Handle time period change
  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value as AnalyticsTimePeriod);
  };
  
  // Handle export to CSV
  const handleExportCSV = () => {
    if (!analyticsData) return;
    
    try {
      const csvData = AnalyticsUtils.exportToCSV(analyticsData.statistics);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `analytics_${DateTime.now().toFormat("yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Export Error",
        description: "Failed to export analytics data",
        variant: "destructive",
      });
    }
  };
  
  const isLoading = isLoadingAppointments || isLoadingAnalytics;
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar Analytics</h1>
          <p className="text-muted-foreground">
            Analyze appointment data and optimize scheduling
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                <span className="mr-2">📅</span>
                {formattedDateRange}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={handleDateRangeSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AnalyticsTimePeriod.DAILY}>Daily</SelectItem>
              <SelectItem value={AnalyticsTimePeriod.WEEKLY}>Weekly</SelectItem>
              <SelectItem value={AnalyticsTimePeriod.MONTHLY}>Monthly</SelectItem>
              <SelectItem value={AnalyticsTimePeriod.QUARTERLY}>Quarterly</SelectItem>
              <SelectItem value={AnalyticsTimePeriod.YEARLY}>Yearly</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExportCSV} disabled={isLoading || !analyticsData}>
            Export CSV
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-[600px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : analyticsData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Appointments
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
                    <div className="text-2xl font-bold">
                      {analyticsData.statistics.totalAppointments}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      During selected period
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Completed Rate
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
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData.statistics.totalAppointments > 0
                        ? `${((analyticsData.statistics.completedAppointments / analyticsData.statistics.totalAppointments) * 100).toFixed(1)}%`
                        : "0%"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analyticsData.statistics.completedAppointments} completed appointments
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      No-Show Rate
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
                      {analyticsData.statistics.totalAppointments > 0
                        ? `${((analyticsData.statistics.noShowAppointments / analyticsData.statistics.totalAppointments) * 100).toFixed(1)}%`
                        : "0%"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analyticsData.statistics.noShowAppointments} no-show appointments
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Average Duration
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
                      {Math.round(analyticsData.statistics.averageDuration)} min
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per appointment
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Appointment Distribution</CardTitle>
                    <CardDescription>
                      {timePeriod === AnalyticsTimePeriod.DAILY
                        ? "Appointments by day of week"
                        : timePeriod === AnalyticsTimePeriod.WEEKLY
                        ? "Appointments by hour of day"
                        : timePeriod === AnalyticsTimePeriod.MONTHLY
                        ? "Appointments by day of month"
                        : timePeriod === AnalyticsTimePeriod.QUARTERLY
                        ? "Appointments by month (quarterly)"
                        : "Appointments by month (yearly)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <AppointmentDistributionChart 
                      distribution={analyticsData.distribution} 
                      height={350} 
                    />
                  </CardContent>
                </Card>
                
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Appointment Status</CardTitle>
                    <CardDescription>
                      Breakdown by appointment status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Completed</span>
                            <span className="text-sm font-medium">
                              {analyticsData.statistics.totalAppointments > 0
                                ? `${((analyticsData.statistics.completedAppointments / analyticsData.statistics.totalAppointments) * 100).toFixed(1)}%`
                                : "0%"}
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-green-500"
                              style={{
                                width: `${
                                  analyticsData.statistics.totalAppointments > 0
                                    ? (analyticsData.statistics.completedAppointments / analyticsData.statistics.totalAppointments) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Cancelled</span>
                            <span className="text-sm font-medium">
                              {analyticsData.statistics.totalAppointments > 0
                                ? `${((analyticsData.statistics.cancelledAppointments / analyticsData.statistics.totalAppointments) * 100).toFixed(1)}%`
                                : "0%"}
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-yellow-500"
                              style={{
                                width: `${
                                  analyticsData.statistics.totalAppointments > 0
                                    ? (analyticsData.statistics.cancelledAppointments / analyticsData.statistics.totalAppointments) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">No-Show</span>
                            <span className="text-sm font-medium">
                              {analyticsData.statistics.totalAppointments > 0
                                ? `${((analyticsData.statistics.noShowAppointments / analyticsData.statistics.totalAppointments) * 100).toFixed(1)}%`
                                : "0%"}
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-red-500"
                              style={{
                                width: `${
                                  analyticsData.statistics.totalAppointments > 0
                                    ? (analyticsData.statistics.noShowAppointments / analyticsData.statistics.totalAppointments) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Rescheduled</span>
                            <span className="text-sm font-medium">
                              {analyticsData.statistics.totalAppointments > 0
                                ? `${((analyticsData.statistics.rescheduledAppointments / analyticsData.statistics.totalAppointments) * 100).toFixed(1)}%`
                                : "0%"}
                            </span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{
                                width: `${
                                  analyticsData.statistics.totalAppointments > 0
                                    ? (analyticsData.statistics.rescheduledAppointments / analyticsData.statistics.totalAppointments) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">No analytics data available</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="utilization" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : analyticsData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <UtilizationMetricsCard 
                  clinicianUtilization={analyticsData.clinicianUtilization} 
                />
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Clinician Utilization</CardTitle>
                  <CardDescription>
                    Utilization rates by clinician
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ClinicianUtilizationTable 
                    clinicianUtilization={analyticsData.clinicianUtilization} 
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">No utilization data available</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : analyticsData ? (
            <Card>
              <CardHeader>
                <CardTitle>Appointment Trends</CardTitle>
                <CardDescription>
                  Appointment count and utilization over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppointmentTrendChart 
                  trend={analyticsData.trend} 
                  height={400} 
                />
              </CardContent>
            </Card>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">No trend data available</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="optimization" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : appointments.length > 0 ? (
            <OptimizationSuggestions 
              appointments={appointments} 
              timezone={timezone} 
            />
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-muted-foreground">No appointment data available for optimization</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;