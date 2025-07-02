import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import CalendarErrorBoundary from "../components/calendar/CalendarErrorBoundary";
import ReactBigCalendar from "@/components/calendar/ReactBigCalendar";
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

const CalendarSimple = React.memo(() => {
  const { userId, authInitialized, userRole } = useUser();
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userTimeZone, setUserTimeZone] = useState<string>(TimeZoneService.DEFAULT_TIMEZONE);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Calculate week boundaries
  const { start: weekStart, end: weekEnd } = useMemo(() => {
    const tz = userTimeZone || TimeZoneService.DEFAULT_TIMEZONE;
    return getWeekRange(currentDate, tz);
  }, [currentDate, userTimeZone]);

  // Fetch data
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

  const { blockedTimes, isLoading: blockedTimesLoading } = useBlockedTime(
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

  // Transform availability events
  const availabilityEvents = useMemo(() => {
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
        
        const startDT = DateTime.fromISO(startISO, { zone: tz });
        const endDT = DateTime.fromISO(endISO, { zone: tz });
        
        return {
          id: `avail-${slot.day}-${slot.slot}-${d.toISODate()}`,
          title: 'Available',
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          source: 'availability',
          type: 'availability',
          className: 'availability-event',
          resource: slot
        };
      });
    });
  }, [availabilitySlots, weekStart, weekEnd, userTimeZone]);

  // Transform blocked time events
  const blockedTimeEvents = useMemo(() => {
    return blockedTimes.map(blockedTime => {
      const startDT = DateTime.fromISO(blockedTime.start_at, { zone: 'utc' }).setZone(userTimeZone);
      const endDT = DateTime.fromISO(blockedTime.end_at, { zone: 'utc' }).setZone(userTimeZone);

      return {
        id: blockedTime.id,
        title: blockedTime.label,
        start: startDT.toJSDate(),
        end: endDT.toJSDate(),
        source: 'blocked_time',
        type: 'blocked_time',
        className: 'blocked-time-event',
        resource: blockedTime
      };
    });
  }, [blockedTimes, userTimeZone]);

  // Combine all events
  const allEvents = useMemo(() => {
    const events = [];
    
    // Add appointments
    if (appointments) {
      events.push(...appointments.map(apt => {
        const startDT = DateTime.fromISO(apt.start_at, { zone: 'utc' }).setZone(userTimeZone);
        const endDT = DateTime.fromISO(apt.end_at, { zone: 'utc' }).setZone(userTimeZone);

        return {
          ...apt,
          source: 'internal',
          type: 'appointment',
          className: 'internal-event',
          title: apt.clientName || 'Internal Appointment',
          start: startDT.toJSDate(),
          end: endDT.toJSDate(),
          resource: apt,
          priority: 1
        };
      }));
    }
    
    // Add Nylas events
    if (nylasEvents) {
      events.push(...nylasEvents.map(evt => ({
        ...evt,
        source: 'nylas',
        type: 'external',
        className: 'external-event',
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

    return events.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }, [appointments, nylasEvents, blockedTimeEvents, availabilityEvents]);

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

  // Handle navigation
  const handleCalendarNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Handle slot selection - navigate to route instead of opening dialog
  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    navigate('/appointments/new', { 
      state: { 
        start: slotInfo.start, 
        end: slotInfo.end 
      } 
    });
  }, [navigate]);

  // Handle event click - navigate to routes instead of opening dialogs
  const handleSelectEvent = useCallback((event: any) => {
    if (event.source === 'internal') {
      navigate(`/appointments/${event.id}`);
    } else if (event.source === 'nylas') {
      toast({
        title: "📅 External Event",
        description: `${event.title} - Synced from ${event.connection_provider || 'external calendar'}`,
        duration: 3000,
      });
    } else if (event.source === 'blocked_time') {
      navigate(`/blocked-time/${event.id}`);
    } else if (event.source === 'availability') {
      toast({
        title: "✅ Available Time",
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
    
    if (userRole === 'clinician' || userRole === 'admin') {
      setIsReady(true);
    }
  }, [authInitialized, userId, userRole, navigate]);

  // Timezone loading effect
  useEffect(() => {
    if (!isReady || !userId) return;
    loadUserTimeZone(userId);
  }, [isReady, userId, loadUserTimeZone]);

  // Early returns for loading states
  if (!authInitialized || !userId || !isReady) {
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

  const currentMonthDisplay = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <Layout>
      <CalendarErrorBoundary>
        <div className="p-6">
          {/* Header with action buttons */}
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
            
            <h1 className="text-2xl font-bold text-gray-800">
              {currentMonthDisplay}
            </h1>
            
            <div className="text-sm text-gray-600 text-right">
              <p>Timezone: {userTimeZone}</p>
            </div>
          </div>

          {/* React Big Calendar */}
          <ReactBigCalendar
            events={allEvents}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            date={currentDate}
            onNavigate={handleCalendarNavigate}
            userTimeZone={userTimeZone}
          />
        </div>
      </CalendarErrorBoundary>
    </Layout>
  );
});

export default CalendarSimple;
