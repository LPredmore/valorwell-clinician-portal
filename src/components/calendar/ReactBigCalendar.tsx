import React, { useCallback, useMemo, useEffect } from 'react';
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
  // CRITICAL: Early loading guard - must be BEFORE any hooks to prevent crashes
  if (userTimeZone === 'loading') {
    console.log('[ReactBigCalendar] LOADING GUARD: Timezone still loading, showing loading state');
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }
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
    try {
      const bounds = getCalendarTimeBounds(calendarStartTime, calendarEndTime, userTimeZone);
      
      // Phase 1: Browser vs User Timezone Diagnostic
      console.log('[ReactBigCalendar] TIMEZONE DIAGNOSTIC:', {
        userConfiguredTimezone: userTimeZone,
        browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        browserUTCOffset: new Date().getTimezoneOffset(),
        
        // Test the Date objects directly
        minTimeUTC: bounds.start.toISOString(),
        maxTimeUTC: bounds.end.toISOString(),
        minTimeLocal: bounds.start.toString(),
        maxTimeLocal: bounds.end.toString(),
        
        // Show what React Big Calendar will actually use
        minTimeHours: bounds.start.getHours(),
        maxTimeHours: bounds.end.getHours(),
        minTimeMinutes: bounds.start.getMinutes(),
        maxTimeMinutes: bounds.end.getMinutes(),
      });
      
      console.log('[ReactBigCalendar] DIAGNOSTIC: Time bounds from getCalendarTimeBounds:', {
        calendarStartTime,
        calendarEndTime,
        userTimeZone,
        boundsStart: bounds.start.toISOString(),
        boundsEnd: bounds.end.toISOString(),
        startHours: bounds.start.getHours(),
        endHours: bounds.end.getHours(),
        spansMultipleDays: bounds.start.getDate() !== bounds.end.getDate()
      });
      
      // For 24-hour display (00:00 to 23:59), bounds.end will be next day at midnight
      // This is correct for React Big Calendar's 24-hour display
      if (bounds.start >= bounds.end) {
        console.error('[ReactBigCalendar] Invalid time order: start >= end');
        throw new Error('Start time must be before end time');
      }
      
      return bounds;
    } catch (error) {
      console.error('[ReactBigCalendar] CRITICAL: Time bounds calculation failed:', error.message);
      console.error('[ReactBigCalendar] CRITICAL: This should not happen with the new 24-hour logic');
      // Emergency fallback - but this should not be reached with proper 24-hour setup
      const today = new Date();
      const fallbackStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const fallbackEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0);
      console.error('[ReactBigCalendar] CRITICAL: Using emergency 24-hour fallback');
      return { start: fallbackStart, end: fallbackEnd };
    }
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
  const calendarConfig = useMemo(() => {
    // Phase 3: React Big Calendar Configuration Debug
    console.log('[ReactBigCalendar] CALENDAR CONFIG DEEP DIVE:', {
      localizerType: typeof globalLocalizer,
      localizerTimezone: globalLocalizer.timezone,
      
      // Test how RBC interprets our Date objects
      minTimeInterpretation: {
        asUTC: minTime.toUTCString(),
        asLocal: minTime.toString(),
        hours: minTime.getHours(),
        utcHours: minTime.getUTCHours(),
        timezoneOffset: minTime.getTimezoneOffset(),
      },
      
      maxTimeInterpretation: {
        asUTC: maxTime.toUTCString(),
        asLocal: maxTime.toString(),
        hours: maxTime.getHours(),
        utcHours: maxTime.getUTCHours(),
        timezoneOffset: maxTime.getTimezoneOffset(),
      },
      
      // Show what the calendar will actually display
      expectedDisplayRange: {
        startHour: minTime.getHours(),
        endHour: maxTime.getHours(),
        totalHours: (maxTime.getTime() - minTime.getTime()) / (1000 * 60 * 60),
        isValid: minTime < maxTime,
      }
    });
    
    console.log('[ReactBigCalendar] DIAGNOSTIC: Building calendar config with:', {
      eventsCount: validatedEvents.length,
      backgroundEventsCount: validatedBackgroundEvents.length,
      minTime,
      maxTime,
      minTimeValid: minTime instanceof Date && !isNaN(minTime.getTime()),
      maxTimeValid: maxTime instanceof Date && !isNaN(maxTime.getTime()),
      minTimeHours: minTime?.getHours(),
      maxTimeHours: maxTime?.getHours(),
      step: 30,
      timeslots: 1
    });
    
    const config = {
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
    };
    
    console.log('[ReactBigCalendar] DIAGNOSTIC: Final calendar config created:', {
      configKeys: Object.keys(config),
      hasLocalizer: !!config.localizer,
      eventsLength: config.events.length,
      backgroundEventsLength: config.backgroundEvents.length,
      minTimeConfig: config.min,
      maxTimeConfig: config.max
    });
    
    return config;
  }, [
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

  // Phase 4: Real-Time Monitoring
  useEffect(() => {
    console.log('[ReactBigCalendar] POST-RENDER VALIDATION:', {
      // Check if calendar actually rendered with correct times
      renderedMinTime: minTime,
      renderedMaxTime: maxTime,
      
      // Validate the time slots that should be visible
      expectedTimeSlots: Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0');
        return `${hour}:00`;
      }),
      
      // Browser vs user timezone comparison
      timezoneDiscrepancy: {
        userTimezone: userTimeZone,
        browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offsetDifference: new Date().getTimezoneOffset(),
      }
    });
  }, [minTime, maxTime, userTimeZone]);

  return (
    <div className="rbc-calendar-container">
      {(() => {
        try {
          console.log('[ReactBigCalendar] DIAGNOSTIC: About to render Calendar component with config:', {
            eventsCount: calendarConfig.events.length,
            backgroundEventsCount: calendarConfig.backgroundEvents.length,
            minTime: calendarConfig.min,
            maxTime: calendarConfig.max,
            step: calendarConfig.step,
            timeslots: calendarConfig.timeslots
          });
          
          return <Calendar {...calendarConfig} />;
        } catch (error) {
          console.error('[ReactBigCalendar] DIAGNOSTIC: Calendar component failed to render:', {
            error: error.message,
            stack: error.stack,
            calendarConfig: {
              eventsCount: calendarConfig.events.length,
              backgroundEventsCount: calendarConfig.backgroundEvents.length,
              minTime: calendarConfig.min,
              maxTime: calendarConfig.max,
              step: calendarConfig.step,
              timeslots: calendarConfig.timeslots
            }
          });
          
          return (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="text-red-800 font-semibold">Calendar Error</h3>
              <p className="text-red-600">Failed to render calendar: {error.message}</p>
            </div>
          );
        }
      })()}
    </div>
  );
};

export default ReactBigCalendar;
