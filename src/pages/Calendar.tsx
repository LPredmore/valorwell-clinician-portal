
import React, { useEffect, useState, useRef } from "react";
import Layout from "../components/layout/Layout";
import CalendarView from "../components/calendar/CalendarView";
import { addWeeks, subWeeks } from "date-fns";
import { useCalendarState } from "../hooks/useCalendarState";
import CalendarHeader from "../components/calendar/CalendarHeader";
import CalendarViewControls from "../components/calendar/CalendarViewControls";
import AppointmentDialog from "../components/calendar/AppointmentDialog";
import { useUser } from "@/context/UserContext";
import { useAppointments } from "@/hooks/useAppointments";
import { CalendarDebugUtils } from "@/utils/calendarDebugUtils";

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
    CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'mount', { userId });
    
    // Log render time on mount
    const mountTime = performance.now() - renderStartTime.current;
    CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'initial-render', mountTime);
    
    return () => {
      CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'unmount');
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
    userTimeZone,
    isLoadingTimeZone,
  } = useCalendarState(userId);
  
  // Log calendar state initialization
  useEffect(() => {
    CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'calendar-state-initialized', {
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
      CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'appointments-fetch-start', {
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

  // Log appointments data loading completion
  useEffect(() => {
    if (!isLoadingAppointments && dataLoadStartTime.current > 0) {
      const loadTime = performance.now() - dataLoadStartTime.current;
      CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'appointments-load', loadTime, {
        appointmentsCount: appointments?.length || 0,
        hasError: !!appointmentsError
      });
      
      // Reset the timer
      dataLoadStartTime.current = 0;
      
      // Log detailed appointment data
      if (appointments && appointments.length > 0) {
        CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'appointments-loaded', {
          count: appointments.length,
          samples: appointments.slice(0, 3).map(a => ({
            id: a.id,
            clientName: a.clientName,
            start_at: a.start_at,
            end_at: a.end_at,
            type: a.type,
            status: a.status
          }))
        });
      } else {
        CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'no-appointments-loaded', {
          clinicianId: selectedClinicianId,
          timeZone: userTimeZone
        });
      }
    }
  }, [isLoadingAppointments, appointments, appointmentsError, selectedClinicianId, userTimeZone]);

  // Add detailed error logging
  useEffect(() => {
    if (appointmentsError) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Appointments fetch error', appointmentsError);
      setCalendarError(appointmentsError);
    }
  }, [appointmentsError]);

  const navigatePrevious = () => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Navigating to previous week', {
      from: currentDate.toISOString(),
      to: subWeeks(currentDate, 1).toISOString()
    });
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const navigateNext = () => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Navigating to next week', {
      from: currentDate.toISOString(),
      to: addWeeks(currentDate, 1).toISOString()
    });
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const navigateToday = () => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Navigating to today', {
      from: currentDate.toISOString(),
      to: new Date().toISOString()
    });
    setCurrentDate(new Date());
  };

  const toggleAvailability = () => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Toggling availability display', {
      current: showAvailability,
      new: !showAvailability
    });
    setShowAvailability(!showAvailability);
  };

  // Central function to handle any data changes that should trigger a refresh
  const handleDataChanged = () => {
    CalendarDebugUtils.logDataLoading(COMPONENT_NAME, 'data-changed-refresh-triggered', {
      currentRefreshTrigger: appointmentRefreshTrigger,
      newRefreshTrigger: appointmentRefreshTrigger + 1
    });
    refetchAppointments();
    setAppointmentRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
            <div className="flex items-center gap-4">
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
            isLoadingTimeZone={isLoadingTimeZone}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            onNavigateToday={navigateToday}
          />

          {calendarError ? (
            <div className="p-4 border border-red-300 bg-red-50 rounded-md">
              <h3 className="text-lg font-medium text-red-800 mb-2">Calendar Error</h3>
              <p className="text-red-600 mb-2">
                There was an error loading the calendar: {calendarError.message}
              </p>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => {
                  setCalendarError(null);
                  refetchAppointments();
                }}
              >
                Retry
              </button>
            </div>
          ) : (
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
          )}
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
