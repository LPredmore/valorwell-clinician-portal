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
  console.log('[CalendarPage] Component initializing...');
  
  // Get the logged-in user's ID
  const { userId } = useUser();
  console.log('[CalendarPage] User ID:', userId);

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
        console.log('[CalendarPage] Fetched clinician timezone:', resolvedTimezone);
      } catch (error) {
        console.error('[CalendarPage] Error fetching clinician timezone:', error);
        setClinicianTimeZone(userTimeZone); // Fallback to user timezone
      } finally {
        setIsLoadingClinicianTimeZone(false);
      }
    };

    fetchClinicianTimeZone();
  }, [selectedClinicianId, userTimeZone]);
  
  console.log('[CalendarPage] Calendar state:', {
    selectedClinicianId,
    userTimeZone,
    clinicianTimeZone,
    isLoadingTimeZone,
    isLoadingClinicianTimeZone,
    currentDate: currentDate?.toISOString(),
    appointmentRefreshTrigger
  });
  
  // Calculate date range for debugging
  const fromDate = subWeeks(currentDate, 4);
  const toDate = addWeeks(currentDate, 8);
  
  // STEP 1: DETAILED LOGGING FOR useAppointments HOOK PARAMETERS
  console.log('[CalendarPage] STEP 1 - useAppointments Hook Parameters:', {
    selectedClinicianId,
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    userTimeZone,
    appointmentRefreshTrigger,
    currentDate: currentDate.toISOString(),
    dateRangeDays: Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  });
  
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

  // STEP 1: DETAILED LOGGING FOR useAppointments HOOK RESULTS
  console.log('[CalendarPage] STEP 1 - useAppointments Hook Results:', {
    appointmentsCount: appointments?.length || 0,
    appointmentsArray: appointments,
    isLoadingAppointments,
    appointmentsError: appointmentsError?.message || null,
    hasError: !!appointmentsError,
    isDataEmpty: !appointments || appointments.length === 0
  });

  // STEP 1: LOG DETAILED APPOINTMENT DATA IF ANY EXISTS
  if (appointments && appointments.length > 0) {
    console.log('[CalendarPage] STEP 1 - Detailed Appointment Data:', {
      totalCount: appointments.length,
      firstThreeAppointments: appointments.slice(0, 3).map(apt => ({
        id: apt.id,
        client_id: apt.client_id,
        clinician_id: apt.clinician_id,
        start_at: apt.start_at,
        end_at: apt.end_at,
        appointment_timezone: apt.appointment_timezone,
        clientName: apt.clientName,
        status: apt.status,
        type: apt.type
      })),
      allClinicianIds: [...new Set(appointments.map(apt => apt.clinician_id))],
      dateRange: {
        earliest: Math.min(...appointments.map(apt => new Date(apt.start_at).getTime())),
        latest: Math.max(...appointments.map(apt => new Date(apt.start_at).getTime()))
      }
    });
  } else {
    console.log('[CalendarPage] STEP 1 - NO APPOINTMENTS FOUND - Detailed Analysis:', {
      selectedClinicianId,
      isClinicianIdValid: !!selectedClinicianId,
      isClinicianIdUUID: selectedClinicianId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedClinicianId) : false,
      queryDateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        includesCurrentWeek: fromDate <= currentDate && currentDate <= toDate
      },
      hookState: {
        isLoading: isLoadingAppointments,
        hasError: !!appointmentsError,
        errorMessage: appointmentsError?.message
      }
    });
  }

  console.log('[CalendarPage] Appointments hook result:', {
    appointmentsCount: appointments?.length || 0,
    isLoadingAppointments,
    appointmentsError: appointmentsError?.message || null
  });

  // Log key information for debugging
  useEffect(() => {
    console.log("[CalendarPage] Calendar initialized:", {
      userTimeZone,
      clinicianTimeZone,
      currentDate: currentDate?.toISOString(),
      selectedClinicianId,
      appointmentsCount: appointments?.length || 0,
      refreshTrigger: appointmentRefreshTrigger
    });
    
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
  }, [appointments, userTimeZone, clinicianTimeZone, currentDate, selectedClinicianId, appointmentRefreshTrigger]);

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
    console.log("[CalendarPage] Data changed, refreshing calendar...");
    refetchAppointments();
    setAppointmentRefreshTrigger(prev => prev + 1);
  };

  const handleBlockTimeCreated = () => {
    console.log("[CalendarPage] Block time created, refreshing calendar...");
    
    // Add debugging for block time creation
    console.log("[CalendarPage] DEBUG: Block time creation callback triggered", {
      selectedClinicianId,
      currentDate: currentDate?.toISOString(),
      refreshTrigger: appointmentRefreshTrigger,
      timestamp: new Date().toISOString()
    });
    
    handleDataChanged();
  };

  // Enhanced block time dialog open handler with debugging
  const handleOpenBlockTimeDialog = () => {
    console.log("[CalendarPage] DEBUG: Opening block time dialog", {
      selectedClinicianId,
      isClinicianSelected: !!selectedClinicianId,
      currentDate: currentDate?.toISOString(),
      userTimeZone,
      timestamp: new Date().toISOString()
    });
    
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
