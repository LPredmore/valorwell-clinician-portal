
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { ClinicianColumnData } from '@/types/availability';
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
  console.log(`[${COMPONENT_NAME}] Hook initialized:`, {
    daysCount: days?.length || 0,
    clinicianId,
    refreshTrigger,
    externalAppointmentsCount: externalAppointments?.length || 0,
    userTimeZone
  });

  // Convert JS Date array to DateTime array in user timezone - memoized
  const weekDays = useMemo(() => {
    const result = days.map(day => fromJSDate(day));
    console.log(`[${COMPONENT_NAME}] Week days processed:`, {
      originalDays: days.map(d => d.toISOString()),
      processedDays: result.map(d => d.toISO())
    });
    return result;
  }, [days, fromJSDate]);

  // Calculate date range for data fetching
  const dateRange = useMemo(() => {
    // Use the first day to determine the week
    const firstDay = weekDays[0] || DateTime.now().setZone(userTimeZone);
    
    // Get expanded date range for better data capture - add padding
    // Start a week before the displayed week, end a week after
    const padStartDay = firstDay.minus({ days: 7 });
    const padEndDay = firstDay.plus({ days: 21 }); // current week (7) + padding (14)
    
    const range = {
      start: padStartDay,
      end: padEndDay
    };
    
    console.log(`[${COMPONENT_NAME}] Date range calculated:`, {
      firstDay: firstDay.toISO(),
      padStartDay: padStartDay.toISO(),
      padEndDay: padEndDay.toISO()
    });
    
    return range;
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

  // Log data fetching results
  useEffect(() => {
    console.log(`[${COMPONENT_NAME}] Data fetching results:`, {
      loading,
      appointmentsCount: appointments?.length || 0,
      clientsCount: clients?.size || 0,
      hasClinicianData: !!clinicianData,
      fetchError: fetchError?.message
    });
  }, [loading, appointments, clients, clinicianData, fetchError]);

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

  // Log availability processing results
  useEffect(() => {
    console.log(`[${COMPONENT_NAME}] Availability processing results:`, {
      timeBlocksCount: timeBlocks?.length || 0,
      hasWeeklyPattern: !!weeklyPattern,
      hasColumnBasedAvailability: !!columnBasedAvailability,
      sampleTimeBlocks: timeBlocks?.slice(0, 3).map(tb => ({
        start: tb.start.toISO(),
        end: tb.end.toISO(),
        day: tb.day?.toISO()
      }))
    });
  }, [timeBlocks, weeklyPattern, columnBasedAvailability]);

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

  // Log appointment processing results
  useEffect(() => {
    console.log(`[${COMPONENT_NAME}] Appointment processing results:`, {
      appointmentBlocksCount: appointmentBlocks?.length || 0,
      dayAppointmentsMapSize: dayAppointmentsMap?.size || 0,
      sampleAppointmentBlocks: appointmentBlocks?.slice(0, 3).map(ab => ({
        id: ab.id,
        clientName: ab.clientName,
        start: ab.start.toISO(),
        end: ab.end.toISO()
      }))
    });
  }, [appointmentBlocks, dayAppointmentsMap, getAppointmentForTimeSlot]);

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
      console.error(`[${COMPONENT_NAME}] Fetch error detected:`, fetchError);
      setHookError(fetchError);
    } else {
      setHookError(null);
    }
  }, [fetchError]);

  // Log hook performance
  useEffect(() => {
    const hookDuration = performance.now() - hookStartTime;
    console.log(`[${COMPONENT_NAME}] Hook execution completed:`, {
      duration: `${hookDuration.toFixed(2)}ms`,
      success: !hookError,
      weekDaysCount: weekDays?.length || 0,
      appointmentBlocksCount: appointmentBlocks?.length || 0,
      timeBlocksCount: timeBlocks?.length || 0,
      finalState: {
        loading,
        hasError: !!hookError,
        hasTimeBlocks: timeBlocks?.length > 0,
        hasAppointmentBlocks: appointmentBlocks?.length > 0
      }
    });
  }, [hookError, weekDays, appointmentBlocks, timeBlocks, loading]);

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
