import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import WeeklyCalendarGrid from "../components/calendar/WeeklyCalendarGrid";
import AvailabilityManagementSidebar from "../components/calendar/AvailabilityManagementSidebar";
import AppointmentDialog from "../components/calendar/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { TimeZoneService } from "@/utils/timeZoneService";
import { getClinicianTimeZone } from "@/hooks/useClinicianData";
import { DateTime } from "luxon";
import { useAppointments } from "@/hooks/useAppointments";

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized, userRole } = useUser();
  const [isReady, setIsReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [isMounted, setIsMounted] = useState(true);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<{
    date?: DateTime;
    startTime?: DateTime;
    endTime?: DateTime;
  }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Circuit breaker to prevent infinite loops
  const authCheckCountRef = useRef(0);
  const timezoneLoadCountRef = useRef(0);
  const accessDeniedRef = useRef(false);

  // FIXED: Calculate week range using UTC for consistency
  const { weekStart, weekEnd } = useMemo(() => {
    // Use UTC to avoid timezone boundary issues
    const current = DateTime.fromJSDate(currentDate, { zone: 'utc' });
    const weekStartUTC = current.startOf('week'); // Monday
    const weekEndUTC = current.endOf('week');     // Sunday
    
    console.log('[CalendarSimple] FIXED Week boundaries calculated in UTC:', {
      currentDate: currentDate.toISOString(),
      weekStart: weekStartUTC.toJSDate().toISOString(),
      weekEnd: weekEndUTC.toJSDate().toISOString(),
      calculatedInUTC: true
    });
    
    return {
      weekStart: weekStartUTC.toJSDate(),
      weekEnd: weekEndUTC.toJSDate()
    };
  }, [currentDate]);

  // Add appointments data using the FIXED useAppointments hook
  const { appointments, isLoading: appointmentsLoading } = useAppointments(
    userId,
    weekStart,  // Pass explicit week boundaries
    weekEnd,
    userTimeZone,
    0 // No refresh trigger for now
  );

  // Debug logging for calendar state
  useEffect(() => {
    console.log('[CalendarSimple] Component state:', {
      userId,
      appointmentsCount: appointments?.length || 0,
      appointmentsLoading,
      userTimeZone,
      currentDate: currentDate.toISOString(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      isReady,
      authInitialized
    });
  }, [userId, appointments, appointmentsLoading, userTimeZone, currentDate, weekStart, weekEnd, isReady, authInitialized]);

  // Memoize navigation functions to prevent re-renders
  const navigatePrevious = useCallback(() => {
    setCurrentDate(prev => subWeeks(prev, 1));
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => addWeeks(prev, 1));
  }, []);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Stabilized access control handler with circuit breaker
  const handleAccessDenied = useCallback((message: string) => {
    if (!isMounted || accessDeniedRef.current) return;
    
    accessDeniedRef.current = true;
    toast({
      title: "Access Denied",
      description: message,
      variant: "destructive"
    });
  }, [toast, isMounted]);

  // Stabilized timezone loading function with circuit breaker
  const loadUserTimeZone = useCallback(async (clinicianId: string) => {
    if (!isMounted || timezoneLoadCountRef.current >= 3) return;
    
    timezoneLoadCountRef.current++;
    
    try {
      console.log('[CalendarSimple] Loading timezone for:', clinicianId);
      const timeZone = await getClinicianTimeZone(clinicianId);
      
      if (!isMounted) return; // Check again after async operation
      
      setUserTimeZone(TimeZoneService.ensureIANATimeZone(timeZone));
    } catch (error) {
      console.error('[CalendarSimple] Error loading user timezone:', error);
      if (isMounted) {
        // Fallback to browser timezone
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserTimeZone(TimeZoneService.ensureIANATimeZone(browserTimezone));
      }
    }
  }, [isMounted]);

  // Handle availability click (opens appointment dialog)
  const handleAvailabilityClick = useCallback((date: DateTime, startTime: DateTime, endTime: DateTime) => {
    console.log('[CalendarSimple] Availability clicked:', { date, startTime, endTime });
    setSelectedDateTime({
      date,
      startTime,
      endTime
    });
    setShowAppointmentDialog(true);
  }, []);

  // Handle appointment click
  const handleAppointmentClick = useCallback((appointment: any) => {
    console.log('[CalendarSimple] Appointment clicked:', appointment);
    // TODO: Implement appointment details modal or editing
    toast({
      title: "Appointment Details",
      description: `${appointment.clientName} - ${appointment.type}`,
    });
  }, [toast]);

  // Handle new appointment button
  const handleNewAppointment = useCallback(() => {
    setSelectedDateTime({});
    setShowAppointmentDialog(true);
  }, []);

  // Handle appointment created
  const handleAppointmentCreated = useCallback(() => {
    // Force refresh of appointments by updating a trigger
    console.log('[CalendarSimple] Appointment created successfully');
    // The useAppointments hook will automatically refresh due to its query invalidation
  }, []);

  // Component mounting effect
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Primary auth effect - SEPARATED with circuit breaker
  useEffect(() => {
    if (!authInitialized || authCheckCountRef.current >= 3) return;
    
    authCheckCountRef.current++;
    console.log('[CalendarSimple] Auth check #', authCheckCountRef.current, { authInitialized, userId, userRole });
    
    if (!userId) {
      console.log('[CalendarSimple] No user found, redirecting to login');
      handleAccessDenied("Please log in to access the calendar");
      setTimeout(() => navigate('/login'), 100);
      return;
    }
    
    if (userRole === 'client') {
      console.log('[CalendarSimple] Client user detected, redirecting to portal');
      handleAccessDenied("This calendar is for clinicians only. Redirecting to client portal.");
      setTimeout(() => navigate('/portal'), 100);
      return;
    }
    
    if (userRole === 'clinician' || userRole === 'admin') {
      console.log('[CalendarSimple] Authorized user, setting ready');
      setIsReady(true);
    }
  }, [authInitialized, userId, userRole, navigate, handleAccessDenied]);

  // Timezone loading effect - SEPARATED with circuit breaker
  useEffect(() => {
    if (!isReady || !userId || !isMounted || timezoneLoadCountRef.current >= 3) return;
    
    console.log('[CalendarSimple] Loading timezone for ready user:', userId);
    loadUserTimeZone(userId);
  }, [isReady, userId, isMounted, loadUserTimeZone]);

  // Memoized display values
  const currentMonthDisplay = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  }, [currentDate]);

  // Early returns for loading states
  if (!authInitialized) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Initializing authentication...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!userId) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <p className="text-lg font-medium">Authentication Required</p>
                <p className="text-sm">Please log in to access the calendar</p>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isReady) {
    return (
      <Layout>
        <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading calendar...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <CalendarErrorBoundary>
        <div className="space-y-6">
          {/* Header with navigation */}
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
              <Button onClick={handleNewAppointment}>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {currentMonthDisplay}
            </h1>
            <div className="text-sm text-gray-500">
              User: {userRole} | Timezone: {userTimeZone} | Appointments: {appointments?.length || 0} | Week: {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar display */}
            <div className="lg:col-span-3">
              <WeeklyCalendarGrid
                currentDate={currentDate}
                clinicianId={userId}
                userTimeZone={userTimeZone}
                onAvailabilityClick={handleAvailabilityClick}
                onAppointmentClick={handleAppointmentClick}
              />
            </div>

            {/* Availability management sidebar */}
            <div className="lg:col-span-1">
              <AvailabilityManagementSidebar
                clinicianId={userId}
                userTimeZone={userTimeZone}
              />
            </div>
          </div>
        </div>

        {/* Appointment Dialog */}
        <AppointmentDialog
          isOpen={showAppointmentDialog}
          onClose={() => setShowAppointmentDialog(false)}
          clinicianId={userId}
          clinicianTimeZone={userTimeZone}
          selectedDate={selectedDateTime.date}
          selectedStartTime={selectedDateTime.startTime}
          selectedEndTime={selectedDateTime.endTime}
          onAppointmentCreated={handleAppointmentCreated}
        />
      </CalendarErrorBoundary>
    </Layout>
  );
});

CalendarSimple.displayName = 'CalendarSimple';

export default CalendarSimple;
