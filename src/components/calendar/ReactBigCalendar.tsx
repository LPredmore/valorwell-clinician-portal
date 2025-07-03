
import React, { useCallback, useMemo } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import { globalLocalizer } from '@/main';
import 'react-big-calendar/lib/css/react-big-calendar.css';

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
  // Pure RBC event styling - NO overrides, let RBC handle everything natively
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    // Use RBC's native color system based on event source
    let backgroundColor = '#3174ad'; // RBC default blue
    
    switch (event.source) {
      case 'blocked_time':
        backgroundColor = '#dc3545'; // Red for blocked time
        break;
      case 'availability':
        backgroundColor = '#28a745'; // Green for availability
        break;
      case 'nylas':
        backgroundColor = '#6f42c1'; // Purple for external events
        break;
      default:
        backgroundColor = '#3174ad'; // Default RBC blue
    }
    
    return {
      style: {
        backgroundColor,
        borderColor: backgroundColor,
        color: 'white'
      }
    };
  }, []);

  // Pure RBC component configuration - no custom wrappers or overrides
  const components = useMemo(() => ({
    event: ({ event }: { event: CalendarEvent }) => {
      // Use RBC's native event title display with minimal enhancement
      const getEventIcon = (source?: string) => {
        switch (source) {
          case 'blocked_time': return '🚫 ';
          case 'availability': return '✅ ';
          case 'nylas': return '📅 ';
          default: return '';
        }
      };
      
      return (
        <span>
          {getEventIcon(event.source)}
          {event.title}
        </span>
      );
    },
  }), []);

  // Handle navigation events from React Big Calendar
  const handleNavigate = useCallback((newDate: Date, view?: string, action?: string) => {
    onNavigate(newDate);
  }, [onNavigate]);

  // Pure RBC configuration - no custom styling or overrides
  const calendarConfig = useMemo(() => ({
    localizer: globalLocalizer,
    events,
    date,
    onNavigate: handleNavigate,
    startAccessor: 'start',
    endAccessor: 'end',
    // Remove hardcoded height - let RBC handle responsive sizing
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
    dayLayoutAlgorithm: 'overlap', // Native RBC overlap layout
    toolbar: true,
  }), [events, eventPropGetter, components, onSelectSlot, onSelectEvent, date, handleNavigate]);

  // Pure RBC rendering - no custom containers or wrappers
  return <Calendar {...calendarConfig} />;
};

export default ReactBigCalendar;
