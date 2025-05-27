import { Appointment } from '@/types/appointment';
import { DateTime } from 'luxon';
import { addWeeks, addMonths, format } from 'date-fns';

// Constants
export const DEFAULT_START_TIME = '09:00';

/**
 * Formats a client name consistently across the application
 */
export const formatClientName = (client: any): string => {
  if (!client) return 'Unknown Client';
  
  const preferredName = client.client_preferred_name?.trim();
  const firstName = client.client_first_name?.trim();
  const lastName = client.client_last_name?.trim();
  
  // Use preferred name if available, otherwise use first name
  const displayFirstName = preferredName || firstName || '';
  
  if (displayFirstName && lastName) {
    return `${displayFirstName} ${lastName}`;
  }
  
  return displayFirstName || lastName || 'Unknown Client';
};

/**
 * Converts an AppointmentBlock to a full Appointment object
 * This handles the case where calendar components pass AppointmentBlock objects
 * but we need full Appointment objects for dialogs and forms
 */
/**
 * Converts an AppointmentBlock to a full Appointment object
 * Handles different time formats and preserves all appointment data
 * @param appointmentBlock The appointment block to convert
 * @param originalAppointments Array of original appointments to search for a match
 * @returns A complete Appointment object
 */
export const convertAppointmentBlockToAppointment = (
  appointmentBlock: any,
  originalAppointments: Appointment[]
): Appointment => {
  // First, try to find the original appointment from the appointments array
  const originalAppointment = originalAppointments.find(a => a.id === appointmentBlock.id);
  if (originalAppointment) {
    return originalAppointment;
  }

  // Convert DateTime objects to ISO strings with proper error handling
  let startAt: string;
  let endAt: string;

  try {
    // Handle start time based on its type
    if (appointmentBlock.start) {
      if (typeof appointmentBlock.start === 'string') {
        // Already a string
        startAt = appointmentBlock.start;
      } else if (appointmentBlock.start &&
                typeof appointmentBlock.start === 'object' &&
                appointmentBlock.start.toISO) {
        // Luxon DateTime object
        startAt = appointmentBlock.start.toUTC().toISO();
      } else {
        throw new Error('Invalid start time format');
      }
    } else {
      throw new Error('No start time provided');
    }

    // Handle end time based on its type
    if (appointmentBlock.end) {
      if (typeof appointmentBlock.end === 'string') {
        // Already a string
        endAt = appointmentBlock.end;
      } else if (appointmentBlock.end &&
                typeof appointmentBlock.end === 'object' &&
                appointmentBlock.end.toISO) {
        // Luxon DateTime object
        endAt = appointmentBlock.end.toUTC().toISO();
      } else {
        throw new Error('Invalid end time format');
      }
    } else {
      throw new Error('No end time provided');
    }

    // Validate that we got valid ISO strings
    if (!startAt || !endAt) {
      throw new Error('Failed to get valid start/end times');
    }

    console.log('[convertAppointmentBlockToAppointment] Successfully converted times:', {
      startAt,
      endAt
    });

  } catch (error) {
    console.error('[convertAppointmentBlockToAppointment] DateTime conversion error:', error);
    console.error('[convertAppointmentBlockToAppointment] Failed appointment block:', appointmentBlock);
    
    // Instead of falling back to current time, try to preserve any existing time data
    if (appointmentBlock.start_at && appointmentBlock.end_at) {
      console.log('[convertAppointmentBlockToAppointment] Using fallback start_at/end_at fields');
      startAt = appointmentBlock.start_at;
      endAt = appointmentBlock.end_at;
    } else {
      console.error('[convertAppointmentBlockToAppointment] No fallback time data available, using current time');
      const now = new Date().toISOString();
      startAt = now;
      endAt = now;
    }
  }

  // Create the appointment object
  const appointment: Appointment = {
    id: appointmentBlock.id || appointmentBlock.appointmentId,
    client_id: appointmentBlock.clientId || appointmentBlock.client_id || '',
    clinician_id: appointmentBlock.clinicianId || '',
    start_at: startAt,
    end_at: endAt,
    type: appointmentBlock.type || 'appointment',
    status: appointmentBlock.status || 'scheduled',
    clientName: appointmentBlock.clientName || 'Unknown Client',
    // Preserve any additional fields from the original block
    appointment_recurring: appointmentBlock.appointment_recurring || null,
    recurring_group_id: appointmentBlock.recurring_group_id || null,
    video_room_url: appointmentBlock.video_room_url || null,
    notes: appointmentBlock.notes || null,
    client: appointmentBlock.client || null
  };

  console.log('[convertAppointmentBlockToAppointment] Created appointment:', {
    id: appointment.id,
    clientName: appointment.clientName,
    start_at: appointment.start_at,
    end_at: appointment.end_at,
    hasValidTimes: !!appointment.start_at && !!appointment.end_at
  });

  return appointment;
};

/**
 * Generates time options for appointment scheduling
 */
