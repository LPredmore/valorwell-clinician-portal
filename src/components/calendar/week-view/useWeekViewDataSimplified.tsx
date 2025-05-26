
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

  // Process appointments with error handling
  const appointmentBlocks = useMemo(() => {
    try {
      if (!Array.isArray(appointments)) {
        console.warn('[useWeekViewDataSimplified] Appointments is not an array:', appointments);
        return [];
      }

      return appointments.map(appointment => ({
        id: appointment.id,
        appointmentId: appointment.id,
        clientId: appointment.client_id,
        clientName: appointment.clientName || getClientName(appointment.client_id),
        start: DateTime.fromISO(appointment.start_at),
        end: DateTime.fromISO(appointment.end_at),
        type: appointment.type || 'appointment',
        status: appointment.status || 'scheduled'
      }));
    } catch (err) {
      console.error('[useWeekViewDataSimplified] Error processing appointments:', err);
      setError('Error processing appointments');
      return [];
    }
  }, [appointments, getClientName]);

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
      const dayDateTime = TimeZoneService.fromJSDate(day, userTimeZone);
      const timeSlotDateTime = TimeZoneService.fromJSDate(timeSlot, userTimeZone);
      
      return appointmentBlocks.find(appointment => {
        if (!appointment.start || !appointment.end) return false;
        
        const isSameDay = appointment.start.hasSame(dayDateTime, 'day');
        const isInTimeSlot = timeSlotDateTime >= appointment.start && 
                            timeSlotDateTime < appointment.end;
        
        return isSameDay && isInTimeSlot;
      });
    } catch (err) {
      console.error('[useWeekViewDataSimplified] Error in getAppointmentForTimeSlot:', err);
      return undefined;
    }
  };

  useEffect(() => {
    console.log('[useWeekViewDataSimplified] Initialized with:', {
      daysCount: days.length,
      appointmentsCount: appointments?.length || 0,
      clinicianId: selectedClinicianId,
      timeZone: userTimeZone,
      refreshTrigger
    });
  }, [days.length, appointments?.length, selectedClinicianId, userTimeZone, refreshTrigger]);

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
