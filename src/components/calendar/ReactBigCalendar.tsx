
import React from 'react';
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
}) => {
  return (
    <div className="calendar-container">
      <div className="rbc-reset">
        <Calendar
          localizer={globalLocalizer}
          events={events}
          date={date}
          onNavigate={onNavigate}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          views={{
            month: true,
            week: true,
            day: true,
          }}
          defaultView={Views.WEEK}
          step={30}
          timeslots={2}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          selectable={true}
          popup={true}
          showMultiDayTimes={true}
          toolbar={true}
        />
      </div>
    </div>
  );
};

export default ReactBigCalendar;
