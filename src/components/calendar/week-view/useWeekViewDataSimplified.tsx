
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { AvailabilityBlock } from '@/types/availability';
import { ClientDetails } from '@/types/client';
import { TimeZoneService } from '@/utils/timeZoneService';
import { TimeBlock, AppointmentBlock } from './types';

type Client = ClientDetails;

export const useWeekViewDataSimplified = (
  days: Date[],
  selectedClinicianId: string | null,
  refreshTrigger: number,
  appointments: Appointment[],
  getClientName: (clientId: string) => string,
  userTimeZone: string,
  clinicianTimeZone: string
) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinicianAvailability, setClinicianAvailability] = useState<any>(null);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [appointmentBlocks, setAppointmentBlocks] = useState<AppointmentBlock[]>([]);

  // PHASE 4: Robust Error Handling - Validate clinician timezone
  const validClinicianTimeZone = useMemo(() => {
    if (!clinicianTimeZone) {
      console.warn('[useWeekViewDataSimplified] Missing clinicianTimeZone, falling back to UTC');
      return 'UTC';
    }
    
    try {
      // Test the timezone by creating a DateTime
      DateTime.now().setZone(clinicianTimeZone);
      console.log('[useWeekViewDataSimplified] Using validated clinician timezone:', clinicianTimeZone);
      return clinicianTimeZone;
    } catch (error) {
      console.warn('[useWeekViewDataSimplified] Invalid clinicianTimeZone, falling back to UTC:', error);
      return 'UTC';
    }
  }, [clinicianTimeZone]);

  console.log('[useWeekViewDataSimplified] Hook initialized with:', {
    selectedClinicianId,
    validClinicianTimeZone,
    daysCount: days?.length || 0,
    appointmentsCount: appointments?.length || 0,
    refreshTrigger
  });

  // Generate week days using clinician's timezone for calendar grid consistency
  const weekDays = useMemo(() => {
    if (!days || days.length === 0) {
      console.warn('[useWeekViewDataSimplified] No days provided');
      return [];
    }
    
    const result = days.map(day => TimeZoneService.fromJSDate(day, validClinicianTimeZone));
    console.log('[useWeekViewDataSimplified] Generated weekDays in clinician timezone:', {
      count: result.length,
      timezone: validClinicianTimeZone,
      firstDay: result[0]?.toFormat('yyyy-MM-dd'),
      lastDay: result[result.length - 1]?.toFormat('yyyy-MM-dd')
    });
    return result;
  }, [days, validClinicianTimeZone]);

  // Helper function to process clinician availability into TimeBlocks
  const processClinicianAvailability = (clinicianData: any, weekDays: DateTime[]): TimeBlock[] => {
    if (!clinicianData) return [];

    const processedTimeBlocks: TimeBlock[] = [];
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    console.log('[useWeekViewDataSimplified] Processing clinician availability for week:', {
      weekStart: weekDays[0]?.toFormat('yyyy-MM-dd'),
      weekEnd: weekDays[weekDays.length - 1]?.toFormat('yyyy-MM-dd'),
      clinicianTimeZone: validClinicianTimeZone
    });

    // For each day in the current week
    weekDays.forEach(weekDay => {
      const dayOfWeekIndex = weekDay.weekday % 7; // Convert Luxon's 1-7 to 0-6
      const dayOfWeekName = daysOfWeek[dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1]; // Adjust for Sunday

      console.log('[useWeekViewDataSimplified] Processing day:', {
        date: weekDay.toFormat('yyyy-MM-dd'),
        dayOfWeek: dayOfWeekName,
        luxonWeekday: weekDay.weekday
      });

      // Check each possible time slot (1, 2, 3) for this day
      for (let slotNum = 1; slotNum <= 3; slotNum++) {
        const startTimeKey = `clinician_availability_start_${dayOfWeekName}_${slotNum}`;
        const endTimeKey = `clinician_availability_end_${dayOfWeekName}_${slotNum}`;
        const timezoneKey = `clinician_availability_timezone_${dayOfWeekName}_${slotNum}`;

        const startTime = clinicianData[startTimeKey];
        const endTime = clinicianData[endTimeKey];
        const slotTimezone = clinicianData[timezoneKey] || validClinicianTimeZone;

        if (startTime && endTime) {
          try {
            // Parse time strings (format: "HH:MM:SS" or "HH:MM")
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);

            // Create DateTime objects in the slot's timezone
            const slotStart = weekDay.setZone(slotTimezone).set({
              hour: startHour,
              minute: startMinute,
              second: 0,
              millisecond: 0
            });

            const slotEnd = weekDay.setZone(slotTimezone).set({
              hour: endHour,
              minute: endMinute,
              second: 0,
              millisecond: 0
            });

            // Convert to clinician's timezone for calendar display
            const displayStart = slotStart.setZone(validClinicianTimeZone);
            const displayEnd = slotEnd.setZone(validClinicianTimeZone);
            const displayDay = weekDay.startOf('day').setZone(validClinicianTimeZone);

            const timeBlock: TimeBlock = {
              start: displayStart,
              end: displayEnd,
              day: displayDay,
              availabilityIds: [`clinician-${dayOfWeekName}-${slotNum}`],
              isException: false,
              isStandalone: false
            };

            processedTimeBlocks.push(timeBlock);

            console.log('[useWeekViewDataSimplified] Created availability time block:', {
              day: weekDay.toFormat('yyyy-MM-dd'),
              dayOfWeek: dayOfWeekName,
              slot: slotNum,
              originalStart: startTime,
              originalEnd: endTime,
              slotTimezone,
              displayStart: displayStart.toFormat('HH:mm'),
              displayEnd: displayEnd.toFormat('HH:mm'),
              displayTimezone: validClinicianTimeZone
            });
          } catch (error) {
            console.error('[useWeekViewDataSimplified] Error processing availability slot:', {
              day: dayOfWeekName,
              slot: slotNum,
              startTime,
              endTime,
              error
            });
          }
        }
      }
    });

    console.log('[useWeekViewDataSimplified] Processed availability blocks:', {
      count: processedTimeBlocks.length,
      timezone: validClinicianTimeZone,
      blocks: processedTimeBlocks.map(b => ({
        day: b.day?.toFormat('yyyy-MM-dd'),
        start: b.start.toFormat('HH:mm'),
        end: b.end.toFormat('HH:mm')
      }))
    });

    return processedTimeBlocks;
  };

  // Fetch clinician availability data
  useEffect(() => {
    const fetchClinicianAvailability = async () => {
      if (!selectedClinicianId || !days || days.length === 0) {
        console.log('[useWeekViewDataSimplified] Skipping availability fetch - missing clinician or days');
        setClinicianAvailability(null);
        setTimeBlocks([]);
        return;
      }

      try {
        console.log('[useWeekViewDataSimplified] Fetching clinician availability for:', selectedClinicianId);

        const { data: clinicianData, error: clinicianError } = await supabase
          .from('clinicians')
          .select(`
            id,
            clinician_time_zone,
            clinician_availability_start_monday_1,
            clinician_availability_end_monday_1,
            clinician_availability_timezone_monday_1,
            clinician_availability_start_monday_2,
            clinician_availability_end_monday_2,
            clinician_availability_timezone_monday_2,
            clinician_availability_start_monday_3,
            clinician_availability_end_monday_3,
            clinician_availability_timezone_monday_3,
            clinician_availability_start_tuesday_1,
            clinician_availability_end_tuesday_1,
            clinician_availability_timezone_tuesday_1,
            clinician_availability_start_tuesday_2,
            clinician_availability_end_tuesday_2,
            clinician_availability_timezone_tuesday_2,
            clinician_availability_start_tuesday_3,
            clinician_availability_end_tuesday_3,
            clinician_availability_timezone_tuesday_3,
            clinician_availability_start_wednesday_1,
            clinician_availability_end_wednesday_1,
            clinician_availability_timezone_wednesday_1,
            clinician_availability_start_wednesday_2,
            clinician_availability_end_wednesday_2,
            clinician_availability_timezone_wednesday_2,
            clinician_availability_start_wednesday_3,
            clinician_availability_end_wednesday_3,
            clinician_availability_timezone_wednesday_3,
            clinician_availability_start_thursday_1,
            clinician_availability_end_thursday_1,
            clinician_availability_timezone_thursday_1,
            clinician_availability_start_thursday_2,
            clinician_availability_end_thursday_2,
            clinician_availability_timezone_thursday_2,
            clinician_availability_start_thursday_3,
            clinician_availability_end_thursday_3,
            clinician_availability_timezone_thursday_3,
            clinician_availability_start_friday_1,
            clinician_availability_end_friday_1,
            clinician_availability_timezone_friday_1,
            clinician_availability_start_friday_2,
            clinician_availability_end_friday_2,
            clinician_availability_timezone_friday_2,
            clinician_availability_start_friday_3,
            clinician_availability_end_friday_3,
            clinician_availability_timezone_friday_3,
            clinician_availability_start_saturday_1,
            clinician_availability_end_saturday_1,
            clinician_availability_timezone_saturday_1,
            clinician_availability_start_saturday_2,
            clinician_availability_end_saturday_2,
            clinician_availability_timezone_saturday_2,
            clinician_availability_start_saturday_3,
            clinician_availability_end_saturday_3,
            clinician_availability_timezone_saturday_3,
            clinician_availability_start_sunday_1,
            clinician_availability_end_sunday_1,
            clinician_availability_timezone_sunday_1,
            clinician_availability_start_sunday_2,
            clinician_availability_end_sunday_2,
            clinician_availability_timezone_sunday_2,
            clinician_availability_start_sunday_3,
            clinician_availability_end_sunday_3,
            clinician_availability_timezone_sunday_3
          `)
          .eq('id', selectedClinicianId)
          .single();

        if (clinicianError) {
          console.error('[useWeekViewDataSimplified] Error fetching clinician availability:', clinicianError);
          setError(clinicianError.message);
          return;
        }

        console.log('[useWeekViewDataSimplified] Fetched clinician availability data:', {
          clinicianId: selectedClinicianId,
          hasData: !!clinicianData,
          sampleAvailability: {
            monday_1_start: clinicianData?.clinician_availability_start_monday_1,
            monday_1_end: clinicianData?.clinician_availability_end_monday_1,
            tuesday_1_start: clinicianData?.clinician_availability_start_tuesday_1,
            tuesday_1_end: clinicianData?.clinician_availability_end_tuesday_1
          }
        });

        setClinicianAvailability(clinicianData);

        // Process the availability data into time blocks
        const processedTimeBlocks = processClinicianAvailability(clinicianData, weekDays);
        setTimeBlocks(processedTimeBlocks);

      } catch (error) {
        console.error('[useWeekViewDataSimplified] Unexpected error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    fetchClinicianAvailability();
  }, [selectedClinicianId, days, validClinicianTimeZone, refreshTrigger, weekDays]);

  // Process appointments into appointment blocks using clinician's timezone
  useEffect(() => {
    console.log('[useWeekViewDataSimplified] Processing appointments for WeekView positioning using clinician timezone:', {
      appointmentsCount: appointments.length,
      clinicianTimeZone: validClinicianTimeZone,
      sampleAppointment: appointments[0] ? {
        id: appointments[0].id,
        start_at: appointments[0].start_at,
        appointment_timezone: appointments[0].appointment_timezone
      } : null
    });

    const processedAppointmentBlocks: AppointmentBlock[] = [];

    appointments.forEach(appointment => {
      if (!appointment.start_at || !appointment.end_at) {
        console.warn('[useWeekViewDataSimplified] Invalid appointment times:', {
          appointmentId: appointment.id,
          start_at: appointment.start_at,
          end_at: appointment.end_at
        });
        return;
      }

      try {
        console.log('[useWeekViewDataSimplified] Converting appointment times for WeekView positioning using clinician timezone:', {
          appointmentId: appointment.id,
          originalStart: appointment.start_at,
          originalTimezone: appointment.appointment_timezone,
          clinicianTimeZone: validClinicianTimeZone
        });

        // PHASE 2: Use clinician's timezone for calendar positioning
        const start = DateTime.fromISO(appointment.start_at, { zone: 'UTC' }).setZone(validClinicianTimeZone);
        const end = DateTime.fromISO(appointment.end_at, { zone: 'UTC' }).setZone(validClinicianTimeZone);
        const day = start.startOf('day');

        // PHASE 4: Validate DateTime objects
        if (!start.isValid || !end.isValid) {
          console.error('[useWeekViewDataSimplified] Invalid DateTime objects for appointment:', {
            appointmentId: appointment.id,
            startInvalid: start.invalidReason,
            endInvalid: end.invalidReason
          });
          return;
        }

        // Get client name
        let clientName = appointment.clientName;
        if (!clientName && appointment.client) {
          clientName = appointment.client.client_preferred_name || 
                      `${appointment.client.client_first_name} ${appointment.client.client_last_name}`;
        }
        if (!clientName) {
          clientName = getClientName(appointment.client_id);
        }

        const appointmentBlock: AppointmentBlock = {
          id: appointment.id,
          appointmentId: appointment.id,
          clientId: appointment.client_id,
          clientName,
          start,
          end,
          day,
          type: appointment.type,
          status: appointment.status,
          start_at: appointment.start_at,
          end_at: appointment.end_at,
          appointment_recurring: appointment.appointment_recurring,
          recurring_group_id: appointment.recurring_group_id,
          video_room_url: appointment.video_room_url,
          notes: appointment.notes,
          client: appointment.client,
          appointment_timezone: appointment.appointment_timezone
        };

        processedAppointmentBlocks.push(appointmentBlock);

        console.log('[useWeekViewDataSimplified] Created appointment block for WeekView using clinician timezone:', {
          appointmentId: appointment.id,
          clientName,
          originalStart: appointment.start_at,
          originalTimezone: appointment.appointment_timezone,
          convertedStart: start.toFormat('yyyy-MM-dd HH:mm'),
          convertedEnd: end.toFormat('yyyy-MM-dd HH:mm'),
          day: day.toFormat('yyyy-MM-dd'),
          clinicianTimeZone: validClinicianTimeZone,
          positionedInTimezone: validClinicianTimeZone
        });
      } catch (error) {
        console.error('[useWeekViewDataSimplified] Error creating appointment block:', {
          appointmentId: appointment.id,
          error
        });
      }
    });

    console.log('[useWeekViewDataSimplified] Final processed appointment blocks:', {
      count: processedAppointmentBlocks.length,
      timezone: validClinicianTimeZone,
      blocks: processedAppointmentBlocks.map(b => ({
        id: b.id,
        clientName: b.clientName,
        day: b.day?.toFormat('yyyy-MM-dd'),
        start: b.start.toFormat('HH:mm'),
        end: b.end.toFormat('HH:mm')
      }))
    });

    setAppointmentBlocks(processedAppointmentBlocks);
    setLoading(false);
  }, [appointments, validClinicianTimeZone, getClientName]);

  // PHASE 1: Refactor to accept only Luxon DateTime objects
  const isTimeSlotAvailable = (dayTimeSlot: DateTime): boolean => {
    console.log('[isTimeSlotAvailable] Checking slot in clinician timezone:', {
      slot: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
      timezone: dayTimeSlot.zoneName,
      validTimezone: validClinicianTimeZone
    });

    // PHASE 4: Validate timezone consistency
    if (dayTimeSlot.zoneName !== validClinicianTimeZone) {
      console.warn('[isTimeSlotAvailable] Timezone mismatch detected:', {
        slotTimezone: dayTimeSlot.zoneName,
        expectedTimezone: validClinicianTimeZone
      });
    }

    const result = timeBlocks.some(block => {
      const isSameDay = block.day?.hasSame(dayTimeSlot, 'day') || false;
      if (!isSameDay) return false;

      const isAvailable = dayTimeSlot >= block.start && dayTimeSlot < block.end;
      
      if (isAvailable) {
        console.log('[isTimeSlotAvailable] Found available slot:', {
          day: dayTimeSlot.toFormat('yyyy-MM-dd'),
          slotTime: dayTimeSlot.toFormat('HH:mm'),
          blockStart: block.start.toFormat('HH:mm'),
          blockEnd: block.end.toFormat('HH:mm'),
          timezone: validClinicianTimeZone
        });
      }

      return isAvailable;
    });

    return result;
  };

  // PHASE 1: Refactor to accept only Luxon DateTime objects
  const getBlockForTimeSlot = (dayTimeSlot: DateTime): TimeBlock | undefined => {
    console.log('[getBlockForTimeSlot] Looking for block at slot in clinician timezone:', {
      slot: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
      timezone: dayTimeSlot.zoneName,
      validTimezone: validClinicianTimeZone
    });

    // PHASE 4: Validate timezone consistency
    if (dayTimeSlot.zoneName !== validClinicianTimeZone) {
      console.warn('[getBlockForTimeSlot] Timezone mismatch detected:', {
        slotTimezone: dayTimeSlot.zoneName,
        expectedTimezone: validClinicianTimeZone
      });
    }

    return timeBlocks.find(block => {
      const isSameDay = block.day?.hasSame(dayTimeSlot, 'day') || false;
      if (!isSameDay) return false;

      return dayTimeSlot >= block.start && dayTimeSlot < block.end;
    });
  };

  // PHASE 1: Refactor to accept only Luxon DateTime objects
  const getAppointmentForTimeSlot = (dayTimeSlot: DateTime): AppointmentBlock | undefined => {
    console.log('[getAppointmentForTimeSlot] Looking for appointment at slot in clinician timezone:', {
      slot: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
      timezone: dayTimeSlot.zoneName,
      validTimezone: validClinicianTimeZone
    });

    // PHASE 4: Validate timezone consistency
    if (dayTimeSlot.zoneName !== validClinicianTimeZone) {
      console.warn('[getAppointmentForTimeSlot] Timezone mismatch detected:', {
        slotTimezone: dayTimeSlot.zoneName,
        expectedTimezone: validClinicianTimeZone
      });
    }

    const result = appointmentBlocks.find(appt => {
      // Check if it's the same day in the clinician's timezone
      const isSameDay = appt.day?.hasSame(dayTimeSlot, 'day') || false;
      if (!isSameDay) return false;

      // Since appointments are positioned in clinician's timezone, compare directly
      const isInRange = dayTimeSlot >= appt.start && dayTimeSlot < appt.end;
      
      if (isInRange) {
        console.log(`[getAppointmentForTimeSlot] Found appointment at ${dayTimeSlot.toFormat('yyyy-MM-dd HH:mm')} in clinician timezone:`, {
          appointmentId: appt.id,
          clientName: appt.clientName,
          slotTime: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
          apptStart: appt.start.toFormat('yyyy-MM-dd HH:mm'),
          apptEnd: appt.end.toFormat('yyyy-MM-dd HH:mm'),
          clinicianTimeZone: validClinicianTimeZone
        });
      }

      return isInRange;
    });

    return result;
  };

  return {
    loading,
    error,
    weekDays,
    appointmentBlocks,
    timeBlocks,
    isTimeSlotAvailable,
    getBlockForTimeSlot,
    getAppointmentForTimeSlot,
  };
};
