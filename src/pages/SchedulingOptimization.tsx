import React, { useState, useEffect } from "react";
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAppointments } from "@/hooks/useAppointments";
import * as TimeZoneUtils from "@/utils/timeZoneUtils";
import * as OptimizationUtils from "@/utils/optimizationUtils";
import { DateTime } from "luxon";
import { OptimizationSuggestions } from "@/components/analytics/OptimizationSuggestions";

/**
 * Scheduling Optimization Page
 * Displays detailed scheduling optimization suggestions
 */
const SchedulingOptimization = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("suggestions");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: DateTime.now().minus({ days: 30 }).toJSDate(),
    to: DateTime.now().plus({ days: 60 }).toJSDate(),
  });
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const timezone = TimeZoneUtils.ensureIANATimeZone(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  
  // Fetch appointments
  const { appointments, isLoading } = useAppointments(
    null, // Fetch for all clinicians
    dateRange.from,
    dateRange.to,
    timezone
  );
  
  // Format date range for display
  const formattedDateRange = `${DateTime.fromJSDate(dateRange.from).toFormat("MMM d, yyyy")} - ${DateTime.fromJSDate(dateRange.to).toFormat("MMM d, yyyy")}`;
  
  // Handle date range selection
  const handleDateRangeSelect = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
      setIsCalendarOpen(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scheduling Optimization</h1>
            <p className="text-muted-foreground">
              Identify and apply scheduling optimizations to improve efficiency
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
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 md:w-[600px]">
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="utilization">Utilization Heatmap</TabsTrigger>
            <TabsTrigger value="settings">Optimization Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="suggestions" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : appointments.length > 0 ? (
              <div className="grid gap-4 grid-cols-1">
                <OptimizationSuggestions 
                  appointments={appointments} 
                  timezone={timezone} 
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Optimization Impact</CardTitle>
                    <CardDescription>
                      Potential impact of applying all optimization suggestions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">Utilization Increase</span>
                        <span className="text-2xl font-bold">+12.5%</span>
                        <span className="text-xs text-muted-foreground">Estimated improvement</span>
                      </div>
                      
                      <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">Additional Appointments</span>
                        <span className="text-2xl font-bold">+8</span>
                        <span className="text-xs text-muted-foreground">Per month</span>
                      </div>
                      
                      <div className="flex flex-col space-y-2 p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">Time Gained</span>
                        <span className="text-2xl font-bold">6.5 hours</span>
                        <span className="text-xs text-muted-foreground">Per month</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                <p className="text-muted-foreground">No appointment data available for optimization</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="utilization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Utilization Heatmap</CardTitle>
                <CardDescription>
                  Visualize appointment utilization by day and hour
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[500px] flex items-center justify-center">
                <p className="text-muted-foreground">Utilization heatmap visualization will be implemented in the next update</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Settings</CardTitle>
                <CardDescription>
                  Configure optimization preferences and constraints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Optimization Goal</label>
                    <Select defaultValue="utilization">
                      <SelectTrigger>
                        <SelectValue placeholder="Select optimization goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utilization">Maximize Utilization</SelectItem>
                        <SelectItem value="gaps">Minimize Gaps</SelectItem>
                        <SelectItem value="balance">Balance Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Working Hours</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select defaultValue="9">
                        <SelectTrigger>
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 7).map((hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour}:00 {hour < 12 ? 'AM' : 'PM'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select defaultValue="17">
                        <SelectTrigger>
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 13).map((hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour - 12}:00 PM
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Working Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <Button
                          key={day}
                          variant={index < 5 ? "default" : "outline"}
                          className="w-12 h-12 p-0"
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Minimum Appointment Duration</label>
                    <Select defaultValue="30">
                      <SelectTrigger>
                        <SelectValue placeholder="Select minimum duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button>Save Settings</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default SchedulingOptimization;