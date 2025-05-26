
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
  // Handle both "HH:MM:SS" and "HH:MM" formats
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
  console.log('[useWeekViewData] Hook called with:', {
    currentDateOrDays: Array.isArray(currentDateOrDays) ? 'array of dates' : currentDateOrDays,
    clinicianId,
    refreshTrigger,
    externalAppointmentsCount: externalAppointments.length,
    userTimeZone
  });

  // Handle both single date and array of days
  const currentDate = Array.isArray(currentDateOrDays) ? currentDateOrDays[0] : currentDateOrDays;
  const weekDays = useMemo(() => {
    if (Array.isArray(currentDateOrDays)) {
      console.log('[useWeekViewData] Using provided array of days:', currentDateOrDays.length);
      return currentDateOrDays;
    }
    // Calculate week boundaries for single date
    const start = DateTime.fromJSDate(currentDate).setZone(userTimeZone).startOf('week');
    const calculatedDays = Array.from({ length: 7 }, (_, i) => 
      start.plus({ days: i }).toJSDate()
    );
    console.log('[useWeekViewData] Calculated week days from single date:', calculatedDays.length);
    return calculatedDays;
  }, [currentDateOrDays, userTimeZone]);

  // Calculate week boundaries for data fetching
  const { startOfWeek, endOfWeek } = useMemo(() => {
    const start = DateTime.fromJSDate(weekDays[0]).setZone(userTimeZone).startOf('day');
    const end = DateTime.fromJSDate(weekDays[6]).setZone(userTimeZone).endOf('day');
    console.log('[useWeekViewData] Week boundaries:', {
      start: start.toISO(),
      end: end.toISO()
    });
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
    
    console.log('[useWeekViewData] Generated time slots:', slots.length);
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
        console.log('[useWeekViewData] No clinician ID, skipping availability fetch');
        return;
      }

      console.log('[useWeekViewData] ===== FETCHING AVAILABILITY FROM CORRECT TABLES =====');
      setAvailabilityLoading(true);
      setAvailabilityError(null);

      try {
        // Fetch from availability table (recurring patterns)
        console.log('[useWeekViewData] Fetching from availability table for clinician:', clinicianId);
        const { data: availabilityBlocks, error: availabilityError } = await supabase
          .from('availability')
          .select('*')
          .eq('clinician_id', clinicianId)
          .eq('is_active', true)
          .eq('is_deleted', false);

        if (availabilityError) {
          console.error('[useWeekViewData] Error fetching availability blocks:', availabilityError);
          throw availabilityError;
        }

        console.log('[useWeekViewData] Found availability blocks:', availabilityBlocks?.length || 0);
        console.log('[useWeekViewData] Availability blocks data:', availabilityBlocks);

        // Fetch from availability_exceptions table (specific date overrides)
        console.log('[useWeekViewData] Fetching from availability_exceptions table for clinician:', clinicianId);
        const { data: exceptions, error: exceptionsError } = await supabase
          .from('availability_exceptions')
          .select('*')
          .eq('clinician_id', clinicianId)
          .eq('is_active', true)
          .eq('is_deleted', false)
          .gte('specific_date', startOfWeek.toISODate())
          .lte('specific_date', endOfWeek.toISODate());

        if (exceptionsError) {
          console.error('[useWeekViewData] Error fetching availability exceptions:', exceptionsError);
          throw exceptionsError;
        }

        console.log('[useWeekViewData] Found availability exceptions:', exceptions?.length || 0);
        console.log('[useWeekViewData] Availability exceptions data:', exceptions);

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
    console.log('[useWeekViewData] ===== PROCESSING AVAILABILITY FROM CORRECT TABLES =====');
    const availabilityMap = new Map<string, TimeBlock[]>();
    
    console.log('[useWeekViewData] Processing availability data:', {
      availabilityBlocksCount: availabilityData.length,
      exceptionsCount: availabilityExceptions.length,
      weekDaysCount: weekDays.length
    });
    
    weekDays.forEach((day, weekIndex) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const jsDay = day.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayName = getDayNameFromIndex(jsDay);
      const blocks: TimeBlock[] = [];
      
      console.log(`[useWeekViewData] === Processing day ${weekIndex}: ${dayKey} (${dayName}) ===`);
      
      // Process recurring availability patterns
      const dayAvailabilityBlocks = availabilityData.filter(block => 
        block.day_of_week === dayName
      );
      
      console.log(`[useWeekViewData] Found ${dayAvailabilityBlocks.length} recurring blocks for ${dayName}`);
      
      dayAvailabilityBlocks.forEach((block, blockIndex) => {
        console.log(`[useWeekViewData] Processing recurring block ${blockIndex + 1}:`, {
          id: block.id,
          dayOfWeek: block.day_of_week,
          startAt: block.start_at,
          endAt: block.end_at,
          isActive: block.is_active
        });
        
        try {
          // Parse time strings and create DateTime objects
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
              console.log(`[useWeekViewData] ✓ Added recurring block: ${start.toFormat('HH:mm')} - ${end.toFormat('HH:mm')}`);
            } else {
              console.error(`[useWeekViewData] Invalid DateTime objects for block ${block.id}`);
            }
          } else {
            console.log(`[useWeekViewData] Invalid time format for block ${block.id}: ${block.start_at} - ${block.end_at}`);
          }
        } catch (error) {
          console.error(`[useWeekViewData] Error processing recurring block ${block.id}:`, error);
        }
      });
      
      // Process specific date exceptions for this day
      const dayExceptions = availabilityExceptions.filter(exception => 
        exception.specific_date === dayKey
      );
      
      console.log(`[useWeekViewData] Found ${dayExceptions.length} exceptions for ${dayKey}`);
      
      dayExceptions.forEach((exception, exceptionIndex) => {
        console.log(`[useWeekViewData] Processing exception ${exceptionIndex + 1}:`, {
          id: exception.id,
          specificDate: exception.specific_date,
          startTime: exception.start_time,
          endTime: exception.end_time,
          isActive: exception.is_active
        });
        
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
              console.log(`[useWeekViewData] ✓ Added exception block: ${start.toFormat('HH:mm')} - ${end.toFormat('HH:mm')}`);
            } else {
              console.error(`[useWeekViewData] Invalid DateTime objects for exception ${exception.id}`);
            }
          } else {
            console.log(`[useWeekViewData] Invalid time format for exception ${exception.id}: ${exception.start_time} - ${exception.end_time}`);
          }
        } catch (error) {
          console.error(`[useWeekViewData] Error processing exception ${exception.id}:`, error);
        }
      });
      
      console.log(`[useWeekViewData] Total blocks created for ${dayName} (${dayKey}): ${blocks.length}`);
      
      if (blocks.length > 0) {
        availabilityMap.set(dayKey, blocks);
        console.log(`[useWeekViewData] ✓ Added ${blocks.length} blocks to availability map for ${dayKey}`);
      } else {
        console.log(`[useWeekViewData] ✗ No blocks added for ${dayKey}`);
      }
    });
    
    console.log('[useWeekViewData] ===== FINAL AVAILABILITY MAP FROM CORRECT TABLES =====');
    console.log('[useWeekViewData] Total days with availability:', availabilityMap.size);
    console.log('[useWeekViewData] Days in map:', Array.from(availabilityMap.keys()));
    
    Array.from(availabilityMap.entries()).forEach(([dayKey, blocks]) => {
      console.log(`[useWeekViewData] ${dayKey}: ${blocks.length} blocks`);
      blocks.forEach((block, index) => {
        console.log(`  Block ${index + 1}: ${block.start.toFormat('HH:mm')} - ${block.end.toFormat('HH:mm')} (${block.isException ? 'exception' : 'recurring'})`);
      });
    });
    
    return availabilityMap;
  }, [availabilityData, availabilityExceptions, weekDays, userTimeZone]);

  // Process appointment data
  const appointmentsByDay = useMemo(() => {
    const appointmentMap = new Map<string, AppointmentBlock[]>();
    
    // Use external appointments if provided, otherwise use fetched appointments
    const appointmentsToProcess = externalAppointments.length > 0 ? externalAppointments : appointments;
    
    appointmentsToProcess.forEach(appointment => {
      if (!appointment.start_at || !appointment.end_at) return;
      
      try {
        const start = TimeZoneService.fromUTC(appointment.start_at, userTimeZone);
        const end = TimeZoneService.fromUTC(appointment.end_at, userTimeZone);
        const day = start.startOf('day');
        const dayKey = day.toFormat('yyyy-MM-dd');
        
        // Get client name from clients map or appointment data
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
