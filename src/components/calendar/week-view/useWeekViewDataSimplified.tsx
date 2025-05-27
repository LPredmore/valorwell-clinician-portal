
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
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
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

  // Fetch availability data
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedClinicianId || !days || days.length === 0) {
        console.log('[useWeekViewDataSimplified] Skipping availability fetch - missing clinician or days');
        setAvailability([]);
        setTimeBlocks([]);
        return;
      }

      try {
        console.log('[useWeekViewDataSimplified] Fetching availability for clinician:', selectedClinicianId);
        
        // PHASE 2: Use clinician timezone for date range calculations
        const startDate = DateTime.fromJSDate(days[0], { zone: validClinicianTimeZone }).startOf('day').toUTC();
        const endDate = DateTime.fromJSDate(days[days.length - 1], { zone: validClinicianTimeZone }).endOf('day').toUTC();

        console.log('[useWeekViewDataSimplified] Fetching availability between:', {
          startDate: startDate.toISO(),
          endDate: endDate.toISO(),
          clinicianTimeZone: validClinicianTimeZone
        });

        const { data: availabilityData, error: availabilityError } = await supabase
          .from('availability_blocks')
          .select('*')
          .eq('clinician_id', selectedClinicianId)
          .gte('start_at', startDate.toISO())
          .lte('end_at', endDate.toISO())
          .eq('is_active', true);

        if (availabilityError) {
          console.error('[useWeekViewDataSimplified] Error fetching availability:', availabilityError);
          setError(availabilityError.message);
          return;
        }

        const blocks = availabilityData || [];
        console.log('[useWeekViewDataSimplified] Fetched availability blocks:', {
          count: blocks.length,
          blocks: blocks.map(b => ({
            id: b.id,
            start_at: b.start_at,
            end_at: b.end_at
          }))
        });
        setAvailability(blocks);

        // PHASE 2: Process time blocks using clinician timezone exclusively
        const processedTimeBlocks: TimeBlock[] = [];
        blocks.forEach(block => {
          if (!block.start_at || !block.end_at) {
            console.warn('[useWeekViewDataSimplified] Skipping block with missing times:', block.id);
            return;
          }

          try {
            // PHASE 3: Enhanced debug logging for timezone operations
            const start = DateTime.fromISO(block.start_at, { zone: 'UTC' }).setZone(validClinicianTimeZone);
            const end = DateTime.fromISO(block.end_at, { zone: 'UTC' }).setZone(validClinicianTimeZone);
            const day = start.startOf('day');

            console.log('[useWeekViewDataSimplified] Processing availability block in clinician timezone:', {
              blockId: block.id,
              utcStart: block.start_at,
              utcEnd: block.end_at,
              clinicianStart: start.toFormat('yyyy-MM-dd HH:mm'),
              clinicianEnd: end.toFormat('yyyy-MM-dd HH:mm'),
              day: day.toFormat('yyyy-MM-dd'),
              timezone: validClinicianTimeZone,
              startTzValid: start.isValid,
              endTzValid: end.isValid
            });

            if (!start.isValid || !end.isValid) {
              console.error('[useWeekViewDataSimplified] Invalid DateTime objects created:', {
                start: start.invalidReason,
                end: end.invalidReason
              });
              return;
            }

            processedTimeBlocks.push({
              start,
              end,
              day,
              availabilityIds: [block.id],
              isException: false,
              isStandalone: false
            });
          } catch (error) {
            console.error('[useWeekViewDataSimplified] Error processing time block:', error);
          }
        });

        console.log('[useWeekViewDataSimplified] Processed time blocks:', {
          count: processedTimeBlocks.length,
          timezone: validClinicianTimeZone,
          blocks: processedTimeBlocks.map(b => ({
            day: b.day?.toFormat('yyyy-MM-dd'),
            start: b.start.toFormat('HH:mm'),
            end: b.end.toFormat('HH:mm')
          }))
        });

        setTimeBlocks(processedTimeBlocks);
      } catch (error) {
        console.error('[useWeekViewDataSimplified] Unexpected error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    fetchAvailability();
  }, [selectedClinicianId, days, validClinicianTimeZone, refreshTrigger]);

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
