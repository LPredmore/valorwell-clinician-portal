import { DateTime } from 'luxon';
import { TimeZoneService } from './timeZoneService';

/**
 * Unified timezone conversion helpers
 * These functions provide the single source of truth for UTC ↔ Clinician timezone conversions
 */

/**
 * Convert a local DateTime to UTC for database storage
 * @param localDateTime DateTime object in the clinician's timezone
 * @param timezone The clinician's timezone
 * @returns DateTime object in UTC
 */
export const toUTC = (localDateTime: DateTime, timezone: string): DateTime => {
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  
  // Ensure the DateTime is in the specified timezone
  const inTimezone = localDateTime.setZone(safeTimezone, { keepLocalTime: true });
  
  // Convert to UTC
  return inTimezone.toUTC();
};

/**
 * Convert a UTC timestamp to the clinician's timezone for display
 * @param utcString UTC timestamp string in ISO format
 * @param timezone The clinician's timezone  
 * @returns DateTime object in the clinician's timezone
 */
export const fromUTC = (utcString: string, timezone: string): DateTime => {
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  
  // Parse as UTC, then convert to clinician timezone
  return DateTime.fromISO(utcString, { zone: 'UTC' }).setZone(safeTimezone);
};

/**
 * Create a DateTime from date and time strings in the clinician's timezone
 * @param dateStr Date string in YYYY-MM-DD format
 * @param timeStr Time string in HH:MM format
 * @param timezone The clinician's timezone
 * @returns DateTime object in the clinician's timezone
 */
export const createDateTime = (dateStr: string, timeStr: string, timezone: string): DateTime => {
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  
  const isoString = `${dateStr}T${timeStr}`;
  return DateTime.fromISO(isoString, { zone: safeTimezone });
};

/**
 * Convert form datetime-local input to UTC for storage
 * @param datetimeLocalStr String from datetime-local input (YYYY-MM-DDTHH:MM)
 * @param timezone The clinician's timezone
 * @returns UTC ISO string for database storage
 */
export const formInputToUTC = (datetimeLocalStr: string, timezone: string): string => {
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  
  // Parse the form input in the clinician's timezone
  const localDateTime = DateTime.fromISO(datetimeLocalStr, { zone: safeTimezone });
  
  // Convert to UTC for storage
  return localDateTime.toUTC().toISO();
};

/**
 * Convert UTC timestamp to datetime-local format for form display
 * @param utcString UTC timestamp string
 * @param timezone The clinician's timezone
 * @returns String in YYYY-MM-DDTHH:MM format for datetime-local input
 */
export const utcToFormInput = (utcString: string, timezone: string): string => {
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  
  // Convert UTC to clinician timezone
  const localDateTime = DateTime.fromISO(utcString, { zone: 'UTC' }).setZone(safeTimezone);
  
  // Format for datetime-local input
  return localDateTime.toFormat("yyyy-MM-dd'T'HH:mm");
};

/**
 * Convert UTC timestamp to JavaScript Date for React Big Calendar
 * This ensures events position correctly on the calendar
 * @param utcString UTC timestamp string
 * @param timezone The clinician's timezone for display
 * @returns JavaScript Date object
 */
export const utcToCalendarDate = (utcString: string, timezone: string): Date => {
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  
  // CRITICAL: Validate UTC string format
  if (!utcString || typeof utcString !== 'string') {
    console.error('[utcToCalendarDate] Invalid UTC string:', { utcString, type: typeof utcString });
    return new Date(); // Return current time as fallback
  }
  
  try {
    // Convert UTC to clinician timezone
    const localDateTime = DateTime.fromISO(utcString, { zone: 'UTC' }).setZone(safeTimezone);
    
    // CRITICAL: Validate DateTime before conversion
    if (!localDateTime.isValid) {
      console.error('[utcToCalendarDate] Invalid DateTime object:', {
        utcString,
        timezone: safeTimezone,
        error: localDateTime.invalidReason,
        explanation: localDateTime.invalidExplanation
      });
      return new Date(); // Return current time as fallback
    }
    
    // Convert to JS Date with additional validation
    const jsDate = localDateTime.toJSDate();
    
    // CRITICAL: Validate the resulting JavaScript Date
    if (!jsDate || isNaN(jsDate.getTime())) {
      console.error('[utcToCalendarDate] Invalid JavaScript Date result:', {
        utcString,
        timezone: safeTimezone,
        jsDate,
        dateTime: jsDate?.getTime()
      });
      return new Date(); // Return current time as fallback
    }
    
    return jsDate;
  } catch (error) {
    console.error('[utcToCalendarDate] Exception during conversion:', {
      utcString,
      timezone: safeTimezone,
      error: error.message
    });
    return new Date(); // Return current time as fallback
  }
};

/**
 * Get calendar time bounds in the clinician's timezone
 * @param startTime Time string like "08:00"
 * @param endTime Time string like "21:00"
 * @param timezone The clinician's timezone
 * @returns Object with start and end Date objects for calendar bounds
 */
export const getCalendarTimeBounds = (
  startTime: string, 
  endTime: string, 
  timezone: string
): { start: Date; end: Date } => {
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  
  // Use today's date in the clinician's timezone
  const today = DateTime.now().setZone(safeTimezone).startOf('day');
  
  // Create start and end times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startDateTime = today.set({ hour: startHour, minute: startMinute });
  const endDateTime = today.set({ hour: endHour, minute: endMinute });
  
  return {
    start: startDateTime.toJSDate(),
    end: endDateTime.toJSDate()
  };
};