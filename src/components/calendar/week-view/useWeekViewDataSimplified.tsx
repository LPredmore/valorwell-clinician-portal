
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
  userTimeZone: string
) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [appointmentBlocks, setAppointmentBlocks] = useState<AppointmentBlock[]>([]);

  // Generate week days from the provided days array
  const weekDays = useMemo(() => {
    if (!days || days.length === 0) {
      return [];
    }
    
    return days.map(day => TimeZoneService.fromJSDate(day, userTimeZone));
  }, [days, userTimeZone]);

  // Fetch availability data
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedClinicianId || !days || days.length === 0) {
        setAvailability([]);
        setTimeBlocks([]);
        return;
      }

      try {
        const startDate = DateTime.fromJSDate(days[0], { zone: userTimeZone }).startOf('day').toUTC();
        const endDate = DateTime.fromJSDate(days[days.length - 1], { zone: userTimeZone }).endOf('day').toUTC();

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
        setAvailability(blocks);

        // Process time blocks
        const processedTimeBlocks: TimeBlock[] = [];
        blocks.forEach(block => {
          if (!block.start_at || !block.end_at) return;

          try {
            const start = DateTime.fromISO(block.start_at, { zone: 'UTC' }).setZone(userTimeZone);
            const end = DateTime.fromISO(block.end_at, { zone: 'UTC' }).setZone(userTimeZone);
            const day = start.startOf('day');

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

        setTimeBlocks(processedTimeBlocks);
      } catch (error) {
        console.error('[useWeekViewDataSimplified] Unexpected error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    fetchAvailability();
  }, [selectedClinicianId, days, userTimeZone, refreshTrigger]);

  // Process appointments into appointment blocks
  useEffect(() => {
    console.log('[useWeekViewDataSimplified] Processing appointments:', {
      appointmentsCount: appointments.length,
      userTimeZone,
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
        // CRITICAL FIX: Use the appointment's original timezone for positioning
        // If appointment_timezone is available, use it; otherwise fall back to userTimeZone
        const appointmentTimeZone = appointment.appointment_timezone || userTimeZone;
        
        console.log('[useWeekViewDataSimplified] Converting appointment times:', {
          appointmentId: appointment.id,
          originalStart: appointment.start_at,
          appointmentTimeZone,
          userTimeZone
        });

        // Convert UTC times to the appointment's timezone for positioning
        const start = DateTime.fromISO(appointment.start_at, { zone: 'UTC' }).setZone(appointmentTimeZone);
        const end = DateTime.fromISO(appointment.end_at, { zone: 'UTC' }).setZone(appointmentTimeZone);
        const day = start.startOf('day');

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
          appointment_timezone: appointmentTimeZone
        };

        processedAppointmentBlocks.push(appointmentBlock);

        console.log('[useWeekViewDataSimplified] Created appointment block:', {
          appointmentId: appointment.id,
          clientName,
          originalStart: appointment.start_at,
          convertedStart: start.toFormat('yyyy-MM-dd HH:mm'),
          convertedEnd: end.toFormat('yyyy-MM-dd HH:mm'),
          day: day.toFormat('yyyy-MM-dd'),
          appointmentTimeZone,
          userTimeZone
        });
      } catch (error) {
        console.error('[useWeekViewDataSimplified] Error creating appointment block:', {
          appointmentId: appointment.id,
          error
        });
      }
    });

    setAppointmentBlocks(processedAppointmentBlocks);
    setLoading(false);
  }, [appointments, userTimeZone, getClientName]);

  // Utility function to check if a time slot is available
  const isTimeSlotAvailable = (day: Date, timeSlot: Date): boolean => {
    const dayDt = DateTime.fromJSDate(day, { zone: userTimeZone });
    const timeSlotDt = DateTime.fromJSDate(timeSlot, { zone: userTimeZone });

    return timeBlocks.some(block => {
      const isSameDay = block.day?.hasSame(dayDt, 'day') || false;
      if (!isSameDay) return false;

      const slotTime = dayDt.set({
        hour: timeSlotDt.hour,
        minute: timeSlotDt.minute,
        second: 0,
        millisecond: 0
      });

      return slotTime >= block.start && slotTime < block.end;
    });
  };

  // Utility function to get the block for a time slot
  const getBlockForTimeSlot = (day: Date, timeSlot: Date): TimeBlock | undefined => {
    const dayDt = DateTime.fromJSDate(day, { zone: userTimeZone });
    const timeSlotDt = DateTime.fromJSDate(timeSlot, { zone: userTimeZone });

    return timeBlocks.find(block => {
      const isSameDay = block.day?.hasSame(dayDt, 'day') || false;
      if (!isSameDay) return false;

      const slotTime = dayDt.set({
        hour: timeSlotDt.hour,
        minute: timeSlotDt.minute,
        second: 0,
        millisecond: 0
      });

      return slotTime >= block.start && slotTime < block.end;
    });
  };

  // CRITICAL FIX: Updated utility function to get appointment for a time slot
  // This function now properly handles appointment timezone conversion
  const getAppointmentForTimeSlot = (day: Date, timeSlot: Date): AppointmentBlock | undefined => {
    const dayDt = DateTime.fromJSDate(day, { zone: userTimeZone });
    const timeSlotDt = DateTime.fromJSDate(timeSlot, { zone: userTimeZone });

    const result = appointmentBlocks.find(appt => {
      // Check if it's the same day
      const isSameDay = appt.day?.hasSame(dayDt, 'day') || false;
      if (!isSameDay) return false;

      // CRITICAL: Convert the time slot to the appointment's timezone for comparison
      const appointmentTimeZone = appt.appointment_timezone || userTimeZone;
      
      // Convert the time slot from user timezone to appointment timezone
      let slotTimeInApptTz: DateTime;
      if (appointmentTimeZone === userTimeZone) {
        // Same timezone, no conversion needed
        slotTimeInApptTz = dayDt.set({
          hour: timeSlotDt.hour,
          minute: timeSlotDt.minute,
          second: 0,
          millisecond: 0
        });
      } else {
        // Convert to UTC first, then to appointment timezone
        const slotTimeUTC = dayDt.set({
          hour: timeSlotDt.hour,
          minute: timeSlotDt.minute,
          second: 0,
          millisecond: 0
        }).toUTC();
        slotTimeInApptTz = slotTimeUTC.setZone(appointmentTimeZone);
      }

      const isInRange = slotTimeInApptTz >= appt.start && slotTimeInApptTz < appt.end;
      
      // Debug logging for the problematic appointment
      if (appt.clientName?.includes('Luke') || appt.clientName?.includes('zzVilla')) {
        console.log('[getAppointmentForTimeSlot] Checking Luke appointment:', {
          appointmentId: appt.id,
          dayCheck: isSameDay,
          slotDay: dayDt.toFormat('yyyy-MM-dd'),
          apptDay: appt.day?.toFormat('yyyy-MM-dd'),
          slotTime: timeSlotDt.toFormat('HH:mm'),
          slotTimeInApptTz: slotTimeInApptTz.toFormat('HH:mm'),
          apptStart: appt.start.toFormat('HH:mm'),
          apptEnd: appt.end.toFormat('HH:mm'),
          appointmentTimeZone,
          userTimeZone,
          isInRange
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
