
import React, { useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';

const localizer = momentLocalizer(moment);

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
}

const ReactBigCalendar: React.FC<ReactBigCalendarProps> = ({
  events,
  onSelectSlot,
  onSelectEvent,
  date,
  onNavigate,
}) => {
  // Updated event style getter - preserve className and minimal inline styles
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    console.log('[ReactBigCalendar] Styling event with preserved className:', {
      id: event.id,
      title: event.title,
      source: event.source,
      type: event.type,
      className: event.className
    });

    // Use the className from the event object (set in CalendarSimple.tsx)
    const className = event.className || `${event.source}-event` || 'default-event';
    
    // Minimal inline styles - let CSS handle the heavy lifting
    const style: React.CSSProperties = {
      // Only set essential styles, let CSS z-index take precedence
      cursor: 'pointer',
    };

    console.log('[ReactBigCalendar] Applied layering-friendly styling:', {
      eventId: event.id,
      eventSource: event.source,
      eventType: event.type,
      finalClassName: className,
      preservedFromEvent: event.className
    });

    return {
      className,
      style,
    };
  }, []);

  // Clean component getter with enhanced visual indicators
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
      previousDate: date.toISOString()
    });
    onNavigate(newDate);
  }, [onNavigate, date]);

  // Memoized calendar configuration - REMOVED dayLayoutAlgorithm to allow overlapping
  const calendarConfig = useMemo(() => ({
    localizer,
    events,
    date, // Controlled date
    onNavigate: handleNavigate, // Handle navigation
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
    // REMOVED: dayLayoutAlgorithm: 'no-overlap' - this was preventing our z-index layering
    toolbar: true, // Enable native toolbar
  }), [events, eventPropGetter, components, onSelectSlot, onSelectEvent, date, handleNavigate]);

  console.log('[ReactBigCalendar] Rendering calendar with z-index layering (no layout algorithm interference):', {
    totalEvents: events.length,
    currentDate: date.toISOString(),
    eventsBySource: {
      internal: events.filter(e => e.source === 'internal').length,
      blocked_time: events.filter(e => e.source === 'blocked_time').length,
      nylas: events.filter(e => e.source === 'nylas').length,
      availability: events.filter(e => e.source === 'availability').length,
    },
    eventsByClassName: {
      'availability-event': events.filter(e => e.className === 'availability-event').length,
      'internal-event': events.filter(e => e.className === 'internal-event').length,
      'external-event': events.filter(e => e.className === 'external-event').length,
      'blocked-time-event': events.filter(e => e.className === 'blocked-time-event').length,
    },
    eventsPreview: events.slice(0, 3).map(e => ({
      id: e.id,
      title: e.title,
      source: e.source,
      type: e.type,
      className: e.className,
      start: e.start?.toISOString(),
      end: e.end?.toISOString()
    }))
  });

  return (
    <div className="calendar-container">
      <Calendar {...calendarConfig} />
    </div>
  );
};

export default ReactBigCalendar;
