import React, { useCallback, useMemo } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import { globalLocalizer } from '@/main';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent, ReactBigCalendarProps } from './types';
import { getCalendarTimeBounds } from '@/utils/timezoneHelpers';

interface ExtendedReactBigCalendarProps extends ReactBigCalendarProps {
  backgroundEvents?: Array<{
    start: Date;
    end: Date;
    resource?: any;
  }>;
  availabilitySlots?: Array<{
    day: string;
    slot: number;
    startTime: string;
    endTime: string;
  }>;
  calendarStartTime?: string;
  calendarEndTime?: string;
}

const ReactBigCalendar: React.FC<ExtendedReactBigCalendarProps> = ({
  events,
  backgroundEvents = [],
  availabilitySlots = [],
  onSelectSlot,
  onSelectEvent,
  date,
  onNavigate,
  userTimeZone = 'America/New_York',
  calendarStartTime = '08:00',
  calendarEndTime = '21:00',
}) => {
  // Pure RBC event styling - minimal differentiation for real events only
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    
    switch (event.source) {
      case 'blocked_time':
        backgroundColor = '#dc3545';
        break;
      case 'nylas':
        backgroundColor = '#6f42c1';
        break;
      default:
        backgroundColor = '#3174ad';
    }
    
    return {
      style: {
        backgroundColor,
        borderColor: backgroundColor,
        color: 'white'
      }
    };
  }, []);

  // Background event styling for availability - using a clearer light green
  const backgroundEventPropGetter = useCallback(() => ({
    style: {
      backgroundColor: '#d4edda', // slightly more visible light green
      opacity: 0.5,
      border: 'none'
    }
  }), []);

  // RBC navigation handler
  const handleNavigate = useCallback((newDate: Date) => {
    onNavigate(newDate);
  }, [onNavigate]);

  // Get calendar time bounds using unified timezone handling
  const { start: minTime, end: maxTime } = useMemo(() => {
    return getCalendarTimeBounds(calendarStartTime, calendarEndTime, userTimeZone);
  }, [calendarStartTime, calendarEndTime, userTimeZone]);

  // CRITICAL: Validate all events and background events before passing to RBC
  const validatedEvents = useMemo(() => {
    const valid = events.filter(event => {
      // Validate event structure
      if (!event || !event.id || !event.start || !event.end) {
        console.error('[ReactBigCalendar] Invalid event structure:', event);
        return false;
      }
      
      // Validate dates
      if (isNaN(event.start.getTime()) || isNaN(event.end.getTime())) {
        console.error('[ReactBigCalendar] Invalid event dates:', {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          startTime: event.start?.getTime(),
          endTime: event.end?.getTime()
        });
        return false;
      }
      
      return true;
    });
    
    console.log('[ReactBigCalendar] Event validation:', {
      originalCount: events.length,
      validCount: valid.length,
      filteredOut: events.length - valid.length
    });
    
    return valid;
  }, [events]);
  
  const validatedBackgroundEvents = useMemo(() => {
    const valid = backgroundEvents.filter(event => {
      // Validate background event structure
      if (!event || !event.start || !event.end) {
        console.error('[ReactBigCalendar] Invalid background event structure:', event);
        return false;
      }
      
      // Validate dates
      if (isNaN(event.start.getTime()) || isNaN(event.end.getTime())) {
        console.error('[ReactBigCalendar] Invalid background event dates:', {
          start: event.start,
          end: event.end,
          startTime: event.start?.getTime(),
          endTime: event.end?.getTime()
        });
        return false;
      }
      
      return true;
    });
    
    console.log('[ReactBigCalendar] Background event validation:', {
      originalCount: backgroundEvents.length,
      validCount: valid.length,
      filteredOut: backgroundEvents.length - valid.length
    });
    
    return valid;
  }, [backgroundEvents]);

  // Pure RBC configuration with native availability features
  const calendarConfig = useMemo(() => ({
    localizer: globalLocalizer,
    events: validatedEvents,
    backgroundEvents: validatedBackgroundEvents, // RBC native background events
    date,
    onNavigate: handleNavigate,
    startAccessor: 'start',
    endAccessor: 'end',
    titleAccessor: 'title',
    views: {
      month: true,
      week: true,
      day: true,
    },
    defaultView: Views.WEEK,
    step: 30,
    timeslots: 1, // Use 1 timeslot per step for cleaner availability display
    min: minTime, // Calendar display start time
    max: maxTime, // Calendar display end time
    eventPropGetter,
    backgroundEventPropGetter, // Style background events (availability)
    onSelectSlot,
    onSelectEvent,
    selectable: true,
    popup: true,
    showMultiDayTimes: true,
    toolbar: true,
  }), [
    validatedEvents,
    validatedBackgroundEvents,
    eventPropGetter,
    backgroundEventPropGetter,
    onSelectSlot,
    onSelectEvent,
    date,
    handleNavigate,
    minTime,
    maxTime
  ]);

  return (
    <div className="rbc-calendar-container">
      <Calendar {...calendarConfig} />
    </div>
  );
};

export default ReactBigCalendar;
