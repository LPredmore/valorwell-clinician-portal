import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import ReactBigCalendar from "@/components/calendar/ReactBigCalendar";
import AppointmentDialog from "@/components/calendar/AppointmentDialog";
import BlockTimeDialog from "@/components/calendar/BlockTimeDialog";
import EditBlockedTimeDialog from "@/components/calendar/EditBlockedTimeDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
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
import { getWeekRange, logWeekNavigation } from "@/utils/dateRangeUtils";

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized, userRole } = useUser();
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [isMounted, setIsMounted] = useState(true);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showBlockTimeDialog, setShowBlockTimeDialog] = useState(false);
  const [showEditBlockedDialog, setShowEditBlockedDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editingBlockedTime, setEditingBlockedTime] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Circuit breakers
  const authCheckCountRef = useRef(0);
  const timezoneLoadCountRef = useRef(0);
  const accessDeniedRef = useRef(false);

  // Enhanced week boundary calculation with timezone awareness using utility function
  const { weekStart, weekEnd } = useMemo(() => {
    const tz = userTimeZone || TimeZoneService.DEFAULT_TIMEZONE;
    const range = getWeekRange(currentDate, tz);
    
    logWeekNavigation(range.start, range.end, tz);
    
    return {
      weekStart: range.start,
      weekEnd: range.end
    };
  }, [currentDate, userTimeZone]);

  // Enhanced date range synchronization logging
  useEffect(() => {
    console.group('📅 Date Range Synchronization');
    console.log('Current Date:', currentDate.toISOString());
    console.log('User Timezone:', userTimeZone);
    console.log('Week Start:', weekStart.toISOString());
    console.log('Week End:', weekEnd.toISOString());
    console.log('Navigation controlled by React Big Calendar');
    console.groupEnd();
  }, [weekStart, weekEnd, currentDate, userTimeZone]);

  // Fetch clean internal appointments
  const { appointments, isLoading: appointmentsLoading } = useAppointments(
    userId,
    weekStart,
    weekEnd,
    userTimeZone,
    refreshTrigger
  );

  // Fetch external calendar events (Nylas)
  const { events: nylasEvents, isLoading: nylasLoading } = useNylasEvents(
    weekStart,
    weekEnd
  );

  // Fetch blocked times with proper temporal overlap and refresh trigger
  const { blockedTimes, isLoading: blockedTimesLoading } = useBlockedTime(
    userId || '',
    weekStart,
    weekEnd,
    refreshTrigger
  );

  // Fetch availability slots
  const availabilitySlots = useClinicianAvailability(userId);

  // Transform availability slots with FIXED timezone-aware date projection - NO buildLocalDate
  const availabilityEvents = useMemo(() => {
    if (!availabilitySlots.length || !userTimeZone) {
      console.log('[CalendarSimple] No availability slots or timezone, returning empty array');
      return [];
    }
    
    console.log('[CalendarSimple] Processing availability with DIRECT DateTime conversion (no buildLocalDate):', {
      slotsCount: availabilitySlots.length,
      slots: availabilitySlots,
      userTimeZone,
      weekStartUTC: weekStart.toISOString(),
      weekEndUTC: weekEnd.toISOString()
    });
    
    // Use clinician's timezone for all date math
    const tz = userTimeZone;
    const startDT = DateTime.fromJSDate(weekStart).setZone(tz).startOf('day');
    const endDT = DateTime.fromJSDate(weekEnd).setZone(tz).startOf('day');
    
    // Generate dates in clinician's timezone
    const dates = [];
    let cursor = startDT;
    
    while (cursor <= endDT) {
      dates.push(cursor);
      cursor = cursor.plus({ days: 1 });
    }

    console.log('[CalendarSimple] Date projection in clinician timezone:', {
      timezonUsed: tz,
      generatedDates: dates.map(d => ({
        date: d.toISODate(),
        weekday: d.weekday,
        weekdayName: d.weekdayShort
      })),
      dateCount: dates.length
    });

    const weekdayMap = { 
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4, 
      friday: 5, saturday: 6, sunday: 7 
    };

    const events = availabilitySlots.flatMap(slot => {
      const matchedDates = dates.filter(d => d.weekday === weekdayMap[slot.day]);
      
      return matchedDates.map(d => {
        // Build DateTimes in clinician timezone
        const startDT = DateTime.fromISO(`${d.toISODate()}T${slot.startTime}`, { zone: tz });
        const endDT = DateTime.fromISO(`${d.toISODate()}T${slot.endTime}`, { zone: tz });
        
        console.log('[CalendarSimple] Availability event creation with DIRECT conversion:', {
          slotDay: slot.day,
          dateWeekday: d.weekday,
          date: d.toISODate(),
          startTime: slot.startTime,
          endTime: slot.endTime,
          startDateTime: startDT.toISO(),
          endDateTime: endDT.toISO(),
          startJSDate: startDT.toJSDate().toISOString(),
          endJSDate: endDT.toJSDate().toISOString(),
          timezone: tz
        });
        
        return {
          id: `avail-${slot.day}-${slot.slot}-${d.toISODate()}`,
          title: 'Available',
          start: startDT.toJSDate(), // DIRECT conversion - no buildLocalDate
          end: endDT.toJSDate(), // DIRECT conversion - no buildLocalDate
          source: 'availability',
          type: 'availability',
          resource: slot
        };
      });
    });

    console.log('[CalendarSimple] Availability events generation completed with DIRECT conversion:', {
      eventsCount: events.length,
      weekRange: `${startDT.toISODate()} to ${endDT.toISODate()}`,
      timezone: tz,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start.toISOString(),
        end: e.end.toISOString()
      }))
    });

    return events;
  }, [availabilitySlots, weekStart, weekEnd, userTimeZone]);

  // Transform blocked times with FIXED timezone handling - NO buildLocalDate
  const blockedTimeEvents = useMemo(() => {
    if (!blockedTimes.length || !userTimeZone) {
      console.log('[CalendarSimple] No blocked times or timezone');
      return [];
    }
    
    console.log('[CalendarSimple] Processing blocked times with DIRECT DateTime conversion:', {
      blockedTimesCount: blockedTimes.length,
      userTimeZone,
      weekRange: `${weekStart.toISOString()} to ${weekEnd.toISOString()}`,
      blockedTimes: blockedTimes.map(bt => ({
        id: bt.id,
        label: bt.label,
        start_at: bt.start_at,
        end_at: bt.end_at,
        timezone: bt.timezone
      }))
    });

    const events = blockedTimes.map(blockedTime => {
      // Parse the UTC timestamps and convert to clinician's timezone
      const startDT = DateTime.fromISO(blockedTime.start_at, { zone: 'UTC' })
        .setZone(blockedTime.timezone || userTimeZone);
      const endDT = DateTime.fromISO(blockedTime.end_at, { zone: 'UTC' })
        .setZone(blockedTime.timezone || userTimeZone);

      console.log('[CalendarSimple] Blocked time event creation with DIRECT conversion:', {
        id: blockedTime.id,
        label: blockedTime.label,
        originalStartUTC: blockedTime.start_at,
        originalEndUTC: blockedTime.end_at,
        blockedTimeTimezone: blockedTime.timezone,
        userTimezone: userTimeZone,
        convertedStart: startDT.toISO(),
        convertedEnd: endDT.toISO(),
        startJSDate: startDT.toJSDate().toISOString(),
        endJSDate: endDT.toJSDate().toISOString()
      });

      return {
        id: blockedTime.id,
        title: blockedTime.label,
        start: startDT.toJSDate(), // DIRECT conversion - no buildLocalDate
        end: endDT.toJSDate(), // DIRECT conversion - no buildLocalDate
        source: 'blocked_time',
        type: 'blocked_time',
        resource: blockedTime
      };
    });

    console.log('[CalendarSimple] Blocked time events generation completed with DIRECT conversion:', {
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
    console.log('[CalendarSimple] Refresh triggered - will refetch all data sources');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle navigation from React Big Calendar
  const handleCalendarNavigate = useCallback((newDate: Date) => {
    console.log('[CalendarSimple] Navigation handled by React Big Calendar:', {
      from: currentDate.toISOString(),
      to: newDate.toISOString()
    });
    setCurrentDate(newDate);
    // Trigger refresh to fetch data for new date range
    triggerRefresh();
  }, [currentDate, triggerRefresh]);

  // Combine all events with comprehensive logging and proper className assignment
  const allEvents = useMemo(() => {
    const events = [];
    
    // Add clean internal appointments with proper className
    if (appointments) {
      events.push(...appointments.map(apt => {
        const title = apt.clientName || 'Internal Appointment';

        // Parse ISO string explicitly as UTC, then convert to clinician's zone
        const apptDTStart = DateTime.fromISO(apt.start_at, { zone: 'UTC' })
          .setZone(apt.appointment_timezone || userTimeZone);
        const apptDTEnd = DateTime.fromISO(apt.end_at, { zone: 'UTC' })
          .setZone(apt.appointment_timezone || userTimeZone);

        return {
          ...apt,
          source: 'internal',
          type: 'appointment',
          className: 'internal-event',
          id: apt.id,
          title: title,
          start: buildLocalDate(apptDTStart),
          end: buildLocalDate(apptDTEnd),
          resource: apt,
          priority: 1
        };
      }));
    }
    
    // Add Nylas events with proper source tagging and className
    if (nylasEvents) {
      events.push(...nylasEvents.map(evt => ({
        ...evt,
        source: 'nylas',
        type: 'external',
        className: 'external-event',
        id: evt.id,
        start_time: evt.when?.start_time,
        end_time: evt.when?.end_time,
        start: evt.when?.start_time,
        end: evt.when?.end_time,
        priority: 1
      })));
    }

    // Add blocked time events with proper className
    events.push(...blockedTimeEvents.map(evt => ({
      ...evt,
      className: 'blocked-time-event',
      priority: 2
    })));

    // Add availability events with proper className
    events.push(...availabilityEvents.map(evt => ({
      ...evt,
      className: 'availability-event',
      priority: 0
    })));

    console.group('📊 Calendar Data Summary with Priority Layering');
    console.log('Week Range:', {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      timezone: userTimeZone
    });
    console.log('Data Sources:');
    console.log('  Internal Appointments:', appointments?.length || 0);
    console.log('  External Events (Nylas):', nylasEvents?.length || 0);
    console.log('  Blocked Time Events:', blockedTimeEvents.length);
    console.log('  Availability Events:', availabilityEvents.length);
    console.log('  Total Events:', events.length);
    console.log('Priority Distribution:', {
      'priority-0 (availability)': events.filter(e => e.priority === 0).length,
      'priority-1 (appointments)': events.filter(e => e.priority === 1).length,
      'priority-2 (blocked)': events.filter(e => e.priority === 2).length
    });
    console.log('ClassName Distribution:', {
      'availability-event': events.filter(e => e.className === 'availability-event').length,
      'internal-event': events.filter(e => e.className === 'internal-event').length,
      'external-event': events.filter(e => e.className === 'external-event').length,
      'blocked-time-event': events.filter(e => e.className === 'blocked-time-event').length
    });
    console.log('Loading States:', {
      appointmentsLoading,
      nylasLoading,
      blockedTimesLoading
    });
    console.groupEnd();

    // Sort by priority first (availability=0, appointments=1, blocked=2), then by time
    return events
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
  }, [appointments, nylasEvents, blockedTimeEvents, availabilityEvents, weekStart, weekEnd, userTimeZone, appointmentsLoading, nylasLoading, blockedTimesLoading]);

  // Debug logging for calendar state
  useEffect(() => {
    console.log('[CalendarSimple] Component state:', {
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
      navigationSystem: 'React Big Calendar Native'
    });
  }, [userId, appointments, nylasEvents, blockedTimes, allEvents, appointmentsLoading, nylasLoading, blockedTimesLoading, userTimeZone, currentDate, weekStart, weekEnd, isReady, authInitialized]);

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

  // Handle event click with proper blocked time handling
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
      // Open edit dialog for blocked time events
      console.log('[CalendarSimple] Opening edit dialog for blocked time:', event);
      setEditingBlockedTime(event.resource);
      setShowEditBlockedDialog(true);
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
    console.log(`[CalendarSimple] ${timestamp} handleBlockTime called with userId:`, {
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
    
    console.log(`[CalendarSimple] ${timestamp} Opening BlockTimeDialog with valid userId:`, userId);
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
          {/* Header with action buttons only - navigation now handled by React Big Calendar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
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
              {/* Enhanced debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-blue-600 space-y-1">
                  <p>Debug: UserID: {userId}</p>
                  <p>Week: {DateTime.fromJSDate(weekStart).toFormat('MM/dd')} - {DateTime.fromJSDate(weekEnd).toFormat('MM/dd')}</p>
                  <p>Loading: A:{appointmentsLoading ? 'Y' : 'N'} | N:{nylasLoading ? 'Y' : 'N'} | B:{blockedTimesLoading ? 'Y' : 'N'}</p>
                  <p>Navigation: React Big Calendar Native</p>
                </div>
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

          {/* React Big Calendar with timezone support and forced overlapping */}
          <ReactBigCalendar
            events={allEvents}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            date={currentDate}
            onNavigate={handleCalendarNavigate}
            userTimeZone={userTimeZone}
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
              onAppointmentCreated={triggerRefresh}
              onAppointmentUpdated={triggerRefresh}
              initialData={isEditMode ? editingAppointment : (selectedSlot ? {
                start: selectedSlot.start,
                end: selectedSlot.end,
                title: '',
                clientName: '',
                notes: '',
                appointment_timezone: userTimeZone
              } : null)}
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

          {/* Edit Blocked Time Dialog */}
          {showEditBlockedDialog && editingBlockedTime && (
            <EditBlockedTimeDialog
              isOpen={showEditBlockedDialog}
              onClose={() => {
                setShowEditBlockedDialog(false);
                setEditingBlockedTime(null);
              }}
              blockedTime={editingBlockedTime}
              onDeleted={() => {
                triggerRefresh();
                setShowEditBlockedDialog(false);
                setEditingBlockedTime(null);
              }}
              onUpdated={() => {
                triggerRefresh();
                setShowEditBlockedDialog(false);
                setEditingBlockedTime(null);
              }}
            />
          )}
        </div>
      </CalendarErrorBoundary>
    </Layout>
  );
});

export default CalendarSimple;
