
import { TimeZoneService } from './timeZoneService';
import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';

// Default values
export const DEFAULT_START_TIME = "09:00";
export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60;

/**
 * Generate time options in 15-minute increments
 */
export const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      options.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return options;
};

/**
 * Calculate end time based on a start time and duration
 */
export const calculateEndTime = (startTimeStr: string, durationMinutes: number = DEFAULT_APPOINTMENT_DURATION_MINUTES): string => {
  try {
    // Create a DateTime object from the start time
    const startTime = TimeZoneService.fromTimeString(startTimeStr);
    
    // Add the duration
    const endTime = startTime.plus({ minutes: durationMinutes });
    
    // Format as HH:mm
    return TimeZoneService.formatTime24(endTime);
  } catch (error) {
    console.error('Error calculating end time:', error);
    
    // Fallback to manual calculation if TimeZoneService fails
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + durationMinutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }
};

/**
 * Format client name for display - standardized across the application
 * @param client Client data object containing name fields
 * @returns Consistently formatted client name string
 */
export const formatClientName = (client: {
  client_first_name?: string | null;
  client_preferred_name?: string | null;
  client_last_name?: string | null;
} | null): string => {
  if (!client) return 'Unknown Client';
  
  // STANDARDIZED CLIENT NAME FORMATTING LOGIC:
  // 1. Preferred name + last name if both exist
  // 2. First name + last name if both exist
  // 3. Whatever combination of names we can get
  if (client.client_preferred_name && client.client_last_name) {
    return `${client.client_preferred_name} ${client.client_last_name}`;
  } else if (client.client_first_name && client.client_last_name) {
    return `${client.client_first_name} ${client.client_last_name}`;
  } else {
    // Handle edge cases by joining whatever we have
    const nameComponents = [
      client.client_preferred_name || client.client_first_name || '', 
      client.client_last_name || ''
    ].filter(Boolean);
    
    return nameComponents.join(' ').trim() || 'Unknown Client';
  }
};

/**
 * Format time for display in a user-friendly way
 * @param timeStr Time string in 24-hour format (HH:mm)
 * @param timezone User's timezone
 * @returns Formatted time string (e.g. "9:00 AM")
 */
export const formatTimeDisplay = (timeStr: string, timezone: string): string => {
  try {
    const dateTime = TimeZoneService.fromTimeString(timeStr);
    if (!dateTime.isValid) {
      console.error('Invalid time string for formatting:', timeStr);
      return timeStr; // Return original if parsing fails
    }
    return dateTime.toFormat('h:mm a'); // Format as "9:00 AM"
  } catch (error) {
    console.error('Error formatting time display:', error);
    return timeStr; // Return original on error
  }
};

/**
 * Ensure consistent ID format for database queries
 */
export const ensureStringId = (id: string | null): string | null => {
  if (!id) return null;
  return id.toString().trim();
};

/**
 * Generate dates for recurring appointments
 */
export const generateRecurringDates = (
  startDate: Date,
  recurrenceType: string,
  count = 26 // Default to 6 months (26 weeks) of appointments
): Date[] => {
  // Convert the start date to a DateTime object
  let dt = TimeZoneService.fromJSDate(startDate);
  const dates: Date[] = [startDate];
  
  // Calculate the end date (6 months from start)
  const sixMonthsFromStart = TimeZoneService.addMonths(dt, 6);
  
  for (let i = 1; i < count; i++) {
    // Calculate the next date based on recurrence type
    if (recurrenceType === 'weekly') {
      dt = TimeZoneService.addDays(dt, 7);
    } else if (recurrenceType === 'biweekly') {
      dt = TimeZoneService.addDays(dt, 14);
    } else if (recurrenceType === 'monthly') {
      dt = TimeZoneService.addMonths(dt, 1);
    }
    
    // Stop if we've gone beyond 6 months
    if (dt > sixMonthsFromStart) {
      break;
    }
    
    // Convert back to JS Date and add to the array
    dates.push(dt.toJSDate());
  }
  
  return dates;
};

/**
 * Format appointment time for display using TimeZoneService
 * @param utcTimestamp UTC ISO timestamp string
 * @param userTimeZone IANA timezone string
 * @returns Formatted time string in user's timezone
 */
export const formatAppointmentTime = (utcTimestamp: string, userTimeZone: string): string => {
  try {
    return TimeZoneService.formatUTCInTimezone(utcTimestamp, userTimeZone, 'h:mm a');
  } catch (error) {
    console.error('Error formatting appointment time:', error);
    return 'Invalid time';
  }
};

/**
 * Format appointment date for display using TimeZoneService
 * @param utcTimestamp UTC ISO timestamp string
 * @param userTimeZone IANA timezone string
 * @returns Formatted date string in user's timezone
 */
export const formatAppointmentDate = (utcTimestamp: string, userTimeZone: string): string => {
  try {
    const localDate = TimeZoneService.fromUTC(utcTimestamp, userTimeZone);
    return localDate.toFormat('EEEE, MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting appointment date:', error);
    return 'Invalid date';
  }
};

/**
 * Convert an AppointmentBlock to a full Appointment object
 * This is used when we need to ensure we have a complete Appointment object
 * with all the necessary fields, especially when passing data to AppointmentDetailsDialog
 *
 * @param appointmentBlock AppointmentBlock from the calendar view
 * @param originalAppointments Array of original Appointment objects to find matching data
 * @returns A complete Appointment object
 */
export const convertAppointmentBlockToAppointment = (
  appointmentBlock: any,
  originalAppointments: any[]
): Appointment => {
  // First try to find the original appointment by ID
  const originalAppointment = originalAppointments.find(a => a.id === appointmentBlock.id);
  
  // If we found the original appointment, return it
  if (originalAppointment) {
    return originalAppointment;
  }
  
  // Otherwise, create a new Appointment object from the AppointmentBlock
  // Convert DateTime objects to ISO strings
  const start_at = appointmentBlock.start?.toUTC?.()?.toISO?.() || '';
  const end_at = appointmentBlock.end?.toUTC?.()?.toISO?.() || '';
  
  // Extract client name parts if available
  let firstName = '';
  let lastName = '';
  if (appointmentBlock.clientName) {
    const nameParts = appointmentBlock.clientName.split(' ');
    if (nameParts.length > 1) {
      // If there are multiple parts, assume last part is last name
      lastName = nameParts.pop() || '';
      firstName = nameParts.join(' ');
    } else {
      // If only one part, assume it's first name
      firstName = appointmentBlock.clientName;
    }
  }
  
  // Create a more complete client object
  const client = {
    client_first_name: firstName,
    client_last_name: lastName,
    client_preferred_name: firstName
  };
  
  // Log the conversion for debugging
  console.log('[convertAppointmentBlockToAppointment] Converting block to appointment:', {
    id: appointmentBlock.id,
    clientId: appointmentBlock.clientId,
    clientName: appointmentBlock.clientName,
    start: appointmentBlock.start?.toString(),
    end: appointmentBlock.end?.toString(),
    convertedStart: start_at,
    convertedEnd: end_at,
    extractedFirstName: firstName,
    extractedLastName: lastName
  });
  
  // Return a new Appointment object with the data from the AppointmentBlock
  return {
    id: appointmentBlock.id,
    client_id: appointmentBlock.clientId || '',
    clinician_id: '',  // We don't have this in AppointmentBlock
    start_at,
    end_at,
    type: appointmentBlock.type || 'appointment',
    status: 'scheduled',
    client,
    clientName: appointmentBlock.clientName || 'Unknown Client'
  };
};
