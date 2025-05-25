import { useCallback, useMemo } from 'react';
import { DateTime } from 'luxon';
import { TimeBlock } from '@/components/calendar/week-view/types';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'useTimeSlotAvailability';

/**
 * Hook for checking time slot availability and retrieving time blocks
 * Extracted from useWeekViewData for better separation of concerns
 */
export const useTimeSlotAvailability = (
  timeBlocks: TimeBlock[],
  userTimeZone: string
) => {
  /**
   * Create a map of time blocks by day for quick lookup
   */
  const dayAvailabilityMap = useMemo(() => {
    const map = new Map<string, TimeBlock[]>();
    
    // Add time blocks to their respective days
    timeBlocks.forEach(block => {
      if (!block.day) return;
      
      const dayKey = block.day.toFormat('yyyy-MM-dd');
      
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      
      map.get(dayKey)?.push(block);
    });
    
    return map;
  }, [timeBlocks]);

  /**
   * Check if a time slot is available
   */
  const isTimeSlotAvailable = useCallback((day: Date, timeSlot: Date): boolean => {
    try {
      // Convert JS Date to DateTime
      const slotDateTime = DateTime.fromJSDate(timeSlot).setZone(userTimeZone);
      const dayKey = DateTime.fromJSDate(day).setZone(userTimeZone).toFormat('yyyy-MM-dd');
      
      // Get time blocks for this day
      const dayBlocks = dayAvailabilityMap.get(dayKey) || [];
      
      // Check if any time block overlaps with this time slot
      const isAvailable = dayBlocks.some(block => {
        return slotDateTime >= block.start && slotDateTime < block.end;
      });
      
      return isAvailable;
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error checking time slot availability', {
        day: day.toISOString(),
        timeSlot: timeSlot.toISOString(),
        error
      });
      
      return false;
    }
  }, [dayAvailabilityMap, userTimeZone]);

  /**
   * Get the time block for a time slot
   */
  const getBlockForTimeSlot = useCallback((day: Date, timeSlot: Date): TimeBlock | undefined => {
    try {
      // Convert JS Date to DateTime
      const slotDateTime = DateTime.fromJSDate(timeSlot).setZone(userTimeZone);
      const dayKey = DateTime.fromJSDate(day).setZone(userTimeZone).toFormat('yyyy-MM-dd');
      
      // Get time blocks for this day
      const dayBlocks = dayAvailabilityMap.get(dayKey) || [];
      
      // Find a time block that overlaps with this time slot
      return dayBlocks.find(block => {
        return slotDateTime >= block.start && slotDateTime < block.end;
      });
    } catch (error) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error getting block for time slot', {
        day: day.toISOString(),
        timeSlot: timeSlot.toISOString(),
        error
      });
      
      return undefined;
    }
  }, [dayAvailabilityMap, userTimeZone]);

  return {
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    dayAvailabilityMap
  };
};

export default useTimeSlotAvailability;