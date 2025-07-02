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
import { toLocalJSDate } from "@/utils/dateUtils";
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

  // Enhanced week boundary calculation with timezone awareness
  const { weekStart, weekEnd } = useMemo(() => {
    const tz = userTimeZone || TimeZoneService.DEFAULT_TIMEZONE;
    const range = getWeekRange(currentDate, tz);
    
    logWeekNavigation(range.start, range.end, tz);
    
    return {
      weekStart: range.start,
      weekEnd: range.end
    };
  }, [currentDate, userTimeZone]);

  // CRITICAL: Fetch data with FIXED hook dependencies
  const { appointments, isLoading: appointmentsLoading } = useAppointments(
    userId,
    weekStart,
    weekEnd,
    userTimeZone,
    refreshTrigger
  );

  const { events: nylasEvents, isLoading: nylasLoading } = useNylasEvents(
    weekStart,
    weekEnd
  );

  // CRITICAL: Fixed blocked times hook with proper dependencies
  const { blockedTimes, isLoading: blockedTimesLoading } = useBlockedTime(
    userId || '',
    weekStart,
    weekEnd,
    refreshTrigger
  );

  // CRITICAL: Fixed availability hook with proper dependencies
  const availabilitySlots = useClinicianAvailability(userId, refreshTrigger);

  // CRITICAL: Transform availability slots with STANDARDIZED toLocalJSDate conversion
  const availabilityEvents = useMemo(() => {
    if (!availabilitySlots.length || !userTimeZone) {
      console.log('[CalendarSimple] No availability slots or timezone, returning empty array');
      return [];
    }
    
    console.log('[CalendarSimple] CRITICAL: Processing availability with STANDARDIZED toLocalJSDate:', {
      slotsCount: availabilitySlots.length,
      userTimeZone,
      weekStartUTC: weekStart.toISOString(),
      weekEndUTC: weekEnd.toISOString()
    });
    
    const tz = userTimeZone;
    const startDT = DateTime.fromJSDate(weekStart).setZone(tz).startOf('day');
    const endDT = DateTime.fromJSDate(weekEnd).setZone(tz).startOf('day');
    
    const dates = [];
    let cursor = startDT;
    
    while (cursor <= endDT) {
      dates.push(cursor);
      cursor = cursor.plus({ days: 1 });
    }

    const weekdayMap = { 
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4, 
      friday: 5, saturday: 6, sunday: 7 
    };

    const events = availabilitySlots.flatMap(slot => {
      const matchedDates = dates.filter(d => d.weekday === weekdayMap[slot.day]);
      
      return matchedDates.map(d => {
        // CRITICAL: Build ISO strings and use toLocalJSDate() for consistency
        const startISO = `${d.toISODate()}T${slot.startTime}`;
        const endISO = `${d.toISODate()}T${slot.endTime}`;
        
        // Convert to UTC first, then use toLocalJSDate
        const startDT = DateTime.fromISO(startISO, { zone: tz }).toUTC();
        const endDT = DateTime.fromISO(endISO, { zone: tz }).toUTC();
        
        console.log('[CalendarSimple] CRITICAL: Availability toLocalJSDate conversion:', {
          slotDay: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          startISO,
          endISO,
          toLocalJSDateStart: toLocalJSDate(startDT.toISO()!, tz).toISOString(),
          toLocalJSDateEnd: toLocalJSDate(endDT.toISO()!, tz).toISOString(),
          timezone: tz
        });
        
        return {
          id: `avail-${slot.day}-${slot.slot}-${d.toISODate()}`,
          title: 'Available',
          start: toLocalJSDate(startDT.toISO()!, tz), // CRITICAL: Use toLocalJSDate
          end: toLocalJSDate(endDT.toISO()!, tz), // CRITICAL: Use toLocalJSDate
          source: 'availability',
          type: 'availability',
          className: 'availability-event',
          resource: slot
        };
      });
    });

    console.log('[CalendarSimple] CRITICAL: Availability events final check:', {
      eventsCount: events.length,
      timezone: tz,
      sampleTimes: events.slice(0, 2).map(e => ({
        id: e.id,
        start: e.start.toISOString(),
        startHours: e.start.getHours(),
        end: e.end.toISOString(),
        endHours: e.end.getHours()
      }))
    });

    return events;
  }, [availabilitySlots, weekStart, weekEnd, userTimeZone, refreshTrigger]);

  // CRITICAL: Transform blocked times with STANDARDIZED toLocalJSDate conversion
  const blockedTimeEvents = useMemo(() => {
    if (!blockedTimes.length || !userTimeZone) {
      console.log('[CalendarSimple] No blocked times or timezone');
      return [];
    }
    
    console.log('[CalendarSimple] CRITICAL: Processing blocked times with STANDARDIZED toLocalJSDate:', {
      blockedTimesCount: blockedTimes.length,
      userTimeZone
    });

    const events = blockedTimes.map(blockedTime => {
      // CRITICAL: Use toLocalJSDate directly with stored UTC timestamps
      console.log('[CalendarSimple] CRITICAL: Blocked time toLocalJSDate conversion:', {
        id: blockedTime.id,
        originalStartUTC: blockedTime.start_at,
        originalEndUTC: blockedTime.end_at,
        toLocalJSDateStart: toLocalJSDate(blockedTime.start_at, blockedTime.timezone || userTimeZone).toISOString(),
        toLocalJSDateEnd: toLocalJSDate(blockedTime.end_at, blockedTime.timezone || userTimeZone).toISOString()
      });

      return {
        id: blockedTime.id,
        title: blockedTime.label,
        start: toLocalJSDate(blockedTime.start_at, blockedTime.timezone || userTimeZone), // CRITICAL: Use toLocalJSDate
        end: toLocalJSDate(blockedTime.end_at, blockedTime.timezone || userTimeZone), // CRITICAL: Use toLocalJSDate
        source: 'blocked_time',
        type: 'blocked_time',
        className: 'blocked-time-event',
        resource: blockedTime
      };
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
    triggerRefresh();
  }, [currentDate, triggerRefresh]);

  // CRITICAL: Combine all events with STANDARDIZED toLocalJSDate conversion for appointments
  const allEvents = useMemo(() => {
    const events = [];
    
    // CRITICAL: Add appointments with STANDARDIZED toLocalJSDate conversion
    if (appointments) {
      events.push(...appointments.map(apt => {
        const title = apt.clientName || 'Internal Appointment';

        // CRITICAL: Use toLocalJSDate directly with stored UTC timestamps
        console.log('[CalendarSimple] CRITICAL: Appointment toLocalJSDate conversion:', {
          id: apt.id,
          clientName: apt.clientName,
          originalStartUTC: apt.start_at,
          originalEndUTC: apt.end_at,
          appointmentTimezone: apt.appointment_timezone,
          userTimezone: userTimeZone,
          toLocalJSDateStart: toLocalJSDate(apt.start_at, apt.appointment_timezone || userTimeZone).toISOString(),
          toLocalJSDateEnd: toLocalJSDate(apt.end_at, apt.appointment_timezone || userTimeZone).toISOString(),
          finalHours: `${toLocalJSDate(apt.start_at, apt.appointment_timezone || userTimeZone).getHours()}:${toLocalJSDate(apt.start_at, apt.appointment_timezone || userTimeZone).getMinutes().toString().padStart(2, '0')}`
        });

        return {
          ...apt,
          source: 'internal',
          type: 'appointment',
          className: 'internal-event',
          id: apt.id,
          title: title,
          start: toLocalJSDate(apt.start_at, apt.appointment_timezone || userTimeZone), // CRITICAL: Use toLocalJSDate
          end: toLocalJSDate(apt.end_at, apt.appointment_timezone || userTimeZone), // CRITICAL: Use toLocalJSDate
          resource: apt,
          priority: 1
        };
      }));
    }
    
    // Add Nylas events with proper source tagging
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

    // Add blocked time events
    events.push(...blockedTimeEvents.map(evt => ({
      ...evt,
      priority: 2
    })));

    // Add availability events
    events.push(...availabilityEvents.map(evt => ({
      ...evt,
      priority: 0
    })));

    console.group('📊 CRITICAL: Calendar Data with STANDARDIZED toLocalJSDate');
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
    console.log('CRITICAL - Sample Event Final Times:', events.slice(0, 3).map(e => ({
      id: e.id,
      title: e.title,
      source: e.source,
      className: e.className,
      start: e.start?.toISOString(),
      startHours: e.start?.getHours(),
      end: e.end?.toISOString(),
      endHours: e.end?.getHours()
    })));
    console.groupEnd();

    return events.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }, [appointments, nylasEvents, blockedTimeEvents, availabilityEvents, weekStart, weekEnd, userTimeZone]);

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
      setEditingAppointment(event.resource || event);
      setSelectedSlot({
        start: event.start || new Date(event.start_at),
        end: event.end || new Date(event.end_at)
      });
      setIsEditMode(true);
      setShowAppointmentDialog(true);
    } else if (event.source === 'nylas') {
      toast({
        title: "📅 External Event",
        description: `${event.title} - Synced from ${event.connection_provider || 'external calendar'}`,
        duration: 3000,
      });
    } else if (event.source === 'blocked_time') {
      console.log('[CalendarSimple] Opening edit dialog for blocked time:', event);
      setEditingBlockedTime(event.resource);
      setShowEditBlockedDialog(true);
    } else if (event.source === 'availability') {
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
      
      if (!isMounted) return;
      
      setUserTimeZone(TimeZoneService.ensureIANATimeZone(timeZone));
    } catch (error) {
      console.error('[CalendarSimple] Error loading user timezone:', error);
      if (isMounted) {
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
                      refreshTrigger={refreshTrigger}
                      onRefresh={triggerRefresh}
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
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-blue-600 space-y-1">
                  <p>Debug: UserID: {userId}</p>
                  <p>Week: {DateTime.fromJSDate(weekStart).toFormat('MM/dd')} - {DateTime.fromJSDate(weekEnd).toFormat('MM/dd')}</p>
                  <p>Loading: A:{appointmentsLoading ? 'Y' : 'N'} | N:{nylasLoading ? 'Y' : 'N'} | B:{blockedTimesLoading ? 'Y' : 'N'}</p>
                  <p>CRITICAL: All events use toLocalJSDate() with Luxon localizer</p>
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

          {/* CRITICAL: React Big Calendar with Luxon localizer and properly converted events */}
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
              selectedSlot={selectedSlot}
              clinicianId={userId}
              userTimeZone={userTimeZone}
              onAppointmentCreated={triggerRefresh}
              onAppointmentUpdated={triggerRefresh}
              isEditMode={isEditMode}
              editingAppointment={editingAppointment}
            />
          )}

          {/* Block Time Dialog */}
          {showBlockTimeDialog && (
            <BlockTimeDialog
              isOpen={showBlockTimeDialog}
              onClose={() => setShowBlockTimeDialog(false)}
              clinicianId={userId}
              userTimeZone={userTimeZone}
              onBlockedTimeCreated={triggerRefresh}
            />
          )}

          {/* Edit Blocked Time Dialog */}
          {showEditBlockedDialog && (
            <EditBlockedTimeDialog
              isOpen={showEditBlockedDialog}
              onClose={() => {
                setShowEditBlockedDialog(false);
                setEditingBlockedTime(null);
              }}
              blockedTime={editingBlockedTime}
              userTimeZone={userTimeZone}
              onBlockedTimeUpdated={triggerRefresh}
            />
          )}
        </div>
      </CalendarErrorBoundary>
    </Layout>
  );
});

export default CalendarSimple;
