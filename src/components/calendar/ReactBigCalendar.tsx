
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
  client_name?: string;
  source?: 'internal' | 'nylas' | 'availability';
  type?: string;
  when?: {
    object?: string;
    start_time?: string;
    end_time?: string;
    date?: string;
    start_timezone?: string;
    end_timezone?: string;
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
  // Debug logging for raw event data
  console.log('Raw Nylas events:', events.filter(e => e.source === 'nylas'));
  console.log('Raw Internal events:', events.filter(e => e.source === 'internal'));
  console.log('Raw Availability events:', events.filter(e => e.source === 'availability'));

  // Transform events to react-big-calendar format
  const calendarEvents = events.map((event) => {
    let start: Date;
    let end: Date;
    let title: string;
    let allDay = false;

    // Handle different event formats
    if (event.source === 'internal') {
      // Internal appointments - use the Date objects injected by CalendarSimple
      start = event.start instanceof Date ? event.start : new Date(event.start as string);
      end = event.end instanceof Date ? event.end : new Date(event.end as string);
      title = event.clientName || event.client_name || event.title || 'Internal Appointment';
    } else if (event.source === 'availability') {
      // Availability events
      start = new Date(event.start || new Date());
      end = new Date(event.end || new Date());
      title = event.title || 'Available';
    } else {
      // Nylas events - handle all-day events properly
      if (event.when?.object === 'date') {
        // All-day event
        start = new Date(event.when.date + 'T00:00:00');
        end = new Date(event.when.date + 'T23:59:59');
        allDay = true;
        console.log('All-day event detected:', {
          title: event.title,
          date: event.when.date,
          start: start.toISOString(),
          end: end.toISOString()
        });
      } else if (event.when?.start_time && event.when?.end_time) {
        // Timed event
        start = new Date(event.when.start_time);
        end = new Date(event.when.end_time);
        console.log('Timed event detected:', {
          title: event.title,
          start_time: event.when.start_time,
          end_time: event.when.end_time,
          start: start.toISOString(),
          end: end.toISOString()
        });
      } else {
        // Fallback parsing
        start = new Date(event.start_at || event.start_time || event.start || new Date());
        end = new Date(event.end_at || event.end_time || event.end || new Date());
        console.log('Fallback event parsing:', {
          title: event.title,
          original: event,
          start: start.toISOString(),
          end: end.toISOString()
        });
      }
      title = event.title || 'External Event';
    }

    return {
      id: event.id,
      title,
      start,
      end,
      allDay,
      resource: event, // Store original event data
      source: event.source,
    };
  });

  // Debug logging for transformed events
  console.log('Transformed calendar events:', calendarEvents);
  console.log('All-day events:', calendarEvents.filter(e => e.allDay));
  console.log('Timed events:', calendarEvents.filter(e => !e.allDay));
  console.log('Availability events:', calendarEvents.filter(e => e.source === 'availability'));

  // Custom event style getter
  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';
    let opacity = 0.8;
    
    if (event.source === 'internal') {
      backgroundColor = '#3174ad'; // Blue for internal
      borderColor = '#3174ad';
    } else if (event.source === 'nylas') {
      backgroundColor = '#f57c00'; // Orange for external
      borderColor = '#f57c00';
    } else if (event.source === 'availability') {
      backgroundColor = '#e0e0e0'; // Light gray for availability
      borderColor = '#bdbdbd';
      opacity = 0.5; // More transparent for availability blocks
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '4px',
        opacity,
        color: event.source === 'availability' ? '#666' : 'white',
        border: `1px solid ${borderColor}`,
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
      {event.source === 'availability' && (
        <div className="text-xs opacity-75">Available</div>
      )}
      {event.allDay && (
        <div className="text-xs opacity-75">All Day</div>
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
        titleAccessor="title"
        allDayAccessor="allDay"
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
