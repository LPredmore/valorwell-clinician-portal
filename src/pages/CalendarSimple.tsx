
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import ReactBigCalendar from "@/components/calendar/ReactBigCalendar";
import AppointmentDialog from "@/components/calendar/AppointmentDialog";
import BlockTimeDialog from "@/components/calendar/BlockTimeDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { TimeZoneService } from "@/utils/timeZoneService";
import { getClinicianTimeZone } from "@/hooks/useClinicianData";
import { DateTime } from "luxon";
import { useAppointments } from "@/hooks/useAppointments";
import { useNylasEvents } from "@/hooks/useNylasEvents";
import { useClinicianAvailability } from "@/hooks/useClinicianAvailability";
import { useBlockedTime } from "@/hooks/useBlockedTime";
import { buildLocalDate } from "@/utils/dateUtils";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import AvailabilityManagementSidebar from "@/components/calendar/AvailabilityManagementSidebar";
import CalendarConnectionsPanel from "@/components/calendar/CalendarConnectionsPanel";
import CalendarLegend from "../components/calendar/CalendarLegend";

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized, userRole } = useUser();
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [isMounted, setIsMounted] = useState(true);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showBlockTimeDialog, setShowBlockTimeDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Circuit breakers
  const authCheckCountRef = useRef(0);
  const timezoneLoadCountRef = useRef(0);
  const accessDeniedRef = useRef(false);

  // SYNCHRONIZED date ranges using standard date-fns functions
  const { weekStart, weekEnd } = useMemo(() => {
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
      blockedTimeRange: { start: weekStart.toISOString(), end: weekEnd.toISOString() },
      rangesMatch: true,
      currentDate: currentDate.toISOString(),
      synchronizationMethod: 'All hooks use identical weekStart/weekEnd variables'
    });
  }, [weekStart, weekEnd, currentDate]);

  // Fetch clean internal appointments - USING SYNCHRONIZED DATE RANGE
  const { appointments, isLoading: appointmentsLoading } = useAppointments(
    userId,
    weekStart,
    weekEnd,
    userTimeZone,
    refreshTrigger
  );

  // Fetch external calendar events (Nylas) - USING SYNCHRONIZED DATE RANGE
  const { events: nylasEvents, isLoading: nylasLoading } = useNylasEvents(
    weekStart,
    weekEnd
  );

  // Fetch blocked times - USING SYNCHRONIZED DATE RANGE
  const { blockedTimes, isLoading: blockedTimesLoading } = useBlockedTime(
    userId || '',
    weekStart,
    weekEnd
  );

  // Fetch availability slots
  const availabilitySlots = useClinicianAvailability(userId);

  // Transform availability slots into calendar events with timezone-aware conversion
  const availabilityEvents = useMemo(() => {
    if (!availabilitySlots.length || !userTimeZone) return [];
    
    console.log('[CalendarSimple] Processing availability slots with timezone fix:', {
      slotsCount: availabilitySlots.length,
      slots: availabilitySlots,
      weekStart: weekStart.toISOString(),  
      weekEnd: weekEnd.toISOString(),
      userTimeZone
    });
    
    // Generate all dates in the week range
    const dates = [];
    let cursor = DateTime.fromJSDate(weekStart).startOf('day');
    const endDate = DateTime.fromJSDate(weekEnd).startOf('day');
    while (cursor <= endDate) {
      dates.push(cursor);
      cursor = cursor.plus({ days: 1 });
    }

    console.log('[CalendarSimple] Generated dates for availability:', dates.map(d => d.toISODate()));

    const events = availabilitySlots.flatMap(slot => {
      // Match slot.day to weekday number (1=Monday … 7=Sunday)
      const weekdayMap = { 
        monday: 1, tuesday: 2, wednesday: 3, thursday: 4, 
        friday: 5, saturday: 6, sunday: 7 
      };
      
      return dates
        .filter(d => d.weekday === weekdayMap[slot.day])
        .map(d => {
          // Build DateTimes in clinician timezone
          const startDT = DateTime.fromISO(`${d.toISODate()}T${slot.startTime}`, { zone: userTimeZone });
          const endDT = DateTime.fromISO(`${d.toISODate()}T${slot.endTime}`, { zone: userTimeZone });
          
          console.log('[CalendarSimple] Creating availability event with timezone fix:', {
            slotDay: slot.day,
            dateWeekday: d.weekday,
            date: d.toISODate(),
            startTime: slot.startTime,
            endTime: slot.endTime,
            startDateTime: startDT.toISO(),
            endDateTime: endDT.toISO(),
            startLocalDate: buildLocalDate(startDT).toISOString(),
            endLocalDate: buildLocalDate(endDT).toISOString(),
            timezone: userTimeZone
          });
          
          return {
            id: `avail-${slot.day}-${slot.slot}-${d.toISODate()}`,
            title: 'Available',
            start: buildLocalDate(startDT),
            end: buildLocalDate(endDT),
            source: 'availability',
            type: 'availability',
            resource: slot
          };
        });
    });

    console.log('[CalendarSimple] Generated availability events with timezone fix:', {
      eventsCount: events.length,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start.toISOString(),
        end: e.end.toISOString()
      }))
    });

    return events;
  }, [availabilitySlots, weekStart, weekEnd, userTimeZone]);

  // Transform blocked times into calendar events
  const blockedTimeEvents = useMemo(() => {
    if (!blockedTimes.length || !userTimeZone) return [];
    
    console.log('[CalendarSimple] Processing blocked times:', {
      blockedTimesCount: blockedTimes.length,
      blockedTimes: blockedTimes.map(bt => ({
        id: bt.id,
        label: bt.label,
        start_at: bt.start_at,
        end_at: bt.end_at,
        timezone: bt.timezone
      })),
      userTimeZone
    });

    const events = blockedTimes.map(blockedTime => {
      // Parse the UTC timestamps and convert to clinician's timezone
      const startDT = DateTime.fromISO(blockedTime.start_at, { zone: 'UTC' })
        .setZone(blockedTime.timezone || userTimeZone);
      const endDT = DateTime.fromISO(blockedTime.end_at, { zone: 'UTC' })
        .setZone(blockedTime.timezone || userTimeZone);

      console.log('[CalendarSimple] Creating blocked time event:', {
        id: blockedTime.id,
        label: blockedTime.label,
        originalStartUTC: blockedTime.start_at,
        originalEndUTC: blockedTime.end_at,
        blockedTimeTimezone: blockedTime.timezone,
        userTimezone: userTimeZone,
        convertedStart: startDT.toISO(),
        convertedEnd: endDT.toISO(),
        localDateStart: buildLocalDate(startDT).toISOString(),
        localDateEnd: buildLocalDate(endDT).toISOString()
      });

      return {
        id: blockedTime.id,
        title: blockedTime.label,
        start: buildLocalDate(startDT),
        end: buildLocalDate(endDT),
        source: 'blocked_time',
        type: 'blocked_time',
        resource: blockedTime
      };
    });

    console.log('[CalendarSimple] Generated blocked time events:', {
      eventsCount: events.length,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start.toISOString(),
        end: e.end.toISOString()
      }))
    });

    return events;
  }, [blockedTimes, userTimeZone]);

  // Refresh callback for data changes
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Combine clean internal, external, blocked time, and availability events
  const allEvents = useMemo(() => {
    const events = [];
    
    // Add clean internal appointments
    if (appointments) {
      events.push(...appointments.map(apt => {
        const title = apt.clientName || 'Internal Appointment';

        // Parse ISO string explicitly as UTC, then convert to clinician's zone
        const apptDTStart = DateTime.fromISO(apt.start_at, { zone: 'UTC' })
          .setZone(apt.appointment_timezone || userTimeZone);
        const apptDTEnd = DateTime.fromISO(apt.end_at, { zone: 'UTC' })
          .setZone(apt.appointment_timezone || userTimeZone);

        console.log('[CalendarSimple] Processing clean appointment:', {
          appointmentId: apt.id,
          clientName: apt.clientName,
          originalStartUTC: apt.start_at,
          originalEndUTC: apt.end_at,
          appointmentTimezone: apt.appointment_timezone,
          userTimezone: userTimeZone,
          parsedAsUTC_Start: DateTime.fromISO(apt.start_at, { zone: 'UTC' }).toISO(),
          parsedAsUTC_End: DateTime.fromISO(apt.end_at, { zone: 'UTC' }).toISO(),
          convertedToClinicianTZ_Start: apptDTStart.toISO(),
          convertedToClinicianTZ_End: apptDTEnd.toISO(),
          localDateStart: buildLocalDate(apptDTStart).toISOString(),
          localDateEnd: buildLocalDate(apptDTEnd).toISOString(),
          status: 'CLEAN - No legacy blocked time processing'
        });

        return {
          ...apt,
          source: 'internal',
          type: 'appointment',
          id: apt.id,
          title: title,
          start: buildLocalDate(apptDTStart),
          end: buildLocalDate(apptDTEnd),
          resource: apt
        };
      }));
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

    // Add blocked time events (from dedicated blocked_time table)
    events.push(...blockedTimeEvents);

    // Add availability events
    events.push(...availabilityEvents);

    console.log('[CalendarSimple] Clean event merging completed:', {
      dateRangeUsed: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString()
      },
      internalEventsCount: appointments?.length || 0,
      externalEventsCount: nylasEvents?.length || 0,
      blockedTimeEventsCount: blockedTimeEvents.length,
      availabilityEventsCount: availabilityEvents.length,
      totalEventsCount: events.length,
      cleanupStatus: 'SUCCESS - All legacy patterns removed'
    });

    return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [appointments, nylasEvents, blockedTimeEvents, availabilityEvents, weekStart, weekEnd, userTimeZone]);

  // Debug logging for calendar state
  useEffect(() => {
    console.log('[CalendarSimple] Clean component state:', {
      userId,
      appointmentsCount: appointments?.length || 0,
      nylasEventsCount: nylasEvents?.length || 0,
      blockedTimesCount: blockedTimes?.length || 0,
      allEventsCount: allEvents?.length || 0,
      appointmentsLoading,
      nylasLoading,
      blockedTimesLoading,
      userTimeZone,
      currentDate: currentDate.toISOString(),
      synchronizedWeekStart: weekStart.toISOString(),
      synchronizedWeekEnd: weekEnd.toISOString(),
      isReady,
      authInitialized,
      cleanupStatus: 'COMPLETE - Legacy code removed'
    });
  }, [userId, appointments, nylasEvents, blockedTimes, allEvents, appointmentsLoading, nylasLoading, blockedTimesLoading, userTimeZone, currentDate, weekStart, weekEnd, isReady, authInitialized]);

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
    setEditingAppointment(null);
    setIsEditMode(false);
    setShowAppointmentDialog(true);
  }, []);

  // Handle event click - clean implementation
  const handleSelectEvent = useCallback((event: any) => {
    console.log('[CalendarSimple] Event selected:', event);
    if (event.source === 'internal') {
      // Handle regular appointments
      setEditingAppointment(event.resource || event);
      setSelectedSlot({
        start: event.start || new Date(event.start_at),
        end: event.end || new Date(event.end_at)
      });
      setIsEditMode(true);
      setShowAppointmentDialog(true);
    } else if (event.source === 'nylas') {
      // Show toast for external events
      toast({
        title: "📅 External Event",
        description: `${event.title} - Synced from ${event.connection_provider || 'external calendar'}`,
        duration: 3000,
      });
    } else if (event.source === 'blocked_time') {
      // Handle clicks on blocked time events from dedicated table
      const blockLabel = event.title || 'Blocked Time';
      toast({
        title: "🚫 Blocked Time",
        description: `${blockLabel} - This time slot is blocked and unavailable for appointments`,
        duration: 4000,
      });
      
      console.log('[CalendarSimple] Blocked time clicked:', {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        source: event.source,
        resource: event.resource
      });
    } else if (event.source === 'availability') {
      // Enhanced availability feedback
      toast({
        title: "✅ Available Time",
        description: `Available slot: ${event.resource.startTime} - ${event.resource.endTime}. Click 'New Appointment' to book this time.`,
        duration: 3000,
      });
    }
  }, [toast]);

  // Handle new appointment button
  const handleNewAppointment = useCallback(() => {
    setSelectedSlot(null);
    setEditingAppointment(null);
    setIsEditMode(false);
    setShowAppointmentDialog(true);
  }, []);

  // Clean block time handler
  const handleBlockTime = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(`[CalendarSimple] ${timestamp} Clean handleBlockTime called with userId:`, {
      userId,
      type: typeof userId,
      isNull: userId === null,
      isUndefined: userId === undefined,
      isReady,
      authInitialized,
      userRole
    });

    // Validate user ID before opening dialog
    if (!userId) {
      console.error(`[CalendarSimple] ${timestamp} Cannot open BlockTimeDialog - userId is null/undefined`);
      toast({
        title: "Error",
        description: "No user ID available. Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    if (typeof userId !== 'string') {
      console.error(`[CalendarSimple] ${timestamp} Invalid userId type:`, {
        userId,
        type: typeof userId
      });
      toast({
        title: "Error", 
        description: "Invalid user ID format. Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    if (userId.trim() === '') {
      console.error(`[CalendarSimple] ${timestamp} userId is empty string`);
      toast({
        title: "Error",
        description: "Empty user ID. Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error(`[CalendarSimple] ${timestamp} userId is not a valid UUID:`, userId);
      toast({
        title: "Error",
        description: "Invalid user ID format. Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    console.log(`[CalendarSimple] ${timestamp} Opening clean BlockTimeDialog with valid userId:`, userId);
    setShowBlockTimeDialog(true);
  }, [userId, isReady, authInitialized, userRole, toast]);

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

  // Primary auth effect with circuit breaker
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

  // Timezone loading effect with circuit breaker
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
          {/* Header with navigation and controls */}
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
              
              {/* New Appointment Button */}
              <Button onClick={handleNewAppointment}>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>

              {/* Block Time Button */}
              <Button variant="outline" onClick={handleBlockTime}>
                <Clock className="h-4 w-4 mr-2" />
                Block Time
              </Button>

              {/* Availability Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    Availability
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Manage Availability</SheetTitle>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    {/* Availability Management */}
                    <AvailabilityManagementSidebar
                      clinicianId={userId}
                      userTimeZone={userTimeZone}
                    />

                    {/* Calendar Connections */}
                    <CalendarConnectionsPanel />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800">
              {currentMonthDisplay}
            </h1>
            
            <div className="text-sm text-gray-600 text-right">
              <p>
                Showing {allEvents.length} events | 
                Internal: {appointments?.length || 0} | 
                External: {nylasEvents?.length || 0} | 
                Blocked: {blockedTimeEvents.length} |
                Available: {availabilityEvents.length}
              </p>
              <p>Timezone: {userTimeZone}</p>
              {/* Debug info for development */}
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-blue-600">Debug: UserID: {userId}</p>
              )}
            </div>
          </div>

          {/* Calendar Legend */}
          <CalendarLegend
            blockedCount={blockedTimeEvents.length}
            internalCount={appointments?.length || 0}
            externalCount={nylasEvents?.length || 0}
            availableCount={availabilityEvents.length}
          />

          {/* React Big Calendar */}
          <ReactBigCalendar
            events={allEvents}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
          />

          {/* Calendar-specific Appointment Dialog */}
          {showAppointmentDialog && (
            <AppointmentDialog
              isOpen={showAppointmentDialog}
              onClose={() => {
                setShowAppointmentDialog(false);
                setSelectedSlot(null);
                setEditingAppointment(null);
                setIsEditMode(false);
              }}
              clinicianId={userId}
              clinicianTimeZone={userTimeZone}
              selectedDate={selectedSlot?.start ? DateTime.fromJSDate(selectedSlot.start) : undefined}
              selectedStartTime={selectedSlot?.start ? DateTime.fromJSDate(selectedSlot.start).toFormat('HH:mm') : undefined}
              selectedEndTime={selectedSlot?.end ? DateTime.fromJSDate(selectedSlot.end).toFormat('HH:mm') : undefined}
              existingAppointment={isEditMode ? editingAppointment : undefined}
              onAppointmentCreated={triggerRefresh}
              onAppointmentUpdated={triggerRefresh}
              onAppointmentDeleted={triggerRefresh}
            />
          )}

          {/* Block Time Dialog */}
          {showBlockTimeDialog && (
            <BlockTimeDialog
              isOpen={showBlockTimeDialog}
              onClose={() => setShowBlockTimeDialog(false)}
              selectedClinicianId={userId}
              onBlockCreated={triggerRefresh}
            />
          )}
        </div>
      </CalendarErrorBoundary>
    </Layout>
  );
});

export default CalendarSimple;
