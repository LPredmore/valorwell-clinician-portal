
import { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { format } from 'date-fns';
import { useCalendarDataFetching } from '@/hooks/calendar/useCalendarDataFetching';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Appointment } from '@/types/appointment';
import { PartialClientDetails } from '@/types/client';
import { TimeBlock, AppointmentBlock } from './types';
import { supabase } from '@/integrations/supabase/client';

interface WeekViewData {
  loading: boolean;
  error: Error | null;
  weekDays: Date[];
  timeSlots: Date[];
  availabilityByDay: Map<string, TimeBlock[]>;
  appointmentsByDay: Map<string, AppointmentBlock[]>;
  appointmentBlocks: AppointmentBlock[];
  timeBlocks: TimeBlock[];
  isTimeSlotAvailable: (day: Date, timeSlot: Date) => boolean;
  getBlockForTimeSlot: (day: Date, timeSlot: Date) => TimeBlock | undefined;
  getAppointmentForTimeSlot: (day: Date, timeSlot: Date) => AppointmentBlock | undefined;
}

// Helper function to map JavaScript day index to database column day name
const getDayNameFromIndex = (dayIndex: number): string => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNames[dayIndex];
};

// Helper function to validate and format time strings
const validateTimeString = (timeStr: string): string | null => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!timeMatch) return null;
  const hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

