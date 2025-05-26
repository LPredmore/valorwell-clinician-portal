
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
export const convertAppointmentBlockToAppointment = (
  appointmentBlock: any,
  originalAppointments: Appointment[]
): Appointment => {
  console.log('[convertAppointmentBlockToAppointment] Converting:', {
    blockId: appointmentBlock.id,
    hasStart: !!appointmentBlock.start,
    hasEnd: !!appointmentBlock.end,
    startType: typeof appointmentBlock.start,
    endType: typeof appointmentBlock.end
  });

  // First, try to find the original appointment from the appointments array
  const originalAppointment = originalAppointments.find(a => a.id === appointmentBlock.id);
  if (originalAppointment) {
    console.log('[convertAppointmentBlockToAppointment] Found original appointment, using it');
    return originalAppointment;
  }

  // Convert DateTime objects to ISO strings
  let startAt: string;
  let endAt: string;

  try {
    // Handle Luxon DateTime objects properly
    if (appointmentBlock.start && typeof appointmentBlock.start === 'object' && appointmentBlock.start.toISO) {
      startAt = appointmentBlock.start.toUTC().toISO();
    } else if (typeof appointmentBlock.start === 'string') {
      startAt = appointmentBlock.start;
    } else {
      throw new Error('Invalid start time format');
    }

    if (appointmentBlock.end && typeof appointmentBlock.end === 'object' && appointmentBlock.end.toISO) {
      endAt = appointmentBlock.end.toUTC().toISO();
    } else if (typeof appointmentBlock.end === 'string') {
      endAt = appointmentBlock.end;
    } else {
      throw new Error('Invalid end time format');
    }

    console.log('[convertAppointmentBlockToAppointment] Converted times:', {
      startAt,
      endAt
    });

  } catch (error) {
    console.error('[convertAppointmentBlockToAppointment] DateTime conversion error:', error);
    // Fallback to current time if conversion fails
    const now = new Date().toISOString();
    startAt = now;
    endAt = now;
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
    clientName: appointmentBlock.clientName || 'Unknown Client'
  };

  console.log('[convertAppointmentBlockToAppointment] Created appointment:', {
    id: appointment.id,
    clientName: appointment.clientName,
    start_at: appointment.start_at,
    end_at: appointment.end_at
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
 * Formats appointment date for display
 */
export const formatAppointmentDate = (dateTimeString: string, timeZone: string): string => {
  try {
    const dateTime = DateTime.fromISO(dateTimeString).setZone(timeZone);
    return dateTime.toFormat('MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting appointment date:', error);
    return 'No date available';
  }
};

/**
 * Formats appointment time for display
 */
export const formatAppointmentTime = (dateTimeString: string, timeZone: string): string => {
  try {
    const dateTime = DateTime.fromISO(dateTimeString).setZone(timeZone);
    return dateTime.toFormat('h:mm a');
  } catch (error) {
    console.error('Error formatting appointment time:', error);
    return 'N/A';
  }
};
