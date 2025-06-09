import React, { useEffect, useMemo, useCallback } from "react";
import Layout from "../components/layout/Layout";
import CalendarView from "../components/calendar/CalendarView";
import { addWeeks, subWeeks } from "date-fns";
import { useCalendarState } from "../hooks/useCalendarState";
import CalendarHeader from "../components/calendar/CalendarHeader";
import CalendarViewControls from "../components/calendar/CalendarViewControls";
import AppointmentDialog from "../components/calendar/AppointmentDialog";
import BlockTimeDialog from "../components/calendar/BlockTimeDialog";
import { useUser } from "@/context/UserContext";
import { useAppointments } from "@/hooks/useAppointments";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import { getClinicianTimeZone } from "../hooks/useClinicianData";
import CalendarConnectionsPanel from "../components/calendar/CalendarConnectionsPanel";

const CalendarPage = React.memo(() => {
  // Get the logged-in user's ID
  const { userId } = useUser();

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

  // State for Block Time dialog
  const [isBlockTimeDialogOpen, setIsBlockTimeDialogOpen] = React.useState(false);

  // Fetch clinician's current timezone for WeekView display with memoization
  const [clinicianTimeZone, setClinicianTimeZone] = React.useState<string | null>(null);
  const [isLoadingClinicianTimeZone, setIsLoadingClinicianTimeZone] = React.useState(true);

  // Memoize timezone fetching to prevent redundant calls
  const fetchClinicianTimeZone = useCallback(async () => {
    if (!selectedClinicianId) {
      setClinicianTimeZone(null);
      setIsLoadingClinicianTimeZone(false);
      return;
    }

    try {
      setIsLoadingClinicianTimeZone(true);
      const timezone = await getClinicianTimeZone(selectedClinicianId);
      // Handle array timezone values by taking the first element
      const resolvedTimezone = Array.isArray(timezone) ? timezone[0] : timezone;
      setClinicianTimeZone(resolvedTimezone);
    } catch (error) {
      console.error('[CalendarPage] Error fetching clinician timezone:', error);
      setClinicianTimeZone(userTimeZone); // Fallback to user timezone
    } finally {
      setIsLoadingClinicianTimeZone(false);
    }
  }, [selectedClinicianId, userTimeZone]);

  useEffect(() => {
    fetchClinicianTimeZone();
  }, [fetchClinicianTimeZone]);
  
  // Calculate date range for appointments with memoization
  const dateRange = useMemo(() => ({
    fromDate: subWeeks(currentDate, 4),
    toDate: addWeeks(currentDate, 8)
  }), [currentDate]);
  
  // Fetch appointments with better date range and memoized parameters
  const {
    appointments,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments
  } = useAppointments(
    selectedClinicianId,
    dateRange.fromDate,
    dateRange.toDate,
    userTimeZone,
    appointmentRefreshTrigger
  );

  // Memoize navigation functions to prevent unnecessary re-renders
  const navigatePrevious = useCallback(() => {
    setCurrentDate(subWeeks(currentDate, 1));
  }, [currentDate, setCurrentDate]);

  const navigateNext = useCallback(() => {
    setCurrentDate(addWeeks(currentDate, 1));
  }, [currentDate, setCurrentDate]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  const toggleAvailability = useCallback(() => {
    setShowAvailability(!showAvailability);
  }, [showAvailability, setShowAvailability]);

  const handleDataChanged = useCallback(() => {
    refetchAppointments();
    setAppointmentRefreshTrigger(prev => prev + 1);
  }, [refetchAppointments, setAppointmentRefreshTrigger]);

  const handleBlockTimeCreated = useCallback(() => {
    handleDataChanged();
  }, [handleDataChanged]);

  const handleOpenBlockTimeDialog = useCallback(() => {
    if (!selectedClinicianId) {
      console.warn("[CalendarPage] WARNING: No clinician selected for block time");
    }
    
    setIsBlockTimeDialogOpen(true);
  }, [selectedClinicianId]);

  // Memoize loading state to prevent unnecessary re-renders
  const isLoading = useMemo(() => {
    return isLoadingTimeZone || isLoadingClinicianTimeZone;
  }, [isLoadingTimeZone, isLoadingClinicianTimeZone]);

  // Show loading state while timezone is loading
  if (isLoading) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading calendar settings...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <CalendarErrorBoundary>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex flex-col space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
              <div className="flex items-center gap-4">
                <CalendarViewControls
                  showAvailability={showAvailability}
                  onToggleAvailability={toggleAvailability}
                  onNewAppointment={() => setIsDialogOpen(true)}
                  onBlockTime={handleOpenBlockTimeDialog}
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

            {/* Updated layout to include calendar connections */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <CalendarView
                  view="week"
                  showAvailability={showAvailability}
                  clinicianId={selectedClinicianId}
                  currentDate={currentDate}
                  userTimeZone={userTimeZone}
                  clinicianTimeZone={clinicianTimeZone || userTimeZone}
                  refreshTrigger={appointmentRefreshTrigger}
                  appointments={appointments}
                  isLoading={isLoadingAppointments}
                  error={appointmentsError}
                />
              </div>
              
              <div className="lg:col-span-1 space-y-4">
                <CalendarConnectionsPanel />
                
                {showAvailability && (
                  <ClinicianAvailabilityPanel 
                    clinicianId={selectedClinicianId} 
                    onAvailabilityUpdated={handleDataChanged}
                    userTimeZone={userTimeZone}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <AppointmentDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          clients={clients}
          selectedClinicianId={selectedClinicianId}
          onAppointmentCreated={handleDataChanged}
        />

        <BlockTimeDialog
          isOpen={isBlockTimeDialogOpen}
          onClose={() => setIsBlockTimeDialogOpen(false)}
          selectedClinicianId={selectedClinicianId}
          onBlockCreated={handleBlockTimeCreated}
        />
      </CalendarErrorBoundary>
    </Layout>
  );
});

CalendarPage.displayName = 'CalendarPage';

export default CalendarPage;
