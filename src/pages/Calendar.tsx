
import React, { useState } from "react";
import Layout from "../components/layout/Layout";
import { useAuth } from "@/context/AuthProvider";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import VirtualCalendar from "../components/calendar/VirtualCalendar";
import { getUserTimeZone } from "@/utils/timeZoneUtils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import ClinicianAvailabilityPanel from "../components/calendar/ClinicianAvailabilityPanel";
import SchedulerManagementPanel from "../components/calendar/SchedulerManagementPanel";
import CalendarConnectionsPanel from "../components/calendar/CalendarConnectionsPanel";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

/**
 * Calendar component - Main calendar view for clinicians
 * Simplified to use AuthWrapper for auth checks and remove circular dependencies
 */
const Calendar = () => {
  const { userId, userRole } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const userTimeZone = getUserTimeZone();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  const syncCalendarMutation = useMutation({
    mutationFn: async () => {
      const startOfView = startOfWeek(currentDate);
      const endOfView = endOfWeek(currentDate);

      const { data, error } = await supabase.functions.invoke('nylas-sync-appointments', {
        body: {
          action: 'sync_bidirectional',
          clinicianId: userId,
          startDate: startOfView.toISOString(),
          endDate: endOfView.toISOString(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Sync Kicked Off',
        description: data.message || 'Calendar sync analysis has started.',
      });
      // Refresh calendar view after a short delay to allow sync to process
      setTimeout(() => handleAvailabilityUpdated(), 2000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Navigation functions
  const navigatePrevious = () => setCurrentDate(subWeeks(currentDate, 1));
  const navigateNext = () => setCurrentDate(addWeeks(currentDate, 1));
  const navigateToday = () => setCurrentDate(new Date());

  const handleAvailabilityUpdated = () => {
    console.log('Availability updated, refreshing calendar view...');
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle event click
  const handleEventClick = (event: any) => {
    console.log('Event clicked:', event);
    // TODO: Open event details dialog
  };

  // Handle new appointment
  const handleNewAppointment = (date: Date, time?: string) => {
    console.log('New appointment requested for:', date, time);
    // TODO: Open appointment creation dialog
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        <div>
          <ErrorBoundary componentName="Calendar">
            <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in h-full flex flex-col">
              <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
                  <div className="text-sm text-gray-500">
                    User: {userRole} | ID: {userId?.slice(0, 8)}...
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={navigatePrevious}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={navigateToday}>
                      Today
                    </Button>
                    <Button variant="outline" onClick={navigateNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => syncCalendarMutation.mutate()} 
                      disabled={syncCalendarMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncCalendarMutation.isPending ? 'animate-spin' : ''}`} />
                      Sync Calendars
                    </Button>
                  </div>
                  <h2 className="text-lg font-semibold">
                    {currentDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h2>
                </div>

                {/* Calendar */}
                <div className="flex-1">
                  <VirtualCalendar
                    clinicianId={userId}
                    currentDate={currentDate}
                    userTimeZone={userTimeZone}
                    onNewAppointment={handleNewAppointment}
                    onAppointmentClick={handleEventClick}
                    refreshTrigger={refreshTrigger}
                    onAvailabilityUpdated={handleAvailabilityUpdated}
                  />
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </div>
        <div className="space-y-6">
          <CalendarConnectionsPanel />
          <ClinicianAvailabilityPanel
            clinicianId={userId}
            onAvailabilityUpdated={handleAvailabilityUpdated}
            userTimeZone={userTimeZone}
          />
          <SchedulerManagementPanel clinicianId={userId} />
        </div>
      </div>
    </Layout>
  );
};

export default Calendar;
