
import { useMemo } from 'react';
import { DateTime } from 'luxon';
import { TimeBlock, AppointmentBlock } from '@/components/calendar/week-view/types';

interface UseTimeRangeProps {
  appointmentBlocks: AppointmentBlock[];
  timeBlocks: TimeBlock[];
  weekDays: DateTime[];
}

interface TimeRange {
  startHour: number;
  endHour: number;
}

export const useTimeRange = ({ 
  appointmentBlocks, 
  timeBlocks, 
  weekDays 
}: UseTimeRangeProps): TimeRange => {
  return useMemo(() => {
    console.log('[useTimeRange] Calculating dynamic time range:', {
      appointmentBlocksCount: appointmentBlocks.length,
      timeBlocksCount: timeBlocks.length,
      weekDaysCount: weekDays.length
    });

    // Default fallback range
    const DEFAULT_START = 7; // 7 AM
    const DEFAULT_END = 19; // 7 PM
    
    // Safety bounds
    const MIN_START = 6; // 6 AM earliest
    const MAX_END = 22; // 10 PM latest
    
    // Padding in hours
    const PADDING = 1;

    let earliestHour = 23; // Start with latest possible
    let latestHour = 0; // Start with earliest possible
    let hasData = false;

    // Check appointment blocks
    appointmentBlocks.forEach(appointment => {
      if (appointment.start && appointment.end) {
        const startHour = appointment.start.hour;
        const endHour = appointment.end.hour;
        
        earliestHour = Math.min(earliestHour, startHour);
        latestHour = Math.max(latestHour, endHour);
        hasData = true;
        
        console.log('[useTimeRange] Appointment time:', {
          id: appointment.id,
          startHour,
          endHour,
          clientName: appointment.clientName
        });
      }
    });

    // Check availability blocks
    timeBlocks.forEach(block => {
      if (block.start && block.end) {
        const startHour = block.start.hour;
        const endHour = block.end.hour;
        
        earliestHour = Math.min(earliestHour, startHour);
        latestHour = Math.max(latestHour, endHour);
        hasData = true;
        
        console.log('[useTimeRange] Availability time:', {
          startHour,
          endHour,
          isException: block.isException
        });
      }
    });

    if (!hasData) {
      console.log('[useTimeRange] No data found, using default range');
      return {
        startHour: DEFAULT_START,
        endHour: DEFAULT_END
      };
    }

    // Add padding and apply bounds
    const paddedStart = Math.max(MIN_START, earliestHour - PADDING);
    const paddedEnd = Math.min(MAX_END, latestHour + PADDING);

    console.log('[useTimeRange] Calculated range:', {
      originalEarliest: earliestHour,
      originalLatest: latestHour,
      paddedStart,
      paddedEnd,
      totalHours: paddedEnd - paddedStart
    });

    return {
      startHour: paddedStart,
      endHour: paddedEnd
    };
  }, [appointmentBlocks, timeBlocks, weekDays]);
};
