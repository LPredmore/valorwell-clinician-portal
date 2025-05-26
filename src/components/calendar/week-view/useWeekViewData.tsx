
import { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { format } from 'date-fns';
import { useCalendarDataFetching } from '@/hooks/calendar/useCalendarDataFetching';
import { TimeZoneService } from '@/utils/timeZoneService';
import { Appointment } from '@/types/appointment';
import { PartialClientDetails } from '@/types/client';
import { TimeBlock, AppointmentBlock } from './types';

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
    return Array.from({ length: 7 }, (_, i) => 
      start.plus({ days: i }).toJSDate()
    );
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

  // Fetch calendar data
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

  // Process availability data with improved logging and correct day mapping
  const availabilityByDay = useMemo(() => {
    const availabilityMap = new Map<string, TimeBlock[]>();
    
    if (!clinicianData) {
      console.log('[useWeekViewData] No clinician data available');
      return availabilityMap;
    }
    
    console.log('[useWeekViewData] Processing availability for clinician:', clinicianData.id);
    console.log('[useWeekViewData] Clinician data availability columns:', {
      monday_1: clinicianData.clinician_availability_start_monday_1,
      tuesday_1: clinicianData.clinician_availability_start_tuesday_1,
      wednesday_1: clinicianData.clinician_availability_start_wednesday_1,
      thursday_1: clinicianData.clinician_availability_start_thursday_1,
      friday_1: clinicianData.clinician_availability_start_friday_1,
      saturday_1: clinicianData.clinician_availability_start_saturday_1,
      sunday_1: clinicianData.clinician_availability_start_sunday_1,
    });
    
    weekDays.forEach((day, dayIndex) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const jsDay = day.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayName = getDayNameFromIndex(jsDay);
      const blocks: TimeBlock[] = [];
      
      console.log(`[useWeekViewData] Processing day ${dayIndex}: ${dayKey}, JS day: ${jsDay}, dayName: ${dayName}`);
      
      for (let slot = 1; slot <= 3; slot++) {
        const startKey = `clinician_availability_start_${dayName}_${slot}`;
        const endKey = `clinician_availability_end_${dayName}_${slot}`;
        
        const startTime = clinicianData[startKey];
        const endTime = clinicianData[endKey];
        
        console.log(`[useWeekViewData] Checking slot ${slot} for ${dayName}: startKey=${startKey}, startTime=${startTime}, endTime=${endTime}`);
        
        if (startTime && endTime) {
          const dayStart = DateTime.fromJSDate(day).setZone(userTimeZone);
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);
          
          const start = dayStart.set({ hour: startHour, minute: startMinute });
          const end = dayStart.set({ hour: endHour, minute: endMinute });
          
          console.log(`[useWeekViewData] Adding availability block for ${dayName}: ${start.toISO()} - ${end.toISO()}`);
          
          blocks.push({
            start,
            end,
            day: dayStart,
            availabilityIds: [`${clinicianData.id}-${dayName}-${slot}`],
            isException: false,
            isStandalone: false
          });
        }
      }
      
      console.log(`[useWeekViewData] Total blocks for ${dayName} (${dayKey}): ${blocks.length}`);
      
      if (blocks.length > 0) {
        availabilityMap.set(dayKey, blocks);
      }
    });
    
    console.log('[useWeekViewData] Final availability map:', {
      totalDays: availabilityMap.size,
      days: Array.from(availabilityMap.keys()),
      blocksPerDay: Array.from(availabilityMap.entries()).map(([day, blocks]) => ({ day, count: blocks.length }))
    });
    
    return availabilityMap;
  }, [clinicianData, weekDays, userTimeZone]);

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

  return {
    loading,
    error,
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
