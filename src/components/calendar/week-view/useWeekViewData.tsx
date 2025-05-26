
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

  // Process availability data with comprehensive logging and validation
  const availabilityByDay = useMemo(() => {
    console.log('[useWeekViewData] ===== PROCESSING AVAILABILITY DATA =====');
    const availabilityMap = new Map<string, TimeBlock[]>();
    
    if (!clinicianData) {
      console.log('[useWeekViewData] No clinician data available');
      return availabilityMap;
    }
    
    console.log('[useWeekViewData] Processing availability for clinician:', clinicianData.id);
    console.log('[useWeekViewData] Clinician timezone:', clinicianData.clinician_time_zone);
    
    // Log all availability columns for debugging
    const availabilityColumns: any = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
      for (let slot = 1; slot <= 3; slot++) {
        const startKey = `clinician_availability_start_${day}_${slot}`;
        const endKey = `clinician_availability_end_${day}_${slot}`;
        const timezoneKey = `clinician_availability_timezone_${day}_${slot}`;
        
        if (clinicianData[startKey] || clinicianData[endKey]) {
          availabilityColumns[`${day}_${slot}`] = {
            start: clinicianData[startKey],
            end: clinicianData[endKey],
            timezone: clinicianData[timezoneKey]
          };
        }
      }
    });
    
    console.log('[useWeekViewData] All availability columns with data:', availabilityColumns);
    
    weekDays.forEach((day, weekIndex) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const jsDay = day.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayName = getDayNameFromIndex(jsDay);
      const blocks: TimeBlock[] = [];
      
      console.log(`[useWeekViewData] === Processing day ${weekIndex}: ${dayKey} ===`);
      console.log(`[useWeekViewData] Date object: ${day.toString()}`);
      console.log(`[useWeekViewData] JS day index: ${jsDay} (0=Sunday, 1=Monday, etc.)`);
      console.log(`[useWeekViewData] Mapped day name: "${dayName}"`);
      
      for (let slot = 1; slot <= 3; slot++) {
        const startKey = `clinician_availability_start_${dayName}_${slot}`;
        const endKey = `clinician_availability_end_${dayName}_${slot}`;
        const timezoneKey = `clinician_availability_timezone_${dayName}_${slot}`;
        
        const rawStartTime = clinicianData[startKey];
        const rawEndTime = clinicianData[endKey];
        const slotTimezone = clinicianData[timezoneKey] || userTimeZone;
        
        console.log(`[useWeekViewData] Slot ${slot} for ${dayName}:`);
        console.log(`  - startKey: "${startKey}" = "${rawStartTime}"`);
        console.log(`  - endKey: "${endKey}" = "${rawEndTime}"`);
        console.log(`  - timezoneKey: "${timezoneKey}" = "${slotTimezone}"`);
        
        // Validate time strings
        const startTime = validateTimeString(rawStartTime);
        const endTime = validateTimeString(rawEndTime);
        
        if (startTime && endTime) {
          console.log(`  - Validated times: ${startTime} - ${endTime}`);
          
          try {
            const dayStart = DateTime.fromJSDate(day).setZone(slotTimezone);
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            
            const start = dayStart.set({ hour: startHour, minute: startMinute });
            const end = dayStart.set({ hour: endHour, minute: endMinute });
            
            // Validate DateTime objects
            if (!start.isValid) {
              console.error(`[useWeekViewData] Invalid start DateTime: ${start.invalidReason}`);
              continue;
            }
            if (!end.isValid) {
              console.error(`[useWeekViewData] Invalid end DateTime: ${end.invalidReason}`);
              continue;
            }
            
            console.log(`  - Created DateTime objects:`);
            console.log(`    Start: ${start.toISO()}`);
            console.log(`    End: ${end.toISO()}`);
            
            const timeBlock: TimeBlock = {
              start,
              end,
              day: dayStart,
              availabilityIds: [`${clinicianData.id}-${dayName}-${slot}`],
              isException: false,
              isStandalone: false
            };
            
            blocks.push(timeBlock);
            console.log(`  ✓ Successfully added time block for ${dayName} slot ${slot}`);
            
          } catch (dateError) {
            console.error(`[useWeekViewData] Error creating DateTime for ${dayName} slot ${slot}:`, dateError);
          }
        } else {
          if (rawStartTime || rawEndTime) {
            console.log(`  - Skipping slot ${slot}: invalid time format (start: "${rawStartTime}", end: "${rawEndTime}")`);
          }
        }
      }
      
      console.log(`[useWeekViewData] Total blocks created for ${dayName} (${dayKey}): ${blocks.length}`);
      
      if (blocks.length > 0) {
        availabilityMap.set(dayKey, blocks);
        console.log(`[useWeekViewData] ✓ Added ${blocks.length} blocks to availability map for ${dayKey}`);
      } else {
        console.log(`[useWeekViewData] ✗ No blocks added for ${dayKey}`);
      }
    });
    
    console.log('[useWeekViewData] ===== FINAL AVAILABILITY MAP =====');
    console.log('[useWeekViewData] Total days with availability:', availabilityMap.size);
    console.log('[useWeekViewData] Days in map:', Array.from(availabilityMap.keys()));
    
    Array.from(availabilityMap.entries()).forEach(([dayKey, blocks]) => {
      console.log(`[useWeekViewData] ${dayKey}: ${blocks.length} blocks`);
      blocks.forEach((block, index) => {
        console.log(`  Block ${index + 1}: ${block.start.toFormat('HH:mm')} - ${block.end.toFormat('HH:mm')}`);
      });
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
