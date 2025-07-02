
import React, { useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source?: 'internal' | 'nylas' | 'availability' | 'blocked_time';
  type?: string;
  className?: string;
  resource?: any;
}

interface ReactBigCalendarProps {
  events: CalendarEvent[];
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  date: Date;
  onNavigate: (date: Date) => void;
  userTimeZone?: string;
}

const ReactBigCalendar: React.FC<ReactBigCalendarProps> = ({
  events,
  onSelectSlot,
  onSelectEvent,
  date,
  onNavigate,
  userTimeZone = 'America/New_York',
}) => {
  // CRITICAL: Use simple localizer - timezone is already set globally
  const localizer = useMemo(() => {
    console.log('[ReactBigCalendar] FIXED: Using global moment timezone configuration');
    return momentLocalizer(moment);
  }, []);

  // Enhanced event style getter with proper className handling
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    console.log('[ReactBigCalendar] Styling event:', {
      id: event.id,
      title: event.title,
      source: event.source,
      className: event.className,
      start: event.start?.toISOString(),
      end: event.end?.toISOString()
    });

    return {
      className: event.className || `${event.source}-event`,
      style: {
        cursor: 'pointer',
      }
    };
  }, []);

  // Enhanced component getter with visual indicators
  const components = useMemo(() => ({
    event: ({ event }: { event: CalendarEvent }) => {
      const isBlockedTime = event.source === 'blocked_time';
      const isAvailability = event.source === 'availability';
      const isExternal = event.source === 'nylas';
      
      return (
        <div className="rbc-event-content">
          {isBlockedTime && (
            <span style={{ marginRight: '4px', fontSize: '12px' }}>🚫</span>
          )}
          {isExternal && (
            <span style={{ marginRight: '4px', fontSize: '12px' }}>📅</span>
          )}
          {isAvailability && (
            <span style={{ marginRight: '4px', fontSize: '12px' }}>✅</span>
          )}
          <span>{event.title}</span>
        </div>
      );
    },
  }), []);

  // Handle navigation events from React Big Calendar
  const handleNavigate = useCallback((newDate: Date, view?: string, action?: string) => {
    console.log('[ReactBigCalendar] Navigation triggered:', {
      newDate: newDate.toISOString(),
      view,
      action,
      timezone: userTimeZone
    });
    onNavigate(newDate);
  }, [onNavigate, userTimeZone]);

  // CRITICAL: Calendar configuration with ENFORCED overlap layout
  const calendarConfig = useMemo(() => ({
    localizer,
    events,
    date,
    onNavigate: handleNavigate,
    startAccessor: 'start',
    endAccessor: 'end',
    style: { height: 600 },
    views: {
      month: true,
      week: true,
      day: true,
    },
    defaultView: Views.WEEK,
    step: 30,
    timeslots: 2,
    eventPropGetter,
    components,
    onSelectSlot,
    onSelectEvent,
    selectable: true,
    popup: true,
    showMultiDayTimes: true,
    dayLayoutAlgorithm: 'overlap', // CRITICAL: ENFORCED overlap layout
    toolbar: true,
  }), [events, eventPropGetter, components, onSelectSlot, onSelectEvent, date, handleNavigate, localizer]);

  console.log('[ReactBigCalendar] FIXED: Rendering with ENFORCED overlap and global timezone:', {
    totalEvents: events.length,
    currentDate: date.toISOString(),
    userTimeZone,
    layoutAlgorithm: 'overlap',
    globalMomentTimezone: moment.tz.guess(),
    eventsBySource: {
      internal: events.filter(e => e.source === 'internal').length,
      blocked_time: events.filter(e => e.source === 'blocked_time').length,
      nylas: events.filter(e => e.source === 'nylas').length,
      availability: events.filter(e => e.source === 'availability').length,
    }
  });

  return (
    <div className="calendar-container">
      <Calendar {...calendarConfig} />
    </div>
  );
};

export default ReactBigCalendar;
