import React, { useCallback, useMemo, useState } from 'react';
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
  view?: string;
  onViewChange?: (view: string) => void;
}

const ReactBigCalendar: React.FC<ExtendedReactBigCalendarProps> = ({
  events,
  backgroundEvents = [],
  availabilitySlots = [],
  onSelectSlot,
  onSelectEvent,
  date,
  onNavigate,
  view: externalView,
  onViewChange,
  userTimeZone = 'America/New_York',
}) => {
  // View mapping between string and Views enum
  const getViewFromString = (viewString: string) => {
    switch (viewString.toLowerCase()) {
      case 'month': return Views.MONTH;
      case 'week': return Views.WEEK;
      case 'day': return Views.DAY;
      default: return Views.WEEK;
    }
  };

  const getStringFromView = (view: any) => {
    if (typeof view === 'string') return view;
    switch (view) {
      case Views.MONTH: return 'month';
      case Views.WEEK: return 'week';
      case Views.DAY: return 'day';
      default: return 'week';
    }
  };

  // Controlled view state - use enum internally
  const [internalView, setInternalView] = useState(Views.WEEK);
  const currentView = externalView ? getViewFromString(externalView) : internalView;
  
  // Handle view changes
  const handleViewChange = useCallback((newView: any) => {
    const viewString = getStringFromView(newView);
    console.log('[ReactBigCalendar] View change:', { from: getStringFromView(currentView), to: viewString });
    
    if (onViewChange) {
      onViewChange(viewString);
    } else {
      setInternalView(getViewFromString(viewString));
    }
  }, [currentView, onViewChange]);
  console.log('[ReactBigCalendar] Rendered with:', {
    eventsCount: events.length,
    backgroundEventsCount: backgroundEvents.length,
    availabilitySlotsCount: availabilitySlots.length,
    date: date.toISOString(),
    userTimeZone,
    sampleEvents: events.slice(0, 2).map(e => ({
      id: e.id,
      title: e.title,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      source: e.source
    }))
  });
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

  // Pure RBC configuration with controlled state for React 19 compatibility
  const calendarConfig = useMemo(() => ({
    localizer: globalLocalizer,
    events,
    backgroundEvents, // RBC native background events
    date, // Controlled date
    view: currentView, // Controlled view
    onNavigate: handleNavigate,
    onView: handleViewChange, // Controlled view changes
    startAccessor: 'start',
    endAccessor: 'end',
    titleAccessor: 'title',
    views: {
      month: true,
      week: true,
      day: true,
    },
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
    currentView, // Add currentView to dependencies
    handleNavigate,
    handleViewChange // Add handleViewChange to dependencies
  ]);

  return (
    <div className="rbc-calendar-container">
      <Calendar {...calendarConfig} />
    </div>
  );
};

export default ReactBigCalendar;
