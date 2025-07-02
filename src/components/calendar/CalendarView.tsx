
import React, { useState, useCallback, useMemo } from 'react';
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
  className?: string;
  resource?: any;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  date: Date;
  onNavigate: (date: Date) => void;
  userTimeZone?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onSelectSlot,
  onSelectEvent,
  date,
  onNavigate,
  userTimeZone = 'America/New_York',
}) => {
  // Pure RBC event styling - NO style overrides
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    return {
      className: event.className || `${event.source}-event`,
      style: {} // Pure RBC - no style overrides
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
    onNavigate(newDate);
  }, [onNavigate]);

  // Pure Calendar configuration with native overlap layout
  const calendarConfig = useMemo(() => ({
    localizer: globalLocalizer, // Global Luxon localizer
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
    eventPropGetter, // Pure RBC styling
    components,
    onSelectSlot,
    onSelectEvent,
    selectable: true,
    popup: true,
    showMultiDayTimes: true,
    dayLayoutAlgorithm: 'overlap', // Native overlap layout
    toolbar: true, // Use RBC's built-in toolbar
  }), [events, eventPropGetter, components, onSelectSlot, onSelectEvent, date, handleNavigate]);

  return (
    <div className="calendar-container">
      <Calendar {...calendarConfig} />
    </div>
  );
};

export default CalendarView;
