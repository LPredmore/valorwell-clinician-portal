
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import ReactBigCalendar from "@/components/calendar/ReactBigCalendar";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { TimeZoneService } from "@/utils/timeZoneService";
import { getClinicianTimeZone } from "@/hooks/useClinicianData";
import { DateTime } from "luxon";
import { useAppointments } from "@/hooks/useAppointments";
import { useNylasEvents } from "@/hooks/useNylasEvents";

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized, userRole } = useUser();
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [isMounted, setIsMounted] = useState(true);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Circuit breakers
  const authCheckCountRef = useRef(0);
  const timezoneLoadCountRef = useRef(0);
  const accessDeniedRef = useRef(false);

  // CRITICAL FIX: Synchronize date ranges using standard date-fns functions
  const { weekStart, weekEnd } = useMemo(() => {
    // Use standard date-fns functions to ensure consistency
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    
    console.log('[CalendarSimple] SYNCHRONIZED Week boundaries calculated:', {
      currentDate: currentDate.toISOString(),
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      weekStartLocal: start.toLocaleString(),
      weekEndLocal: end.toLocaleString(),
      calculatedUsing: 'date-fns startOfWeek/endOfWeek'
    });
    
    return {
      weekStart: start,
      weekEnd: end
    };
  }, [currentDate]);

  // Date Range Synchronization Debug Logging
  useEffect(() => {
    console.log('[CalendarSimple] Date Range Sync Check:', {
      appointmentsRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
      nylasRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
      rangesMatch: true, // They're the same variables now
      currentDate: currentDate.toISOString(),
      synchronizationMethod: 'Both hooks use identical weekStart/weekEnd variables'
    });
  }, [weekStart, weekEnd, currentDate]);

  // Fetch internal appointments - USING SYNCHRONIZED DATE RANGE
  const { appointments, isLoading: appointmentsLoading } = useAppointments(
    userId,
    weekStart,    // SYNCHRONIZED
    weekEnd,      // SYNCHRONIZED
    userTimeZone,
    0
  );

  // Fetch external calendar events (Nylas) - USING SYNCHRONIZED DATE RANGE
  const { events: nylasEvents, isLoading: nylasLoading } = useNylasEvents(
    weekStart,    // SYNCHRONIZED - SAME AS APPOINTMENTS
    weekEnd       // SYNCHRONIZED - SAME AS APPOINTMENTS
  );

  // Combine internal and external events
  const allEvents = useMemo(() => {
    const events = [];
    
    // Add internal appointments with proper source tagging
    if (appointments) {
      events.push(...appointments.map(apt => ({
        ...apt,
        source: 'internal',
        type: 'appointment',
        id: apt.id,
        title: apt.clientName || 'Internal Appointment',
        start_time: apt.start_at,
        end_time: apt.end_at,
        start: apt.start_at,
        end: apt.end_at
      })));
    }
    
    // Add Nylas events with proper source tagging  
    if (nylasEvents) {
      events.push(...nylasEvents.map(evt => ({
        ...evt,
        source: 'nylas',
        type: 'external',
        id: evt.id,
        start_time: evt.when?.start_time,
        end_time: evt.when?.end_time,
        start: evt.when?.start_time,
        end: evt.when?.end_time
      })));
    }

    console.log('[CalendarSimple] SYNCHRONIZED event merging:', {
      dateRangeUsed: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString()
      },
      internalEventsCount: appointments?.length || 0,
      externalEventsCount: nylasEvents?.length || 0,
      totalEventsCount: events.length,
      internalEvents: appointments?.map(e => ({ id: e.id, title: e.clientName, start: e.start_at })) || [],
      externalEvents: nylasEvents?.map(e => ({ id: e.id, title: e.title, start: e.when?.start_time })) || [],
      synchronizationStatus: 'SUCCESS - Both hooks use identical date ranges'
    });

    return events;
  }, [appointments, nylasEvents, weekStart, weekEnd]);

  // Debug logging for calendar state
  useEffect(() => {
    console.log('[CalendarSimple] Component state with SYNCHRONIZED dates:', {
      userId,
      appointmentsCount: appointments?.length || 0,
      nylasEventsCount: nylasEvents?.length || 0,
      allEventsCount: allEvents?.length || 0,
      appointmentsLoading,
      nylasLoading,
      userTimeZone,
      currentDate: currentDate.toISOString(),
      synchronizedWeekStart: weekStart.toISOString(),
      synchronizedWeekEnd: weekEnd.toISOString(),
      isReady,
      authInitialized,
      dateRangeSyncStatus: 'SYNCHRONIZED',
      appointments: appointments?.map(apt => ({
        id: apt.id,
        clientName: apt.clientName,
        start_at: apt.start_at,
        end_at: apt.end_at,
        type: apt.type
      })),
      nylasEvents: nylasEvents?.map(event => ({
        id: event.id,
        title: event.title,
        start_time: event.when?.start_time,
        connection_provider: event.connection_provider
      }))
    });
  }, [userId, appointments, nylasEvents, allEvents, appointmentsLoading, nylasLoading, userTimeZone, currentDate, weekStart, weekEnd, isReady, authInitialized]);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    setCurrentDate(prev => subWeeks(prev, 1));
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => addWeeks(prev, 1));
  }, []);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handle slot selection for new appointments
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    console.log('[CalendarSimple] Slot selected:', slotInfo);
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end
    });
    setShowAppointmentDialog(true);
  }, []);

  // Handle event click
  const handleSelectEvent = useCallback((event: any) => {
    console.log('[CalendarSimple] Event selected:', event);
    if (event.source === 'internal') {
      // Open appointment details/edit for internal appointments
      setSelectedSlot(event.resource || event);
      setShowAppointmentDialog(true);
    } else if (event.source === 'nylas') {
      // Show toast for external events
      toast({
        title: "External Event",
        description: `${event.title} - Synced from ${event.connection_provider}`,
      });
    }
  }, [toast]);

  // Handle new appointment button
  const handleNewAppointment = useCallback(() => {
    setSelectedSlot(null);
    setShowAppointmentDialog(true);
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
        <div className="p-6">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-6">
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
            <div className="text-sm text-gray-600">
              <p>
                Showing {allEvents.length} events | 
                Internal: {appointments?.length || 0} | 
                External: {nylasEvents?.length || 0}
              </p>
              <p>Timezone: {userTimeZone}</p>
            </div>
          </div>

          {/* React Big Calendar */}
          <ReactBigCalendar
            events={allEvents}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
          />

          {/* Appointment Dialog */}
          {showAppointmentDialog && (
            <AppointmentDialog
              isOpen={showAppointmentDialog}
              onClose={() => {
                setShowAppointmentDialog(false);
                setSelectedSlot(null);
              }}
              initialData={selectedSlot}
            />
          )}
        </div>
      </CalendarErrorBoundary>
    </Layout>
  );
});

CalendarSimple.displayName = 'CalendarSimple';

export default CalendarSimple;
