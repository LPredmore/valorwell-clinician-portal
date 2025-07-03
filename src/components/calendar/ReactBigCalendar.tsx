
import React, { useCallback, useMemo } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import { globalLocalizer } from '@/main';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent, ReactBigCalendarProps } from './types';

const ReactBigCalendar: React.FC<ReactBigCalendarProps> = ({
  events,
  onSelectSlot,
  onSelectEvent,
  date,
  onNavigate,
  userTimeZone = 'America/New_York',
}) => {
  // Pure RBC event styling - minimal differentiation
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    
    switch (event.source) {
      case 'blocked_time':
        backgroundColor = '#dc3545';
        break;
      case 'availability':
        backgroundColor = '#28a745';
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

  // RBC navigation handler
  const handleNavigate = useCallback((newDate: Date) => {
    onNavigate(newDate);
  }, [onNavigate]);

  // Pure RBC configuration
  const calendarConfig = useMemo(() => ({
    localizer: globalLocalizer,
    events,
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
    timeslots: 2,
    eventPropGetter,
    onSelectSlot,
    onSelectEvent,
    selectable: true,
    popup: true,
    showMultiDayTimes: true,
    toolbar: true,
  }), [events, eventPropGetter, onSelectSlot, onSelectEvent, date, handleNavigate]);

  return (
    <div className="rbc-calendar-container">
      <Calendar {...calendarConfig} />
    </div>
  );
};

export default ReactBigCalendar;
