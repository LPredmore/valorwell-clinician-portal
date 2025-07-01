
import React from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
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
      type: event.type, // Preserve event type for styling
    };
  });

  // Debug logging for transformed events
  console.log('Transformed calendar events:', calendarEvents);
  console.log('All-day events:', calendarEvents.filter(e => e.allDay));
  console.log('Timed events:', calendarEvents.filter(e => !e.allDay));
  console.log('Availability events:', calendarEvents.filter(e => e.source === 'availability'));
  console.log('Blocked time events:', calendarEvents.filter(e => e.type === 'blocked_time'));

  // Enhanced event style getter with sophisticated blocked time styling
  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';
    let opacity = 0.8;
    let color = 'white';
    
    if (event.type === 'blocked_time') {
      // Enhanced styling for blocked time with gradient and pattern
      backgroundColor = '#6b7280'; // Gray-500
      borderColor = '#374151'; // Gray-700
      opacity = 0.95;
      color = 'white';
      
      return {
        style: {
          backgroundColor,
          borderColor,
          borderRadius: '6px',
          opacity,
          color,
          border: `2px solid ${borderColor}`,
          display: 'block',
          fontWeight: '700',
          fontSize: '12px',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          background: `linear-gradient(135deg, ${backgroundColor} 0%, #4b5563 100%)`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
        },
      };
    } else if (event.source === 'internal') {
      backgroundColor = '#3174ad'; // Blue for internal
      borderColor = '#1e40af';
    } else if (event.source === 'nylas') {
      backgroundColor = '#f57c00'; // Orange for external
      borderColor = '#e65100';
    } else if (event.source === 'availability') {
      backgroundColor = '#e5e7eb'; // Light gray for availability
      borderColor = '#d1d5db';
      opacity = 0.6;
      color = '#374151';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '4px',
        opacity,
        color,
        border: `1px solid ${borderColor}`,
        display: 'block',
        fontWeight: event.source === 'internal' ? '500' : 'normal',
        transition: 'all 0.2s ease-in-out',
      },
    };
  };

  // Enhanced event component with sophisticated blocked time indicators
  const EventComponent = ({ event }: { event: any }) => {
    if (event.type === 'blocked_time') {
      return (
        <div className="relative h-full w-full overflow-hidden">
          {/* Striped pattern overlay for blocked time */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
            }}
          />
          
          <div className="relative z-10 p-1 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1">
              <span className="text-xs font-bold truncate flex-1 leading-tight">
                {event.title}
              </span>
              <Badge 
                variant="secondary" 
                className="text-[9px] px-1 py-0 h-4 bg-red-100 text-red-800 border-red-200 font-bold"
              >
                🚫
              </Badge>
            </div>
            
            <div className="text-[10px] opacity-90 font-medium">
              BLOCKED
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-sm p-1">
        <div className="flex items-center justify-between">
          <strong className="truncate text-xs">{event.title}</strong>
        </div>
        {event.source === 'nylas' && (
          <div className="text-xs opacity-75 mt-1">
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              📅 External
            </Badge>
          </div>
        )}
        {event.source === 'availability' && (
          <div className="text-xs opacity-75 mt-1">
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-green-50 text-green-700 border-green-200">
              ✅ Available
            </Badge>
          </div>
        )}
        {event.allDay && (
          <div className="text-xs opacity-75 mt-1">
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              All Day
            </Badge>
          </div>
        )}
      </div>
    );
  };

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
        tooltipAccessor={(event) => {
          if (event.type === 'blocked_time') {
            return `🚫 Blocked Time: ${event.title} - This time slot is unavailable for appointments`;
          }
          if (event.source === 'availability') {
            return `✅ Available Time - Click 'New Appointment' to book this slot`;
          }
          if (event.source === 'nylas') {
            return `📅 External Event: ${event.title} - Synced from external calendar`;
          }
          return `📋 ${event.title} - Click to view details`;
        }}
      />
    </div>
  );
};

export default ReactBigCalendar;
