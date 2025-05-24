
import React, { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import CalendarView from "../components/calendar/CalendarView";
import { addWeeks, subWeeks } from "date-fns";
import { useCalendarState } from "../hooks/useCalendarState";
import CalendarHeader from "../components/calendar/CalendarHeader";
import CalendarViewControls from "../components/calendar/CalendarViewControls";
import AppointmentDialog from "../components/calendar/AppointmentDialog";
import { useUser } from "@/context/UserContext";
import { useAppointments } from "@/hooks/useAppointments";

const CalendarPage = () => {
  // Get the logged-in user's ID
  const { userId } = useUser();
  const [calendarError, setCalendarError] = useState<Error | null>(null);

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

  // Add detailed error logging
  useEffect(() => {
    if (appointmentsError) {
      console.error('[CalendarPage] Appointments error:', appointmentsError);
      setCalendarError(appointmentsError);
    }
  }, [appointmentsError]);

  // Log key information for debugging
  useEffect(() => {
    console.log("[CalendarPage] Calendar initialized:", {
      userTimeZone,
      currentDate: currentDate.toISOString(),
      selectedClinicianId,
      appointmentsCount: appointments?.length || 0,
      refreshTrigger: appointmentRefreshTrigger
    });
    
    // Log first few appointments for verification
    if (appointments && appointments.length > 0) {
      console.log("[CalendarPage] Sample appointments:", 
        appointments.slice(0, 3).map(a => ({
          id: a.id,
          clientName: a.clientName,
          start_at: a.start_at,
          end_at: a.end_at
        }))
      );
    }
  }, [appointments, userTimeZone, currentDate, selectedClinicianId, appointmentRefreshTrigger]);

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
    setShowAvailability(!showAvailability);
  };

  // Central function to handle any data changes that should trigger a refresh
  const handleDataChanged = () => {
    console.log("[CalendarPage] Data changed, refreshing calendar...");
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
