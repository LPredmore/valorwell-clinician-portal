
import { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { TimeZoneService } from '@/utils/timeZoneService';
import { TimeBlock, AppointmentBlock } from './types';

export const useWeekViewDataSimplified = (
  days: Date[],
  selectedClinicianId: string | null,
  refreshTrigger: number,
  appointments: any[],
  getClientName: (id: string) => string,
  userTimeZone: string
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert days to DateTime objects with error handling
  const weekDays = useMemo(() => {
    try {
      const safeTimeZone = TimeZoneService.ensureIANATimeZone(userTimeZone);
      return days.map(day => TimeZoneService.fromJSDate(day, safeTimeZone));
    } catch (err) {
      console.error('[useWeekViewDataSimplified] Error converting days:', err);
      setError('Error processing calendar days');
      return [];
    }
  }, [days, userTimeZone]);

  // Process appointments with error handling and proper timezone usage
  const appointmentBlocks = useMemo(() => {
    console.log('[useWeekViewDataSimplified] Processing appointments:', {
      appointmentsCount: appointments?.length || 0,
      sampleAppointment: appointments?.[0] || null,
      userTimeZone
    });
    
    try {
      if (!Array.isArray(appointments)) {
        console.warn('[useWeekViewDataSimplified] Appointments is not an array:', appointments);
        return [];
      }

      return appointments.map((appointment, index) => {
        console.log(`[useWeekViewDataSimplified] Processing appointment ${index}:`, {
          id: appointment.id,
          start_at: appointment.start_at,
          end_at: appointment.end_at,
          appointment_timezone: appointment.appointment_timezone,
          start_at_type: typeof appointment.start_at,
          end_at_type: typeof appointment.end_at
        });
        
        // Validate that we have the required time fields
        if (!appointment.start_at || !appointment.end_at) {
          console.error(`[useWeekViewDataSimplified] Missing time data for appointment ${appointment.id}:`, {
            start_at: appointment.start_at,
            end_at: appointment.end_at
          });
          return null;
        }
        
        try {
          // Use the appointment's saved timezone if available, otherwise fall back to userTimeZone
          const appointmentTimeZone = appointment.appointment_timezone || userTimeZone;
          
          console.log(`[useWeekViewDataSimplified] Using timezone for appointment ${appointment.id}:`, {
            appointmentTimeZone,
            hasAppointmentTimezone: !!appointment.appointment_timezone,
            userTimeZone
          });
          
          // Parse the appointment times in UTC first
          const startDateTimeUTC = DateTime.fromISO(appointment.start_at);
          const endDateTimeUTC = DateTime.fromISO(appointment.end_at);
          
          if (!startDateTimeUTC.isValid) {
            console.error(`[useWeekViewDataSimplified] Invalid start time for appointment ${appointment.id}:`, {
              start_at: appointment.start_at,
              invalidReason: startDateTimeUTC.invalidReason,
              invalidExplanation: startDateTimeUTC.invalidExplanation
            });
            return null;
          }
          
          if (!endDateTimeUTC.isValid) {
            console.error(`[useWeekViewDataSimplified] Invalid end time for appointment ${appointment.id}:`, {
              end_at: appointment.end_at,
              invalidReason: endDateTimeUTC.invalidReason,
              invalidExplanation: endDateTimeUTC.invalidExplanation
            });
            return null;
          }
          
          // Convert to the appointment's timezone for proper positioning
          const startDateTime = startDateTimeUTC.setZone(appointmentTimeZone);
          const endDateTime = endDateTimeUTC.setZone(appointmentTimeZone);
          
          console.log(`[useWeekViewDataSimplified] Timezone conversion for appointment ${appointment.id}:`, {
            original_start_utc: startDateTimeUTC.toISO(),
            original_end_utc: endDateTimeUTC.toISO(),
            converted_start: startDateTime.toISO(),
            converted_end: endDateTime.toISO(),
            timezone_used: appointmentTimeZone
          });
          
          const appointmentBlock = {
            id: appointment.id,
            appointmentId: appointment.id,
            clientId: appointment.client_id,
            clientName: appointment.clientName || getClientName(appointment.client_id),
            start: startDateTime,
            end: endDateTime,
            day: startDateTime, // Add the required day property
            type: appointment.type || 'appointment',
            status: appointment.status || 'scheduled',
            // Include all original appointment data for conversion
            start_at: appointment.start_at,
            end_at: appointment.end_at,
            appointment_recurring: appointment.appointment_recurring,
            recurring_group_id: appointment.recurring_group_id,
            video_room_url: appointment.video_room_url,
            notes: appointment.notes,
            client: appointment.client,
            appointment_timezone: appointmentTimeZone // Store the timezone used
          };
          
          console.log(`[useWeekViewDataSimplified] Successfully created appointment block ${index}:`, {
            id: appointmentBlock.id,
            clientName: appointmentBlock.clientName,
            start: appointmentBlock.start.toISO(),
            end: appointmentBlock.end.toISO(),
            timezone: appointmentBlock.appointment_timezone,
            hasOriginalData: !!(appointmentBlock.start_at && appointmentBlock.end_at)
          });
          
          return appointmentBlock;
        } catch (err) {
          console.error(`[useWeekViewDataSimplified] Error processing appointment ${appointment.id}:`, err);
          return null;
        }
      }).filter(Boolean); // Remove any null entries
    } catch (err) {
      console.error('[useWeekViewDataSimplified] Error processing appointments:', err);
      setError('Error processing appointments');
      return [];
    }
  }, [appointments, getClientName, userTimeZone]);

  // Simplified time blocks (empty for now to prevent crashes)
  const timeBlocks: TimeBlock[] = [];

  // Simple availability check
  const isTimeSlotAvailable = (day: Date, timeSlot: Date): boolean => {
    return false; // Simplified - no availability checking to prevent crashes
  };

  const getBlockForTimeSlot = (day: Date, timeSlot: Date): TimeBlock | undefined => {
    return undefined; // Simplified
  };

  const getAppointmentForTimeSlot = (day: Date, timeSlot: Date): AppointmentBlock | undefined => {
    try {
      // Use userTimeZone for the time slot comparison since the calendar grid is in user's timezone
      const dayDateTime = TimeZoneService.fromJSDate(day, userTimeZone);
      const timeSlotDateTime = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
      
      const foundAppointment = appointmentBlocks.find(appointment => {
        if (!appointment.start || !appointment.end) return false;
        
        // Convert appointment times to user's timezone for comparison with the grid
        const appointmentTimeZone = appointment.appointment_timezone || userTimeZone;
        const appointmentStartInUserTZ = appointment.start.setZone(userTimeZone);
        const appointmentEndInUserTZ = appointment.end.setZone(userTimeZone);
        
        const isSameDay = appointmentStartInUserTZ.hasSame(dayDateTime, 'day');
        const isInTimeSlot = timeSlotDateTime >= appointmentStartInUserTZ && 
                            timeSlotDateTime < appointmentEndInUserTZ;
        
        if (isSameDay && isInTimeSlot) {
          console.log(`[useWeekViewDataSimplified] Found appointment for time slot:`, {
            appointmentId: appointment.id,
            appointmentTimeZone,
            day: dayDateTime.toFormat('yyyy-MM-dd'),
            timeSlot: timeSlotDateTime.toFormat('HH:mm'),
            appointmentStartOriginal: appointment.start.toFormat('yyyy-MM-dd HH:mm'),
            appointmentStartInUserTZ: appointmentStartInUserTZ.toFormat('yyyy-MM-dd HH:mm'),
            appointmentEndOriginal: appointment.end.toFormat('yyyy-MM-dd HH:mm'),
            appointmentEndInUserTZ: appointmentEndInUserTZ.toFormat('yyyy-MM-dd HH:mm')
          });
        }
        
        return isSameDay && isInTimeSlot;
      });
      
      return foundAppointment;
    } catch (err) {
      console.error('[useWeekViewDataSimplified] Error in getAppointmentForTimeSlot:', err);
      return undefined;
    }
  };

  useEffect(() => {
    console.log('[useWeekViewDataSimplified] Initialized with:', {
      daysCount: days.length,
      appointmentsCount: appointments?.length || 0,
      appointmentBlocksCount: appointmentBlocks.length,
      clinicianId: selectedClinicianId,
      timeZone: userTimeZone,
      refreshTrigger
    });
  }, [days.length, appointments?.length, appointmentBlocks.length, selectedClinicianId, userTimeZone, refreshTrigger]);

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
