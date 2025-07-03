import React, { useCallback, useMemo } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import { globalLocalizer } from '@/main';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent, ReactBigCalendarProps } from './types';
import { DateTime } from 'luxon';

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

  // Pure RBC configuration with native availability features
  const calendarConfig = useMemo(() => ({
    localizer: globalLocalizer,
    events,
    backgroundEvents, // RBC native background events
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
    eventPropGetter,
    backgroundEventPropGetter, // Style background events (availability)
    onSelectSlot,
    onSelectEvent,
    selectable: true,
    popup: true,
    showMultiDayTimes: true,
    toolbar: true,
  }), [
    events,
    backgroundEvents,
    eventPropGetter,
    backgroundEventPropGetter,
    onSelectSlot,
    onSelectEvent,
    date,
    handleNavigate
  ]);

  return (
    <div className="rbc-calendar-container">
      <Calendar {...calendarConfig} />
    </div>
  );
};

export default ReactBigCalendar;