export const useWeekViewData = (
  currentDateOrDays: Date | Date[],
  clinicianId: string | null,
  refreshTrigger: number = 0,
  externalAppointments: Appointment[] = [],
  userTimeZone: string = 'America/Chicago'
): WeekViewData => {
  // Handle both single date and array of days
  const currentDate = Array.isArray(currentDateOrDays) ? currentDateOrDays[0] : currentDateOrDays;
  const weekDays = useMemo(() => {
    if (Array.isArray(currentDateOrDays)) {
      return currentDateOrDays;
    }
    // Calculate week boundaries for single date
    const start = DateTime.fromJSDate(currentDate).setZone(userTimeZone).startOf('week');
    const calculatedDays = Array.from({ length: 7 }, (_, i) => 
      start.plus({ days: i }).toJSDate()
    );
    return calculatedDays;
  }, [currentDateOrDays, userTimeZone]);

  // Calculate week boundaries for data fetching
  const { startOfWeek, endOfWeek } = useMemo(() => {
    const start = DateTime.fromJSDate(weekDays[0]).setZone(userTimeZone).startOf('day');
    const end = DateTime.fromJSDate(weekDays[6]).setZone(userTimeZone).endOf('day');
    return {
      startOfWeek: start,
      endOfWeek: end
    };
  }, [weekDays, userTimeZone]);

  // Generate time slots (15-minute intervals from 6 AM to 10 PM)
  const timeSlots = useMemo(() => {
    const slots: Date[] = [];
    const startHour = 6;
    const endHour = 22;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const slot = DateTime.fromJSDate(weekDays[0]).set({ hour, minute }).toJSDate();
        slots.push(slot);
      }
    }
    
    return slots;
  }, [weekDays]);

  // State for availability data from proper tables
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [availabilityExceptions, setAvailabilityExceptions] = useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<Error | null>(null);

  // Fetch availability data from the correct tables
  useEffect(() => {
    const fetchAvailabilityData = async () => {
      if (!clinicianId) {
        return;
      }

      setAvailabilityLoading(true);
      setAvailabilityError(null);

      try {
        // Fetch from availability table (recurring patterns)
        const { data: availabilityBlocks, error: availabilityError } = await supabase
          .from('availability')
          .select('*')
          .eq('clinician_id', clinicianId)
          .eq('is_active', true)
          .eq('is_deleted', false);

        if (availabilityError) {
          throw availabilityError;
        }

        // Fetch from availability_exceptions table (specific date overrides)
        const { data: exceptions, error: exceptionsError } = await supabase
          .from('availability_exceptions')
          .select('*')
          .eq('clinician_id', clinicianId)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .gte('specific_date', startOfWeek.toISODate())
          .lte('specific_date', endOfWeek.toISODate());

        if (exceptionsError) {
          throw exceptionsError;
        }

        setAvailabilityData(availabilityBlocks || []);
        setAvailabilityExceptions(exceptions || []);

      } catch (error) {
        console.error('[useWeekViewData] Error fetching availability data:', error);
        setAvailabilityError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailabilityData();
  }, [clinicianId, startOfWeek, endOfWeek, refreshTrigger]);

  // Fetch calendar data (appointments and clinician info)
  const {
    loading,
    appointments,
    clients,
    clinicianData,
    error
  } = useCalendarDataFetching(
    clinicianId,
    { start: startOfWeek, end: endOfWeek },
    refreshTrigger,
    externalAppointments
  );

  // Process availability data from the correct tables
  const availabilityByDay = useMemo(() => {
    const availabilityMap = new Map<string, TimeBlock[]>();
    
    weekDays.forEach((day, weekIndex) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const jsDay = day.getDay();
      const dayName = getDayNameFromIndex(jsDay);
      const blocks: TimeBlock[] = [];
      
      // Process recurring availability patterns
      const dayAvailabilityBlocks = availabilityData.filter(block => 
        block.day_of_week === dayName
      );
      
      dayAvailabilityBlocks.forEach((block, blockIndex) => {
        try {
          const startTime = validateTimeString(block.start_at);
          const endTime = validateTimeString(block.end_at);
          
          if (startTime && endTime) {
            const dayStart = DateTime.fromJSDate(day).setZone(userTimeZone);
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            
            const start = dayStart.set({ hour: startHour, minute: startMinute });
            const end = dayStart.set({ hour: endHour, minute: endMinute });
            
            if (start.isValid && end.isValid) {
              const timeBlock: TimeBlock = {
                start,
                end,
                day: dayStart,
                availabilityIds: [block.id],
                isException: false,
                isStandalone: false
              };
              
              blocks.push(timeBlock);
            }
          }
        } catch (error) {
          console.error(`[useWeekViewData] Error processing recurring block ${block.id}:`, error);
        }
      });
      
      // Process specific date exceptions for this day
      const dayExceptions = availabilityExceptions.filter(exception => 
        exception.specific_date === dayKey
      );
      
      dayExceptions.forEach((exception, exceptionIndex) => {
        try {
          const startTime = validateTimeString(exception.start_time);
          const endTime = validateTimeString(exception.end_time);
          
          if (startTime && endTime) {
            const dayStart = DateTime.fromJSDate(day).setZone(userTimeZone);
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            
            const start = dayStart.set({ hour: startHour, minute: startMinute });
            const end = dayStart.set({ hour: endHour, minute: endMinute });
            
            if (start.isValid && end.isValid) {
              const timeBlock: TimeBlock = {
                start,
                end,
                day: dayStart,
                availabilityIds: [exception.id],
                isException: true,
                isStandalone: true
              };
              
              blocks.push(timeBlock);
            }
          }
        } catch (error) {
          console.error(`[useWeekViewData] Error processing exception ${exception.id}:`, error);
        }
      });
      
      if (blocks.length > 0) {
        availabilityMap.set(dayKey, blocks);
      }
    });
    
    return availabilityMap;
  }, [availabilityData, availabilityExceptions, weekDays, userTimeZone]);

  // Process appointment data
  const appointmentsByDay = useMemo(() => {
    const appointmentMap = new Map<string, AppointmentBlock[]>();
    
    const appointmentsToProcess = externalAppointments.length > 0 ? externalAppointments : appointments;
    
    appointmentsToProcess.forEach(appointment => {
      if (!appointment.start_at || !appointment.end_at) return;
      
      try {
        const start = TimeZoneService.fromUTC(appointment.start_at, userTimeZone);
        const end = TimeZoneService.fromUTC(appointment.end_at, userTimeZone);
        const day = start.startOf('day');
        const dayKey = day.toFormat('yyyy-MM-dd');
        
        let clientName = appointment.clientName || 'Unknown Client';
        if (!clientName && appointment.client_id && clients.has(appointment.client_id)) {
          const client = clients.get(appointment.client_id);
          if (client) {
            clientName = client.client_preferred_name || 
                        `${client.client_first_name} ${client.client_last_name}`;
          }
        }
        
        const appointmentBlock: AppointmentBlock = {
          id: appointment.id,
          start,
          end,
          day,
          clientId: appointment.client_id,
          clientName,
          type: appointment.type
        };
        
        if (!appointmentMap.has(dayKey)) {
          appointmentMap.set(dayKey, []);
        }
        appointmentMap.get(dayKey)!.push(appointmentBlock);
      } catch (error) {
        console.error('Error processing appointment:', error);
      }
    });
    
    return appointmentMap;
  }, [appointments, externalAppointments, clients, userTimeZone]);

  // Create flat arrays for backwards compatibility
  const appointmentBlocks = useMemo(() => {
    const blocks: AppointmentBlock[] = [];
    appointmentsByDay.forEach(dayBlocks => blocks.push(...dayBlocks));
    return blocks;
  }, [appointmentsByDay]);

  const timeBlocks = useMemo(() => {
    const blocks: TimeBlock[] = [];
    availabilityByDay.forEach(dayBlocks => blocks.push(...dayBlocks));
    return blocks;
  }, [availabilityByDay]);

  // Utility functions
  const isTimeSlotAvailable = (day: Date, timeSlot: Date): boolean => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayBlocks = availabilityByDay.get(dayKey) || [];
    const slotTime = DateTime.fromJSDate(timeSlot);
    
    return dayBlocks.some(block => 
      slotTime >= block.start && slotTime < block.end
    );
  };

  const getBlockForTimeSlot = (day: Date, timeSlot: Date): TimeBlock | undefined => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayBlocks = availabilityByDay.get(dayKey) || [];
    const slotTime = DateTime.fromJSDate(timeSlot);
    
    return dayBlocks.find(block => 
      slotTime >= block.start && slotTime < block.end
    );
  };

  const getAppointmentForTimeSlot = (day: Date, timeSlot: Date): AppointmentBlock | undefined => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayAppointments = appointmentsByDay.get(dayKey) || [];
    const slotTime = DateTime.fromJSDate(timeSlot);
    
    return dayAppointments.find(appt => 
      slotTime >= appt.start && slotTime < appt.end
    );
  };

  // Combine loading states
  const combinedLoading = loading || availabilityLoading;
  const combinedError = error || availabilityError;

  return {
    loading: combinedLoading,
    error: combinedError,
    weekDays,
    timeSlots,
    availabilityByDay,
    appointmentsByDay,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot
  };
};
