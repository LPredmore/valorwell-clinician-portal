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
import { getClinicianTimeZone } from "@/hooks/useClinicianData";
import { TimeZoneService } from "@/utils/timeZoneService";
import { CalendarEvent } from "./types";
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
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [calendarStartTime, setCalendarStartTime] = useState<string>('08:00');
  const [calendarEndTime, setCalendarEndTime] = useState<string>('21:00');
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isBlockedTimeDialogOpen, setIsBlockedTimeDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [editingBlockedTime, setEditingBlockedTime] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Calculate week boundaries using RBC-native approach
  const { start: weekStart, end: weekEnd } = useMemo(() => {
    const tz = userTimeZone || TimeZoneService.DEFAULT_TIMEZONE;
    return getWeekRange(currentDate, tz);
  }, [currentDate, userTimeZone]);

  // Fetch data with simplified parameters
  const { appointments } = useAppointments(
    userId,
    weekStart,
    weekEnd,
    userTimeZone,
    refreshTrigger
  );

  const { events: nylasEvents } = useNylasEvents(weekStart, weekEnd);

  const { blockedTimes } = useBlockedTime(
    userId || '',
    weekStart,
    weekEnd,
    refreshTrigger
  );

  const availabilitySlots = useClinicianAvailability(
    userId,
    refreshTrigger
  );

  // Separate real events from background availability
  const realEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    // Transform appointments to RBC format
    if (appointments) {
      events.push(...appointments.map(apt => {
        // Convert UTC times directly to user's timezone for display
        const startDT = DateTime.fromISO(apt.start_at, { zone: 'utc' }).setZone(userTimeZone);
        const endDT = DateTime.fromISO(apt.end_at, { zone: 'utc' }).setZone(userTimeZone);

        return {
          id: apt.id,
          title: apt.clientName || 'Internal Appointment',
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          source: 'internal' as const,
          resource: apt
        };
      }));
    }
    
    // Transform Nylas events to RBC format
    if (nylasEvents) {
      events.push(...nylasEvents.map(evt => ({
        id: evt.id,
        title: evt.title,
        start: new Date(evt.when?.start_time || ''),
        end: new Date(evt.when?.end_time || ''),
        source: 'nylas' as const,
        resource: evt
      })));
    }

    // Transform blocked time to RBC format
    events.push(...blockedTimes.map(blockedTime => {
      const startDT = DateTime.fromISO(blockedTime.start_at, { zone: 'utc' }).setZone(userTimeZone);
      const endDT = DateTime.fromISO(blockedTime.end_at, { zone: 'utc' }).setZone(userTimeZone);

      return {
        id: blockedTime.id,
        title: blockedTime.label,
        start: startDT.toJSDate(),
        end: endDT.toJSDate(),
        source: 'blocked_time' as const,
        resource: blockedTime
      };
    }));

    return events;
  }, [appointments, nylasEvents, blockedTimes, userTimeZone]);

  // Transform availability slots to background events
  const backgroundEvents = useMemo(() => {
    // Use user timezone for date range calculation
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

    return availabilitySlots.flatMap(slot => {
      const matchedDates = dates.filter(d => d.weekday === weekdayMap[slot.day]);
      
      return matchedDates.map(d => {
        const startISO = `${d.toISODate()}T${slot.startTime}`;
        const endISO = `${d.toISODate()}T${slot.endTime}`;
        
        // Use clinician's timezone to interpret the time strings
        const clinicianTz = TimeZoneService.ensureIANATimeZone(slot.clinicianTimeZone);
        const startDT = DateTime.fromISO(startISO, { zone: clinicianTz });
        const endDT = DateTime.fromISO(endISO, { zone: clinicianTz });
        
        // Convert from clinician timezone to user timezone for display
        const userStartDT = startDT.setZone(userTimeZone);
        const userEndDT = endDT.setZone(userTimeZone);
        
        return {
          start: userStartDT.toJSDate(),
          end: userEndDT.toJSDate(),
          resource: slot
        };
      });
    });
  }, [availabilitySlots, weekStart, weekEnd, userTimeZone]);

  // CRITICAL: Load ONLY clinician timezone (no browser fallback)
  const loadUserTimeZone = useCallback(async (clinicianId: string) => {
    try {
      console.log('[CalendarContainer] CRITICAL: Loading clinician timezone (browser-independent):', clinicianId);
      const timeZone = await getClinicianTimeZone(clinicianId);
      setUserTimeZone(TimeZoneService.ensureIANATimeZone(timeZone));
      console.log('[CalendarContainer] SUCCESS: Set clinician timezone:', timeZone);
    } catch (error) {
      console.error('[CalendarContainer] CRITICAL ERROR: Cannot load clinician timezone - calendar will not function:', error);
      // ELIMINATED: Browser timezone fallback - calendar must wait for valid clinician timezone
      throw new Error(`Calendar requires clinician timezone but failed to load for ${clinicianId}: ${error.message}`);
    }
  }, []);

  const loadCalendarDisplaySettings = useCallback(async (clinicianId: string) => {
    try {
      const { data } = await supabase
        .from('clinicians')
        .select('clinician_calendar_start_time, clinician_calendar_end_time')
        .eq('id', clinicianId)
        .single();

      if (data) {
        setCalendarStartTime(data.clinician_calendar_start_time?.substring(0, 5) || '08:00');
        setCalendarEndTime(data.clinician_calendar_end_time?.substring(0, 5) || '21:00');
      }
    } catch (error) {
      // Use defaults if loading fails
      setCalendarStartTime('08:00');
      setCalendarEndTime('21:00');
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
  }, []);

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

  // Timezone and calendar settings loading effect
  useEffect(() => {
    if (!userId) return;
    loadUserTimeZone(userId);
    loadCalendarDisplaySettings(userId);
  }, [userId, loadUserTimeZone, loadCalendarDisplaySettings]);

  // Debug: Log timezone changes to verify conversion triggers
  useEffect(() => {
    console.log('[CalendarContainer] SIMPLE: Timezone changed, events will auto-reposition:', {
      newTimezone: userTimeZone,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    });
  }, [userTimeZone, weekStart, weekEnd]);

  // CRITICAL: Show loading until both auth AND clinician timezone are ready
  if (!authInitialized || !userId || userTimeZone === TimeZoneService.DEFAULT_TIMEZONE) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading calendar with clinician timezone...</p>
            {userTimeZone === TimeZoneService.DEFAULT_TIMEZONE && (
              <p className="text-sm text-gray-500 mt-2">Waiting for clinician timezone data...</p>
            )}
          </div>
        </div>
      </div>
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
                userTimeZone={userTimeZone}
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
            userTimeZone={userTimeZone}
            onBlockedTimeUpdated={handleBlockedTimeUpdated}
          />
        )}
      </div>
    </Layout>
  );
};

export default CalendarContainer;
