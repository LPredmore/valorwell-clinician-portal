import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import ReactBigCalendar from "./ReactBigCalendar";
import AvailabilityManagementSidebar from "./AvailabilityManagementSidebar";
import AppointmentDialog from "./AppointmentDialog";
import EditBlockedTimeDialog from "./EditBlockedTimeDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DateTime } from "luxon";
import { useAppointments } from "@/hooks/useAppointments";
import { useNylasEvents } from "@/hooks/useNylasEvents";
import { useClinicianAvailability } from "@/hooks/useClinicianAvailability";
import { useBlockedTime } from "@/hooks/useBlockedTime";
import { getWeekRange } from "@/utils/dateRangeUtils";
// Removed getClinicianTimeZone import - using browser timezone only
import { TimeZoneService } from "@/utils/timeZoneService";
import { CalendarEvent } from "./types";
import { utcToCalendarDate, getCalendarTimeBounds } from "@/utils/timezoneHelpers";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const CalendarContainer: React.FC = () => {
  const { userId, authInitialized, userRole } = useUser();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone); // Use browser timezone
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [navigationStateError, setNavigationStateError] = useState(false);
  const [calendarStartTime, setCalendarStartTime] = useState<string>('00:00');
  const [calendarEndTime, setCalendarEndTime] = useState<string>('23:59');
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isBlockedTimeDialogOpen, setIsBlockedTimeDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editingBlockedTime, setEditingBlockedTime] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Allow hook execution with browser timezone
  const shouldExecuteHooks = userId;
  
  console.log('[CalendarContainer] TIMEZONE LOADING STATE:', {
    shouldExecuteHooks,
    userTimeZone,
    userId: !!userId,
    navigationStateError,
    message: shouldExecuteHooks ? 'HOOKS WILL EXECUTE' : 'HOOKS SUSPENDED - WAITING FOR TIMEZONE'
  });

  // Navigation state cleanup effect
  useEffect(() => {
    if (navigationStateError) {
      console.log('[CalendarContainer] NAVIGATION STATE RESET: Clearing error state');
      setNavigationStateError(false);
    }
  }, [navigationStateError]);

  // Calculate week boundaries using browser timezone
  const { start: weekStart, end: weekEnd } = useMemo(() => {
    if (!shouldExecuteHooks) {
      return { start: new Date(), end: new Date() };
    }
    try {
      return getWeekRange(currentDate, userTimeZone);
    } catch (error) {
      console.error('[CalendarContainer] Error calculating week range:', error);
      return { start: new Date(), end: new Date() };
    }
  }, [currentDate, userTimeZone, shouldExecuteHooks]);

  // Use browser timezone for appointments query
  const { appointments } = useAppointments(
    shouldExecuteHooks ? userId : null,
    shouldExecuteHooks ? weekStart : new Date(),
    shouldExecuteHooks ? weekEnd : new Date(),
    shouldExecuteHooks ? userTimeZone : undefined, // Pass browser timezone
    shouldExecuteHooks ? refreshTrigger : 0
  );

  const { events: nylasEvents } = useNylasEvents(
    shouldExecuteHooks ? weekStart : new Date(),
    shouldExecuteHooks ? weekEnd : new Date()
  );

  const { blockedTimes } = useBlockedTime(
    shouldExecuteHooks ? (userId || '') : '',
    shouldExecuteHooks ? weekStart : new Date(),
    shouldExecuteHooks ? weekEnd : new Date(),
    undefined, // No timezone parameter - use browser default
    shouldExecuteHooks ? refreshTrigger : 0
  );

  const availabilitySlots = useClinicianAvailability(
    shouldExecuteHooks ? userId : null,
    shouldExecuteHooks ? refreshTrigger : 0
  );

  // Separate real events from background availability
  const realEvents = useMemo((): CalendarEvent[] => {
    console.debug('[realEvents useMemo] using browser timezone', { userTimeZone, shouldExecuteHooks });
    if (!shouldExecuteHooks) {
      return [];
    }

    const events: CalendarEvent[] = [];
    
    // C. MAPPING TO CALENDAR EVENT - Check raw appointments first
    console.debug('[CalendarContainer] realEvents RAW:', appointments?.map(a => ({
      id: a.id,
      start_at: a.start_at,
      end_at: a.end_at,
      clientName: a.clientName
    })));

    // Transform appointments to RBC format using unified conversion
    if (appointments) {
      appointments.forEach(apt => {
        try {
          // Use browser timezone for calendar display
          const startDate = new Date(apt.start_at);
          const endDate = new Date(apt.end_at);
          
          // CRITICAL: Validate dates before adding to events
          if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('[CalendarContainer] realEvents - Invalid appointment dates:', {
              appointmentId: apt.id,
              start_at: apt.start_at,
              end_at: apt.end_at,
              startDate,
              endDate,
              startTime: startDate?.getTime(),
              endTime: endDate?.getTime()
            });
            return; // Skip this invalid appointment
          }
          
          events.push({
            id: apt.id,
            title: apt.clientName || 'Internal Appointment',
            start: startDate,
            end: endDate,
            source: 'internal' as const,
            resource: apt
          });
        } catch (error) {
          console.error('[CalendarContainer] realEvents - Exception processing appointment:', {
            appointmentId: apt.id,
            error: error.message,
            start_at: apt.start_at,
            end_at: apt.end_at
          });
        }
      });
    }
    
    // Transform Nylas events to RBC format with proper validation
    if (nylasEvents) {
      nylasEvents.forEach(evt => {
        try {
          // CRITICAL: Validate Nylas event time data before creating dates
          if (!evt.when?.start_time || !evt.when?.end_time) {
            console.error('[CalendarContainer] realEvents - Missing Nylas event time data:', {
              eventId: evt.id,
              title: evt.title,
              when: evt.when
            });
            return; // Skip this invalid event
          }
          
          const startDate = new Date(evt.when.start_time);
          const endDate = new Date(evt.when.end_time);
          
          // CRITICAL: Validate dates before adding to events
          if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('[CalendarContainer] realEvents - Invalid Nylas event dates:', {
              eventId: evt.id,
              title: evt.title,
              start_time: evt.when.start_time,
              end_time: evt.when.end_time,
              startDate,
              endDate,
              startTime: startDate?.getTime(),
              endTime: endDate?.getTime()
            });
            return; // Skip this invalid event
          }
          
          events.push({
            id: evt.id,
            title: evt.title,
            start: startDate,
            end: endDate,
            source: 'nylas' as const,
            resource: evt
          });
        } catch (error) {
          console.error('[CalendarContainer] realEvents - Exception processing Nylas event:', {
            eventId: evt.id,
            title: evt.title,
            error: error.message,
            when: evt.when
          });
        }
      });
    }

    // Transform blocked time to RBC format using unified conversion
    if (blockedTimes) {
      blockedTimes.forEach(blockedTime => {
        try {
          // Use browser timezone for calendar display
          const startDate = new Date(blockedTime.start_at);
          const endDate = new Date(blockedTime.end_at);
          
          // CRITICAL: Validate dates before adding to events
          if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('[CalendarContainer] realEvents - Invalid blocked time dates:', {
              blockedTimeId: blockedTime.id,
              start_at: blockedTime.start_at,
              end_at: blockedTime.end_at,
              startDate,
              endDate,
              startTime: startDate?.getTime(),
              endTime: endDate?.getTime()
            });
            return; // Skip this invalid blocked time
          }
          
          events.push({
            id: blockedTime.id,
            title: blockedTime.label,
            start: startDate,
            end: endDate,
            source: 'blocked_time' as const,
            resource: blockedTime
          });
        } catch (error) {
          console.error('[CalendarContainer] realEvents - Exception processing blocked time:', {
            blockedTimeId: blockedTime.id,
            error: error.message,
            start_at: blockedTime.start_at,
            end_at: blockedTime.end_at
          });
        }
      });
    }

    // C. MAPPING TO CALENDAR EVENT - Check final mapped events
    console.debug('[CalendarContainer] realEvents MAPPED:', events.slice(0, 3).map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      source: e.source,
      isValidStart: !isNaN(e.start.getTime()),
      isValidEnd: !isNaN(e.end.getTime()),
      startBeforeEnd: e.start < e.end
    })));

    console.log('[CalendarContainer] realEvents - Final validation:', {
      totalEvents: events.length,
      appointmentEvents: events.filter(e => e.source === 'internal').length,
      nylasEvents: events.filter(e => e.source === 'nylas').length,
      blockedTimeEvents: events.filter(e => e.source === 'blocked_time').length
    });

    return events;
  }, [appointments, nylasEvents, blockedTimes, userTimeZone]);

  // Transform availability slots to background events
  const backgroundEvents = useMemo(() => {
    // Guard against invalid dates
    if (!shouldExecuteHooks) {
      console.log('[CalendarContainer] GUARD: backgroundEvents - hooks not ready');
      return [];
    }

    // CRITICAL: Validate date range to prevent infinite loops
    if (!weekStart || !weekEnd || isNaN(weekStart.getTime()) || isNaN(weekEnd.getTime())) {
      console.log('[CalendarContainer] GUARD: backgroundEvents - invalid date range', {
        weekStart: weekStart?.toISOString(),
        weekEnd: weekEnd?.toISOString()
      });
      return [];
    }

    // CRITICAL: Check for reasonable date range (prevent infinite loops)
    const daysDiff = Math.abs((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) { // More than 90 days is suspicious
      console.error('[CalendarContainer] GUARD: backgroundEvents - date range too large', {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        daysDiff
      });
      return [];
    }

    // Use user timezone for date range calculation
    const tz = userTimeZone;
    const startDT = DateTime.fromJSDate(weekStart).setZone(tz).startOf('day');
    const endDT = DateTime.fromJSDate(weekEnd).setZone(tz).startOf('day');
    
    // CRITICAL: Validate DateTime objects
    if (!startDT.isValid || !endDT.isValid) {
      console.error('[CalendarContainer] GUARD: backgroundEvents - invalid DateTime objects', {
        startDT: startDT.toISO(),
        endDT: endDT.toISO(),
        startValid: startDT.isValid,
        endValid: endDT.isValid
      });
      return [];
    }

    const dates = [];
    let cursor = startDT;
    let iterationCount = 0;
    const MAX_ITERATIONS = 100; // Safety limit
    
    while (cursor <= endDT && iterationCount < MAX_ITERATIONS) {
      dates.push(cursor);
      cursor = cursor.plus({ days: 1 });
      iterationCount++;
    }

    // CRITICAL: Check if we hit the iteration limit
    if (iterationCount >= MAX_ITERATIONS) {
      console.error('[CalendarContainer] GUARD: backgroundEvents - hit iteration limit', {
        iterationCount,
        startDT: startDT.toISO(),
        endDT: endDT.toISO(),
        cursor: cursor.toISO()
      });
      return [];
    }

    console.log('[CalendarContainer] backgroundEvents - safe iteration completed', {
      iterationCount,
      datesGenerated: dates.length,
      dateRange: `${startDT.toISODate()} to ${endDT.toISODate()}`
    });

    const weekdayMap = { 
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4, 
      friday: 5, saturday: 6, sunday: 7 
    };

    return availabilitySlots.flatMap(slot => {
      const matchedDates = dates.filter(d => d.weekday === weekdayMap[slot.day]);
      
      return matchedDates.map(d => {
        const startISO = `${d.toISODate()}T${slot.startTime}`;
        const endISO = `${d.toISODate()}T${slot.endTime}`;
        
        // Use clinician's timezone to interpret the time strings
        const clinicianTz = TimeZoneService.ensureIANATimeZone(slot.clinicianTimeZone);
        const startDT = DateTime.fromISO(startISO, { zone: clinicianTz });
        const endDT = DateTime.fromISO(endISO, { zone: clinicianTz });
        
        // CRITICAL: Validate DateTime objects before proceeding
        if (!startDT.isValid || !endDT.isValid) {
          console.error('[CalendarContainer] backgroundEvents - Invalid DateTime in availability slot:', {
            startISO,
            endISO,
            clinicianTz,
            startValid: startDT.isValid,
            endValid: endDT.isValid,
            startError: startDT.invalidReason,
            endError: endDT.invalidReason,
            slot
          });
          return null; // Skip this invalid slot
        }
        
        // Convert from clinician timezone to user timezone for display
        const userStartDT = startDT.setZone(userTimeZone);
        const userEndDT = endDT.setZone(userTimeZone);
        
        // CRITICAL: Validate timezone conversion
        if (!userStartDT.isValid || !userEndDT.isValid) {
          console.error('[CalendarContainer] backgroundEvents - Invalid timezone conversion:', {
            userTimeZone,
            userStartValid: userStartDT.isValid,
            userEndValid: userEndDT.isValid,
            userStartError: userStartDT.invalidReason,
            userEndError: userEndDT.invalidReason,
            slot
          });
          return null; // Skip this invalid conversion
        }
        
        try {
          // CRITICAL: Validate JavaScript Date conversion
          const startDate = userStartDT.toJSDate();
          const endDate = userEndDT.toJSDate();
          
          if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('[CalendarContainer] backgroundEvents - Invalid JavaScript Date conversion:', {
              startDate,
              endDate,
              startTime: startDate?.getTime(),
              endTime: endDate?.getTime(),
              slot
            });
            return null; // Skip this invalid date conversion
          }
          
          return {
            start: startDate,
            end: endDate,
            resource: slot
          };
        } catch (error) {
          console.error('[CalendarContainer] backgroundEvents - Exception during toJSDate conversion:', {
            error: error.message,
            slot,
            userStartDT: userStartDT.toISO(),
            userEndDT: userEndDT.toISO()
          });
          return null; // Skip this problematic slot
        }
      }).filter(Boolean); // Remove null values from failed conversions
    });
  }, [availabilitySlots, weekStart, weekEnd, userTimeZone]);

  // Removed loadUserTimeZone - using browser timezone only

  const loadCalendarDisplaySettings = useCallback(async (clinicianId: string) => {
    try {
      const { data } = await supabase
        .from('clinicians')
        .select('clinician_calendar_start_time, clinician_calendar_end_time')
        .eq('id', clinicianId)
        .single();

      console.log('[CalendarContainer] DIAGNOSTIC: Database calendar settings loaded:', {
        clinicianId,
        dbStartTime: data?.clinician_calendar_start_time,
        dbEndTime: data?.clinician_calendar_end_time
      });

      if (data) {
        const startTime = data.clinician_calendar_start_time?.substring(0, 5) || '00:00';
        const endTime = data.clinician_calendar_end_time?.substring(0, 5) || '23:59';
        
        console.log('[CalendarContainer] DIAGNOSTIC: Setting calendar times:', {
          startTime,
          endTime,
          is24Hour: startTime === '00:00' && endTime === '23:59'
        });
        
        setCalendarStartTime(startTime);
        setCalendarEndTime(endTime);
      } else {
        console.log('[CalendarContainer] DIAGNOSTIC: No data returned, using 24-hour defaults');
        setCalendarStartTime('00:00');
        setCalendarEndTime('23:59');
      }
    } catch (error) {
      console.error('[CalendarContainer] DIAGNOSTIC: Failed to load calendar settings, using 24-hour defaults:', error);
      setCalendarStartTime('00:00');
      setCalendarEndTime('23:59');
    }
  }, []);

  // Pure RBC event handlers - native only
  const handleCalendarNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setSelectedSlot(slotInfo);
    setIsEditMode(false);
    setEditingAppointment(null);
    setIsAppointmentDialogOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.source === 'internal') {
      // Open edit dialog for internal appointments
      setEditingAppointment(event.resource);
      setSelectedSlot(null);
      setIsEditMode(true);
      setIsAppointmentDialogOpen(true);
    } else if (event.source === 'nylas') {
      toast({
        title: "External Event",
        description: `${event.title} - Synced from external calendar`,
        duration: 3000,
      });
    } else if (event.source === 'blocked_time') {
      // Open edit dialog for blocked time
      setEditingBlockedTime(event.resource);
      setIsBlockedTimeDialogOpen(true);
    }
  }, [toast]);

  const handleAvailabilityRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    // Also refresh calendar display settings when availability changes
    if (userId) {
      loadCalendarDisplaySettings(userId);
    }
  }, [userId, loadCalendarDisplaySettings]);

  const handleAppointmentCreated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsAppointmentDialogOpen(false);
  }, []);

  const handleAppointmentUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsAppointmentDialogOpen(false);
  }, []);

  const handleCloseAppointmentDialog = useCallback(() => {
    setIsAppointmentDialogOpen(false);
    setSelectedSlot(null);
    setEditingAppointment(null);
    setIsEditMode(false);
  }, []);

  const handleBlockedTimeUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setIsBlockedTimeDialogOpen(false);
    setEditingBlockedTime(null);
  }, []);

  const handleCloseBlockedTimeDialog = useCallback(() => {
    setIsBlockedTimeDialogOpen(false);
    setEditingBlockedTime(null);
  }, []);

  // Auth effect
  useEffect(() => {
    if (!authInitialized) return;
    
    if (!userId) {
      navigate('/login');
      return;
    }
    
    if (userRole === 'client') {
      navigate('/portal');
      return;
    }
  }, [authInitialized, userId, userRole, navigate]);

  // Calendar settings loading effect
  useEffect(() => {
    if (!userId) return;
    loadCalendarDisplaySettings(userId);
  }, [userId, loadCalendarDisplaySettings]);

  // Debug: Log timezone changes to verify conversion triggers
  useEffect(() => {
    console.log('[CalendarContainer] SIMPLE: Timezone changed, events will auto-reposition:', {
      newTimezone: userTimeZone,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    });
  }, [userTimeZone, weekStart, weekEnd]);

  // Move loading guard to very top - prevent ReactBigCalendar render with invalid state
  if (!authInitialized || !userId) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {!authInitialized ? 'Initializing authentication...' : 'Loading user...'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button onClick={() => {
              setSelectedSlot({ start: new Date(), end: new Date() });
              setIsEditMode(false);
              setEditingAppointment(null);
              setIsAppointmentDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>

            <Button variant="outline" onClick={() => navigate('/blocked-time/new')}>
              <Clock className="h-4 w-4 mr-2" />
              Block Time
            </Button>

            <Button variant="outline" onClick={() => setIsAvailabilityOpen(true)}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Availability
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 text-right">
            <p>Timezone: {userTimeZone}</p>
          </div>
        </div>

        <ReactBigCalendar
          events={realEvents}
          backgroundEvents={backgroundEvents}
          availabilitySlots={availabilitySlots}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          date={currentDate}
          onNavigate={handleCalendarNavigate}
          userTimeZone={userTimeZone}
          calendarStartTime={calendarStartTime}
          calendarEndTime={calendarEndTime}
        />

        <Sheet open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Manage Availability</SheetTitle>
              <SheetDescription>
                Set your available time slots for appointments
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <AvailabilityManagementSidebar
                clinicianId={userId}
                refreshTrigger={refreshTrigger}
                onRefresh={handleAvailabilityRefresh}
              />
            </div>
          </SheetContent>
        </Sheet>

        <AppointmentDialog
          isOpen={isAppointmentDialogOpen}
          onClose={handleCloseAppointmentDialog}
          clinicianId={userId}
          userTimeZone={userTimeZone}
          onAppointmentCreated={handleAppointmentCreated}
          onAppointmentUpdated={handleAppointmentUpdated}
          selectedSlot={selectedSlot}
          isEditMode={isEditMode}
          editingAppointment={editingAppointment}
        />

        {editingBlockedTime && (
          <EditBlockedTimeDialog
            isOpen={isBlockedTimeDialogOpen}
            onClose={handleCloseBlockedTimeDialog}
            blockedTime={editingBlockedTime}
            onBlockedTimeUpdated={handleBlockedTimeUpdated}
          />
        )}
      </div>
    </Layout>
  );
};

export default CalendarContainer;
