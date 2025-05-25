import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { ClinicianColumnData, ColumnBasedAvailability } from '@/types/availability';
import { useTimeZone } from '@/context/TimeZoneContext';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';
import { TimeBlock, AppointmentBlock } from './types';
import { useCalendarDataFetching } from '@/hooks/calendar/useCalendarDataFetching';
import { useAvailabilityProcessor } from '@/hooks/calendar/useAvailabilityProcessor';
import { useAppointmentProcessor } from '@/hooks/calendar/useAppointmentProcessor';
import { useTimeSlotAvailability } from '@/hooks/calendar/useTimeSlotAvailability';

// Component name for logging
const COMPONENT_NAME = 'useWeekViewData';

/**
 * Main hook for week view data processing
 * Refactored to use specialized hooks for better separation of concerns
 */
export const useWeekViewData = (
  days: Date[],
  clinicianId: string | null,
  refreshTrigger = 0,
  externalAppointments: Appointment[] = [],
  getClientName = (id: string) => `Client ${id}`,
  userTimeZone: string
) => {
  // Performance tracking
  const hookStartTime = performance.now();
  
  // Use TimeZoneContext for timezone operations
  const { fromJSDate } = useTimeZone();
  
  // State for error handling
  const [hookError, setHookError] = useState<Error | null>(null);
  
  // Log hook initialization
  CalendarDebugUtils.logLifecycle(COMPONENT_NAME, 'hook-initialized', {
    daysCount: days?.length || 0,
    clinicianId,
    refreshTrigger,
    externalAppointmentsCount: externalAppointments?.length || 0,
    userTimeZone
  });

  // Convert JS Date array to DateTime array in user timezone - memoized
  const weekDays = useMemo(() =>
    days.map(day => fromJSDate(day)),
    [days, fromJSDate]
  );

  // Calculate date range for data fetching
  const dateRange = useMemo(() => {
    // Use the first day to determine the week
    const firstDay = weekDays[0] || DateTime.now().setZone(userTimeZone);
    
    // Get expanded date range for better data capture - add padding
    // Start a week before the displayed week, end a week after
    const padStartDay = firstDay.minus({ days: 7 });
    const padEndDay = firstDay.plus({ days: 21 }); // current week (7) + padding (14)
    
    return {
      start: padStartDay,
      end: padEndDay
    };
  }, [weekDays, userTimeZone]);

  // Fetch calendar data using specialized hook
  const {
    loading,
    appointments,
    clients,
    clinicianData, // ClinicianColumnData
    error: fetchError
  } = useCalendarDataFetching(
    clinicianId,
    dateRange,
    refreshTrigger,
    externalAppointments
  );

  // Process availability data using specialized hook
  const {
    timeBlocks,
    weeklyPattern,
    columnBasedAvailability
  } = useAvailabilityProcessor(
    clinicianData,
    weekDays,
    userTimeZone
  );

  // Process appointment data using specialized hook
  const {
    appointmentBlocks,
    dayAppointmentsMap,
    getAppointmentForTimeSlot
  } = useAppointmentProcessor(
    appointments,
    clients,
    weekDays,
    userTimeZone,
    getClientName
  );

  // Check time slot availability using specialized hook
  const {
    isTimeSlotAvailable,
    getBlockForTimeSlot
  } = useTimeSlotAvailability(
    timeBlocks,
    userTimeZone
  );

  // Handle errors
  useEffect(() => {
    if (fetchError) {
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error fetching calendar data', fetchError);
      setHookError(fetchError);
    } else {
      setHookError(null);
    }
  }, [fetchError]);

  // Log hook performance
  useEffect(() => {
    const hookDuration = performance.now() - hookStartTime;
    CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'hook-execution', hookDuration, {
      success: !hookError,
      weekDaysCount: weekDays?.length || 0,
      appointmentBlocksCount: appointmentBlocks?.length || 0,
      timeBlocksCount: timeBlocks?.length || 0
    });
  }, [hookError, weekDays, appointmentBlocks, timeBlocks]);

  return {
    loading,
    weekDays,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
    error: hookError,
    weeklyPattern,
    clinicianData: clinicianData as ClinicianColumnData | null,
    columnBasedAvailability
  };
};

export default useWeekViewData;
