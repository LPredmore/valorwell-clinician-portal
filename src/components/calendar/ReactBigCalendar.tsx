
import React from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface Event {
  id?: string;
  title?: string;
  start?: string | Date;
  end?: string | Date;
  start_at?: string;
  end_at?: string;
  start_time?: string;
  end_time?: string;
  clientName?: string;
  source?: 'internal' | 'nylas';
  type?: string;
  when?: {
    start_time?: string;
    end_time?: string;
  };
  connection_provider?: string;
}

interface ReactBigCalendarProps {
  events: Event[];
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent?: (event: Event) => void;
}

const ReactBigCalendar: React.FC<ReactBigCalendarProps> = ({
  events,
  onSelectSlot,
  onSelectEvent,
}) => {
  // Transform events to react-big-calendar format
  const calendarEvents = events.map((event) => {
    let start: Date;
    let end: Date;
    let title: string;

    // Handle different event formats
    if (event.source === 'internal') {
      // Internal appointments
      start = new Date(event.start_at || event.start || new Date());
      end = new Date(event.end_at || event.end || new Date());
      title = event.clientName || event.title || 'Internal Appointment';
    } else {
      // Nylas events
      start = new Date(event.when?.start_time || event.start_time || event.start || new Date());
      end = new Date(event.when?.end_time || event.end_time || event.end || new Date());
      title = event.title || 'External Event';
    }

    return {
      id: event.id,
      title,
      start,
      end,
      resource: event, // Store original event data
      source: event.source,
    };
  });

  // Custom event style getter
  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3174ad';
    
    if (event.source === 'internal') {
      backgroundColor = '#3174ad'; // Blue for internal
    } else if (event.source === 'nylas') {
      backgroundColor = '#f57c00'; // Orange for external
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    };
  };

  // Custom event component
  const EventComponent = ({ event }: { event: any }) => (
    <div className="text-sm">
      <strong>{event.title}</strong>
      {event.source === 'nylas' && (
        <div className="text-xs opacity-75">External</div>
      )}
    </div>
  );

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        onSelectSlot={onSelectSlot}
        onSelectEvent={(event) => onSelectEvent?.(event.resource)}
        selectable
        eventPropGetter={eventStyleGetter}
        components={{
          event: EventComponent,
        }}
        defaultView={Views.WEEK}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        step={30}
        showMultiDayTimes
        popup
      />
    </div>
  );
};

export default ReactBigCalendar;
