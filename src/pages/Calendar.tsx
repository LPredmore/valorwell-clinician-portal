
import React, { useEffect } from "react";
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

const CalendarPage = () => {
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

  // Fetch clinician's current timezone for WeekView display
  const [clinicianTimeZone, setClinicianTimeZone] = React.useState<string | null>(null);
  const [isLoadingClinicianTimeZone, setIsLoadingClinicianTimeZone] = React.useState(true);

  useEffect(() => {
    const fetchClinicianTimeZone = async () => {
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
    };

    fetchClinicianTimeZone();
  }, [selectedClinicianId, userTimeZone]);
  
  // Calculate date range for appointments
  const fromDate = subWeeks(currentDate, 4);
  const toDate = addWeeks(currentDate, 8);
  
  // Fetch appointments with better date range
  const {
    appointments,
    isLoading: isLoadingAppointments,
    error: appointmentsError,
    refetch: refetchAppointments
  } = useAppointments(
    selectedClinicianId,
    fromDate,
    toDate,
    userTimeZone,
    appointmentRefreshTrigger
  );

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

  const handleDataChanged = () => {
    refetchAppointments();
    setAppointmentRefreshTrigger(prev => prev + 1);
  };

  const handleBlockTimeCreated = () => {
    console.log("[CalendarPage] Block time created, refreshing calendar...");
    handleDataChanged();
  };

  const handleOpenBlockTimeDialog = () => {
    if (!selectedClinicianId) {
      console.warn("[CalendarPage] WARNING: No clinician selected for block time");
    }
    
    setIsBlockTimeDialogOpen(true);
  };

  // Show loading state while timezone is loading
  if (isLoadingTimeZone || isLoadingClinicianTimeZone) {
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
};

export default CalendarPage;
