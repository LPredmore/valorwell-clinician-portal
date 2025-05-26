
import React, { useEffect, useState, useRef } from "react";
import Layout from "../components/layout/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import CalendarView from "../components/calendar/CalendarView";
import { addWeeks, subWeeks } from "date-fns";
import { useCalendarState } from "../hooks/useCalendarState";
import CalendarHeader from "../components/calendar/CalendarHeader";
import CalendarViewControls from "../components/calendar/CalendarViewControls";
import AppointmentDialog from "../components/calendar/AppointmentDialog";
import RealTimeCalendarIndicator from "../components/calendar/RealTimeCalendarIndicator";
import { useUser } from "@/context/UserContext";
import { useTimeZone } from "@/context/TimeZoneContext";
import { useAppointments } from "@/hooks/useAppointments";
import { useRealTimeCalendar } from "@/hooks/useRealTimeCalendar";
import { CalendarDebugUtils } from "@/utils/calendarDebugUtils";
import { Appointment } from "@/types/appointment";
import { Button } from "@/components/ui/button";

// Component name for logging
const COMPONENT_NAME = 'Calendar';

const CalendarPage = () => {
  // Performance tracking
  const renderStartTime = useRef(performance.now());
  const dataLoadStartTime = useRef(0);
  
  // Get the logged-in user's ID
  const { userId } = useUser();
  const [calendarError, setCalendarError] = useState<Error | null>(null);

  // Log component mount
  useEffect(() => {
    console.log(`[${COMPONENT_NAME}] Calendar page mounted with userId:`, userId);
    
    return () => {
      console.log(`[${COMPONENT_NAME}] Calendar page unmounted`);
    };
  }, [userId]);

  const {
    showAvailability,
    setShowAvailability,
    selectedClinicianId,
    currentDate,
    setCurrentDate,
    clients,
    loadingClients,
    appointmentRefreshTrigger,
    setAppointmentRefreshTrigger,
    isDialogOpen,
    setIsDialogOpen,
  } = useCalendarState(userId);
  
  // Use the TimeZoneContext instead of getting timezone from useCalendarState
  const { userTimeZone } = useTimeZone();
  const isLoadingTimeZone = false; // TimeZoneContext is always available
  
  // Log calendar state initialization
  useEffect(() => {
    console.log(`[${COMPONENT_NAME}] Calendar state initialized:`, {
      selectedClinicianId,
      userTimeZone,
      isLoadingTimeZone,
      currentDate: currentDate.toISOString(),
      showAvailability,
      clientsCount: clients?.length || 0,
      loadingClients,
      appointmentRefreshTrigger
    });
  }, [selectedClinicianId, userTimeZone, isLoadingTimeZone, currentDate, showAvailability, clients, loadingClients, appointmentRefreshTrigger]);
  
  // Start tracking data load time
  useEffect(() => {
    if (selectedClinicianId && userTimeZone) {
      dataLoadStartTime.current = performance.now();
      console.log(`[${COMPONENT_NAME}] Starting appointment fetch with params:`, {
        clinicianId: selectedClinicianId,
        timeZone: userTimeZone,
        startDate: subWeeks(currentDate, 4).toISOString(),
        endDate: addWeeks(currentDate, 8).toISOString(),
        refreshTrigger: appointmentRefreshTrigger
      });
    }
  }, [selectedClinicianId, userTimeZone, currentDate, appointmentRefreshTrigger]);
  
  // Fetch appointments with better date range
  const {
    appointments,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments
  } = useAppointments(
    selectedClinicianId,
    // Start date for fetch range - 1 month before current date
    subWeeks(currentDate, 4),
    // End date for fetch range - 2 months after current date
    addWeeks(currentDate, 8),
    userTimeZone,
    appointmentRefreshTrigger // Pass the refresh trigger to the hook
  );
  
  // Initialize real-time calendar updates
  const { isConnected: isRealTimeConnected } = useRealTimeCalendar({
    onAppointmentCreated: (appointment: Appointment) => {
      console.log(`[${COMPONENT_NAME}] Real-time appointment created:`, appointment.id);
      handleDataChanged();
    },
    onAppointmentUpdated: (appointment: Appointment) => {
      console.log(`[${COMPONENT_NAME}] Real-time appointment updated:`, appointment.id);
      handleDataChanged();
    },
    onAppointmentDeleted: (appointment: Appointment) => {
      console.log(`[${COMPONENT_NAME}] Real-time appointment deleted:`, appointment.id);
      handleDataChanged();
    },
    onConnectionChange: (status: string) => {
      console.log(`[${COMPONENT_NAME}] Real-time connection status:`, status);
    }
  });

  // Log appointments data loading completion
  useEffect(() => {
    if (!isLoadingAppointments && dataLoadStartTime.current > 0) {
      const loadTime = performance.now() - dataLoadStartTime.current;
      console.log(`[${COMPONENT_NAME}] Appointments load completed:`, {
        loadTime: `${loadTime.toFixed(2)}ms`,
        appointmentsCount: appointments?.length || 0,
        hasError: !!appointmentsError,
        errorMessage: appointmentsError?.message
      });
      
      // Reset the timer
      dataLoadStartTime.current = 0;
    }
  }, [isLoadingAppointments, appointments, appointmentsError]);

  // Add detailed error logging
  useEffect(() => {
    if (appointmentsError) {
      console.error(`[${COMPONENT_NAME}] Appointments error:`, appointmentsError);
      setCalendarError(appointmentsError);
    } else {
      setCalendarError(null);
    }
  }, [appointmentsError]);

  const navigatePrevious = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const navigateNext = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  const toggleAvailability = () => {
    console.log(`[${COMPONENT_NAME}] Toggling availability display:`, {
      current: showAvailability,
      new: !showAvailability
    });
    setShowAvailability(!showAvailability);
  };

  // Central function to handle any data changes that should trigger a refresh
  const handleDataChanged = () => {
    console.log(`[${COMPONENT_NAME}] Data changed, triggering refresh`);
    refetchAppointments();
    setAppointmentRefreshTrigger();
  };

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
            <div className="flex items-center gap-4">
              <RealTimeCalendarIndicator
                compact={true}
                onAppointmentUpdate={handleDataChanged}
                className="mr-2"
              />
              <CalendarViewControls
                showAvailability={showAvailability}
                onToggleAvailability={toggleAvailability}
                onNewAppointment={() => setIsDialogOpen(true)}
                selectedClinicianId={selectedClinicianId}
              />
            </div>
          </div>

          <CalendarHeader
            currentDate={currentDate}
            userTimeZone={userTimeZone}
            isLoadingTimeZone={false}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            onNavigateToday={navigateToday}
          />

          {/* Debug Information Panel */}
          {calendarError && (
            <div className="p-4 border border-red-300 bg-red-50 rounded-md">
              <h3 className="text-lg font-medium text-red-800 mb-2">Calendar Data Error</h3>
              <p className="text-red-600 mb-2">
                Error loading calendar data: {calendarError.message}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    console.log(`[${COMPONENT_NAME}] User clicked retry`);
                    setCalendarError(null);
                    refetchAppointments();
                  }}
                  variant="outline"
                  size="sm"
                >
                  Retry
                </Button>
                <Button
                  onClick={() => {
                    console.log(`[${COMPONENT_NAME}] User requested debug info`);
                    console.log('Debug Info:', {
                      selectedClinicianId,
                      userTimeZone,
                      appointmentRefreshTrigger,
                      appointmentsCount: appointments?.length || 0,
                      isLoadingAppointments,
                      calendarError: calendarError?.message
                    });
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Show Debug Info
                </Button>
              </div>
            </div>
          )}

          {/* Current State Debug Panel (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-gray-100 rounded text-xs">
              <details>
                <summary className="cursor-pointer font-medium">Debug Info</summary>
                <pre className="mt-2 text-xs">
                  {JSON.stringify({
                    selectedClinicianId,
                    userTimeZone,
                    appointmentsCount: appointments?.length || 0,
                    isLoadingAppointments,
                    showAvailability,
                    hasError: !!calendarError,
                    errorMessage: calendarError?.message
                  }, null, 2)}
                </pre>
              </details>
            </div>
          )}

          <ErrorBoundary
            componentName="CalendarView"
            fallback={
              <div className="p-4 border border-red-300 bg-red-50 rounded-md">
                <h3 className="text-lg font-medium text-red-800 mb-2">Calendar Error</h3>
                <p className="text-red-600 mb-2">
                  There was an error rendering the calendar view
                </p>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
            }
          >
            <CalendarView
              view="week"
              showAvailability={showAvailability}
              clinicianId={selectedClinicianId}
              currentDate={currentDate}
              userTimeZone={userTimeZone}
              refreshTrigger={appointmentRefreshTrigger}
              appointments={appointments}
              isLoading={isLoadingAppointments}
              error={appointmentsError}
            />
          </ErrorBoundary>
          
          {/* Full real-time indicator at the bottom of the calendar */}
          <div className="mt-4">
            <RealTimeCalendarIndicator
              onAppointmentUpdate={handleDataChanged}
              showControls={true}
            />
          </div>
        </div>
      </div>

      <AppointmentDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        clients={clients}
        loadingClients={loadingClients}
        selectedClinicianId={selectedClinicianId}
        onAppointmentCreated={handleDataChanged} // Use the central data changed handler
      />
    </Layout>
  );
};

export default CalendarPage;
