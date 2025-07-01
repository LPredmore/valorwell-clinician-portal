
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
  // Clean event style getter - only handles new blocked_time table events
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    console.log('[ReactBigCalendar] Styling event:', {
      id: event.id,
      title: event.title,
      source: event.source,
      type: event.type
    });

    let style: React.CSSProperties = {};
    let className = '';

    // Style based on source - clean implementation
    switch (event.source) {
      case 'internal':
        // Regular internal appointments
        className = 'internal-event';
        style = {
          backgroundColor: '#3174ad',
          border: '1px solid #1e3a8a',
          color: 'white',
          borderRadius: '4px',
        };
        break;
        
      case 'blocked_time':
        // Blocked time from dedicated blocked_time table
        className = 'blocked-time-event';
        style = {
          backgroundColor: '#6b7280',
          border: '2px solid #374151',
          color: 'white',
          borderRadius: '6px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        };
        break;
        
      case 'nylas':
        // External calendar events
        className = 'external-event';
        style = {
          backgroundColor: '#f57c00',
          border: '1px solid #d84315',
          color: 'white',
          borderRadius: '4px',
        };
        break;
        
      case 'availability':
        // Availability slots
        className = 'availability-event';
        style = {
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px dashed #22c55e',
          color: '#15803d',
          borderRadius: '4px',
        };
        break;
        
      default:
        // Default styling
        className = 'default-event';
        style = {
          backgroundColor: '#3174ad',
          border: '1px solid #1e3a8a',
          color: 'white',
          borderRadius: '4px',
        };
    }

    console.log('[ReactBigCalendar] Applied clean styling:', {
      eventId: event.id,
      eventSource: event.source,
      eventType: event.type,
      className,
      backgroundColor: style.backgroundColor
    });

    return {
      className,
      style,
    };
  }, []);

  // Clean component getter
  const components = useMemo(() => ({
    event: ({ event }: { event: CalendarEvent }) => {
      const isBlockedTime = event.source === 'blocked_time';
      
      return (
        <div className="rbc-event-content">
          {isBlockedTime && (
            <span style={{ marginRight: '4px', fontSize: '12px' }}>🚫</span>
          )}
          {event.source === 'nylas' && (
            <span style={{ marginRight: '4px', fontSize: '12px' }}>📅</span>
          )}
          {event.source === 'availability' && (
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

  // Memoized calendar configuration with controlled date and navigation
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
    dayLayoutAlgorithm: 'no-overlap',
    toolbar: true, // Enable native toolbar
  }), [events, eventPropGetter, components, onSelectSlot, onSelectEvent, date, handleNavigate]);

  console.log('[ReactBigCalendar] Rendering calendar with native navigation:', {
    totalEvents: events.length,
    currentDate: date.toISOString(),
    eventsBySource: {
      internal: events.filter(e => e.source === 'internal').length,
      blocked_time: events.filter(e => e.source === 'blocked_time').length,
      nylas: events.filter(e => e.source === 'nylas').length,
      availability: events.filter(e => e.source === 'availability').length,
    },
    eventsPreview: events.slice(0, 3).map(e => ({
      id: e.id,
      title: e.title,
      source: e.source,
      type: e.type,
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