export const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 6; hour < 22; hour++) {
    for (let minute of [0, 15, 30, 45]) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(timeString);
    }
  }
  return options;
};

/**
 * Calculates end time based on start time (adds 1 hour by default)
 */
export const calculateEndTime = (startTime: string, durationMinutes: number = 60): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
};

/**
 * Ensures ID is a string (converts numbers to strings)
 */
export const ensureStringId = (id: string | number | null | undefined): string | null => {
  if (id === null || id === undefined) return null;
  return String(id);
};

/**
 * Generates recurring dates based on pattern
 */
export const generateRecurringDates = (startDate: Date, pattern: string, count: number = 24): Date[] => {
  const dates: Date[] = [startDate];
  
  for (let i = 1; i < count; i++) {
    let nextDate: Date;
    
    switch (pattern) {
      case 'weekly':
        nextDate = addWeeks(startDate, i);
        break;
      case 'biweekly':
        nextDate = addWeeks(startDate, i * 2);
        break;
      case 'monthly':
        nextDate = addMonths(startDate, i);
        break;
      default:
        nextDate = addWeeks(startDate, i);
    }
    
    dates.push(nextDate);
  }
  
  return dates;
};

/**
 * Formats time for display in the UI
 */
export const formatTimeDisplay = (time: string, timeZone?: string): string => {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timeZone || undefined
    });
  } catch (error) {
    return time;
  }
};

/**
 * Formats appointment date for display using the appointment's saved timezone
 */
export const formatAppointmentDate = (dateTimeString: string, appointmentTimeZone?: string): string => {
  console.log('[formatAppointmentDate] Formatting date:', { 
    dateTimeString, 
    appointmentTimeZone, 
    timeZoneType: typeof appointmentTimeZone, 
    isArray: Array.isArray(appointmentTimeZone) 
  });
  
  try {
    if (!dateTimeString) {
      console.warn('[formatAppointmentDate] No dateTimeString provided');
      return 'No date available';
    }
    
    // Use appointment's saved timezone or fall back to UTC
    let safeTimeZone: string;
    if (Array.isArray(appointmentTimeZone)) {
      console.warn('[formatAppointmentDate] TimeZone is an array, using first element:', appointmentTimeZone);
      safeTimeZone = appointmentTimeZone[0] || 'UTC';
    } else {
      safeTimeZone = appointmentTimeZone || 'UTC';
    }
    
    console.log('[formatAppointmentDate] Using safe timezone:', safeTimeZone);
    
    const dateTime = DateTime.fromISO(dateTimeString).setZone(safeTimeZone);
    
    if (!dateTime.isValid) {
      console.error('[formatAppointmentDate] Invalid DateTime:', {
        dateTimeString,
        timeZone: safeTimeZone,
        invalidReason: dateTime.invalidReason,
        invalidExplanation: dateTime.invalidExplanation
      });
      return 'Invalid date';
    }
    
    const formatted = dateTime.toFormat('MMM dd, yyyy');
    console.log('[formatAppointmentDate] Successfully formatted:', formatted);
    return formatted;
  } catch (error) {
    console.error('[formatAppointmentDate] Error formatting appointment date:', error);
    return 'Error formatting date';
  }
};

/**
 * Formats appointment time for display using the appointment's saved timezone
 */
export const formatAppointmentTime = (dateTimeString: string, appointmentTimeZone?: string): string => {
  console.log('[formatAppointmentTime] Formatting time:', { 
    dateTimeString, 
    appointmentTimeZone, 
    timeZoneType: typeof appointmentTimeZone, 
    isArray: Array.isArray(appointmentTimeZone) 
  });
  
  try {
    if (!dateTimeString) {
      console.warn('[formatAppointmentTime] No dateTimeString provided');
      return 'N/A';
    }
    
    // Use appointment's saved timezone or fall back to UTC
    let safeTimeZone: string;
    if (Array.isArray(appointmentTimeZone)) {
      console.warn('[formatAppointmentTime] TimeZone is an array, using first element:', appointmentTimeZone);
      safeTimeZone = appointmentTimeZone[0] || 'UTC';
    } else {
      safeTimeZone = appointmentTimeZone || 'UTC';
    }
    
    console.log('[formatAppointmentTime] Using safe timezone:', safeTimeZone);
    
    const dateTime = DateTime.fromISO(dateTimeString).setZone(safeTimeZone);
    
    if (!dateTime.isValid) {
      console.error('[formatAppointmentTime] Invalid DateTime:', {
        dateTimeString,
        timeZone: safeTimeZone,
        invalidReason: dateTime.invalidReason,
        invalidExplanation: dateTime.invalidExplanation
      });
      return 'Invalid time';
    }
    
    const formatted = dateTime.toFormat('h:mm a');
    console.log('[formatAppointmentTime] Successfully formatted:', formatted);
    return formatted;
  } catch (error) {
    console.error('[formatAppointmentTime] Error formatting appointment time:', error);
    return 'Error formatting time';
  }
};
