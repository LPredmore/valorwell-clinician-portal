
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import ReactBigCalendar from "./ReactBigCalendar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";
import { DateTime } from "luxon";
import { useAppointments } from "@/hooks/useAppointments";
import { useNylasEvents } from "@/hooks/useNylasEvents";
import { useClinicianAvailability } from "@/hooks/useClinicianAvailability";
import { useBlockedTime } from "@/hooks/useBlockedTime";
import { getWeekRange } from "@/utils/dateRangeUtils";
import { getClinicianTimeZone } from "@/hooks/useClinicianData";
import { TimeZoneService } from "@/utils/timeZoneService";
import { CalendarEvent } from "./types";

const CalendarContainer: React.FC = () => {
  const { userId, authInitialized, userRole } = useUser();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
    weekStart,
    weekEnd,
    refreshTrigger
  );

  // Pure RBC event transformations with proper typing
  const allEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    // Transform appointments to RBC format with proper typing
    if (appointments) {
      events.push(...appointments.map(apt => {
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
    
    // Transform Nylas events to RBC format with proper typing
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

    // Transform blocked time to RBC format with proper typing
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

    // Transform availability slots to RBC format with proper typing
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

    const availabilityEvents = availabilitySlots.flatMap(slot => {
      const matchedDates = dates.filter(d => d.weekday === weekdayMap[slot.day]);
      
      return matchedDates.map(d => {
        const startISO = `${d.toISODate()}T${slot.startTime}`;
        const endISO = `${d.toISODate()}T${slot.endTime}`;
        
        const startDT = DateTime.fromISO(startISO, { zone: tz });
        const endDT = DateTime.fromISO(endISO, { zone: tz });
        
        return {
          id: `avail-${slot.day}-${slot.slot}-${d.toISODate()}`,
          title: 'Available',
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          source: 'availability' as const,
          resource: slot
        };
      });
    });

    events.push(...availabilityEvents);

    // Let RBC handle all sorting and display natively
    return events;
  }, [appointments, nylasEvents, blockedTimes, availabilitySlots, weekStart, weekEnd, userTimeZone]);

  // Load user timezone
  const loadUserTimeZone = useCallback(async (clinicianId: string) => {
    try {
      const timeZone = await getClinicianTimeZone(clinicianId);
      setUserTimeZone(TimeZoneService.ensureIANATimeZone(timeZone));
    } catch (error) {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimeZone(TimeZoneService.ensureIANATimeZone(browserTimezone));
    }
  }, []);

  // Pure RBC event handlers - native only
  const handleCalendarNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    navigate('/appointments/new', { 
      state: { 
        start: slotInfo.start, 
        end: slotInfo.end 
      } 
    });
  }, [navigate]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.source === 'internal') {
      navigate(`/appointments/${event.id}`);
    } else if (event.source === 'nylas') {
      toast({
        title: "External Event",
        description: `${event.title} - Synced from external calendar`,
        duration: 3000,
      });
    } else if (event.source === 'blocked_time') {
      navigate(`/blocked-time/${event.id}`);
    } else if (event.source === 'availability') {
      toast({
        title: "Available Time",
        description: `Available slot: ${event.resource.startTime} - ${event.resource.endTime}`,
        duration: 3000,
      });
    }
  }, [toast, navigate]);

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

  // Timezone loading effect
  useEffect(() => {
    if (!userId) return;
    loadUserTimeZone(userId);
  }, [userId, loadUserTimeZone]);

  if (!authInitialized || !userId) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Loading calendar...</p>
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
            <Button onClick={() => navigate('/appointments/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>

            <Button variant="outline" onClick={() => navigate('/blocked-time/new')}>
              <Clock className="h-4 w-4 mr-2" />
              Block Time
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 text-right">
            <p>Timezone: {userTimeZone}</p>
          </div>
        </div>

        <ReactBigCalendar
          events={allEvents}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          date={currentDate}
          onNavigate={handleCalendarNavigate}
          userTimeZone={userTimeZone}
        />
      </div>
    </Layout>
  );
};

export default CalendarContainer;
