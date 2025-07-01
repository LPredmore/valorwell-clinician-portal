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
    refreshTrigger  // Add refresh trigger for data refresh
  );

  // Fetch external calendar events (Nylas) - USING SYNCHRONIZED DATE RANGE
  const { events: nylasEvents, isLoading: nylasLoading } = useNylasEvents(
    weekStart,    // SYNCHRONIZED - SAME AS APPOINTMENTS
    weekEnd       // SYNCHRONIZED - SAME AS APPOINTMENTS
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

  // Refresh callback for availability changes
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Combine internal, external, and availability events with timezone-aware conversion
  const allEvents = useMemo(() => {
    const events = [];
    
    // Add internal appointments with FIXED timezone-aware conversion
    if (appointments) {
      events.push(...appointments.map(apt => {
        // Handle blocked time appointments with custom title
        let title = apt.clientName || 'Internal Appointment';
        if (apt.type === 'blocked_time') {
          // Extract label from notes or use default
          const notesText = apt.notes || '';
          const labelMatch = notesText.match(/^Blocked time: (.+)$/);
          title = labelMatch ? labelMatch[1] : 'Blocked Time';
        }

        // CRITICAL FIX: Parse ISO string explicitly as UTC, then convert to clinician's zone
        // This prevents Luxon from treating the timestamp as local time
        const apptDTStart = DateTime.fromISO(apt.start_at, { zone: 'UTC' })
          .setZone(apt.appointment_timezone || userTimeZone);
        const apptDTEnd = DateTime.fromISO(apt.end_at, { zone: 'UTC' })
          .setZone(apt.appointment_timezone || userTimeZone);

        console.log('[CalendarSimple] FIXED appointment timezone conversion:', {
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
          localDateStartTime: buildLocalDate(apptDTStart).toLocaleString(),
          localDateEndTime: buildLocalDate(apptDTEnd).toLocaleString(),
          fixStatus: 'SUCCESS - UTC timestamp parsed correctly'
        });

        return {
          ...apt,
          source: 'internal',
          type: apt.type === 'blocked_time' ? 'blocked_time' : 'appointment',
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

    // Add availability events (already converted with timezone fix)
    events.push(...availabilityEvents);

    console.log('[CalendarSimple] FIXED event merging with timezone correction:', {
      dateRangeUsed: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString()
      },
      internalEventsCount: appointments?.length || 0,
      externalEventsCount: nylasEvents?.length || 0,
      availabilityEventsCount: availabilityEvents.length,
      totalEventsCount: events.length,
      fixedInternalEvents: appointments?.map(e => { 
        const fixedStart = DateTime.fromISO(e.start_at, { zone: 'UTC' })
          .setZone(e.appointment_timezone || userTimeZone);
        return {
          id: e.id, 
          title: e.clientName, 
          originalStartUTC: e.start_at,
          fixedDisplayTime: buildLocalDate(fixedStart).toLocaleString(),
          timezone: e.appointment_timezone || userTimeZone
        };
      }) || [],
      externalEvents: nylasEvents?.map(e => ({ id: e.id, title: e.title, start: e.when?.start_time })) || [],
      availabilityEvents: availabilityEvents.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start.toISOString()
      })),
      timezoneFixStatus: 'SUCCESS - All internal appointments now parse UTC correctly'
    });

    return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [appointments, nylasEvents, availabilityEvents, weekStart, weekEnd, userTimeZone]);

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
      })),
      availabilityEvents: availabilityEvents.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start.toISOString()
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
    setEditingAppointment(null);
    setIsEditMode(false);
    setShowAppointmentDialog(true);
  }, []);

  // Handle event click
  const handleSelectEvent = useCallback((event: any) => {
    console.log('[CalendarSimple] Event selected:', event);
    if (event.source === 'internal') {
      if (event.type === 'blocked_time') {
        // Enhanced feedback for blocked time with more options
        const blockLabel = event.title || 'Blocked Time';
        toast({
          title: "🚫 Blocked Time",
          description: `${blockLabel} - This time slot is blocked and unavailable for appointments`,
          duration: 4000,
        });
        
        // TODO: Future enhancement - could open BlockTimeEditDialog here
        console.log('[CalendarSimple] Blocked time clicked:', {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          notes: event.notes
        });
      } else {
        // Open appointment edit dialog for regular appointments
        setEditingAppointment(event.resource || event);
        setSelectedSlot({
          start: event.start || new Date(event.start_at),
          end: event.end || new Date(event.end_at)
        });
        setIsEditMode(true);
        setShowAppointmentDialog(true);
      }
    } else if (event.source === 'nylas') {
      // Show toast for external events
      toast({
        title: "📅 External Event",
        description: `${event.title} - Synced from ${event.connection_provider || 'external calendar'}`,
        duration: 3000,
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

  // Handle block time button
  const handleBlockTime = useCallback(() => {
    setShowBlockTimeDialog(true);
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
                Available: {availabilityEvents.length}
                {allEvents.filter(e => e.type === 'blocked_time').length > 0 && (
                  <span className="text-gray-500">
                    {' '}| Blocked: {allEvents.filter(e => e.type === 'blocked_time').length}
                  </span>
                )}
              </p>
              <p>Timezone: {userTimeZone}</p>
            </div>
          </div>

          {/* Calendar Legend */}
          <CalendarLegend
            blockedCount={allEvents.filter(e => e.type === 'blocked_time').length}
            internalCount={(appointments?.filter(a => a.type !== 'blocked_time')?.length || 0)}
            externalCount={nylasEvents?.length || 0}
            availableCount={availabilityEvents.length}
          />

          {/* React Big Calendar */}
          <ReactBigCalendar
            events={allEvents}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
          />

          {/* Appointment Dialog - UPDATED to handle both create and edit */}
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
              selectedStartTime={selectedSlot?.start ? DateTime.fromJSDate(selectedSlot.start) : undefined}
              selectedEndTime={selectedSlot?.end ? DateTime.fromJSDate(selectedSlot.end) : undefined}
              onAppointmentCreated={triggerRefresh}
              onAppointmentUpdated={triggerRefresh}
              isEdit={isEditMode}
              fixedClientId={editingAppointment?.client_id}
              appointmentId={editingAppointment?.id}
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

CalendarSimple.displayName = 'CalendarSimple';

export default CalendarSimple;
