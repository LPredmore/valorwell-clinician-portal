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
  console.log('[getCalendarTimeBounds] DIAGNOSTIC: Input parameters:', {
    startTime,
    endTime,
    timezone
  });
  
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  console.log('[getCalendarTimeBounds] DIAGNOSTIC: Safe timezone:', safeTimezone);
  
  // Use a fixed, safe date instead of DateTime.now() to avoid timezone edge cases
  const baseDate = DateTime.fromISO('2025-01-01T00:00:00', { zone: safeTimezone }).startOf('day');
  console.log('[getCalendarTimeBounds] DIAGNOSTIC: Base date created:', {
    baseDate: baseDate.toISO(),
    isValid: baseDate.isValid,
    zone: baseDate.zoneName
  });
  
  // Parse and validate time strings
  const startTimeParts = startTime.split(':').map(Number);
  const endTimeParts = endTime.split(':').map(Number);
  
  if (startTimeParts.length !== 2 || endTimeParts.length !== 2) {
    console.error('[getCalendarTimeBounds] DIAGNOSTIC: Invalid time format:', { startTime, endTime });
    throw new Error(`Invalid time format: ${startTime} or ${endTime}`);
  }
  
  const [startHour, startMinute] = startTimeParts;
  const [endHour, endMinute] = endTimeParts;
  
  console.log('[getCalendarTimeBounds] DIAGNOSTIC: Parsed time components:', {
    startHour, startMinute, endHour, endMinute
  });
  
  // Validate hour and minute ranges
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 ||
      startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
    console.error('[getCalendarTimeBounds] DIAGNOSTIC: Invalid time values:', {
      startHour, startMinute, endHour, endMinute
    });
    throw new Error(`Invalid time values: ${startTime} or ${endTime}`);
  }
  
  // Create DateTime objects
  const startDateTime = baseDate.set({ hour: startHour, minute: startMinute });
  const endDateTime = baseDate.set({ hour: endHour, minute: endMinute });
  
  console.log('[getCalendarTimeBounds] DIAGNOSTIC: DateTime objects created:', {
    startDateTime: startDateTime.toISO(),
    endDateTime: endDateTime.toISO(),
    startValid: startDateTime.isValid,
    endValid: endDateTime.isValid
  });
  
  // Validate DateTime objects
  if (!startDateTime.isValid || !endDateTime.isValid) {
    console.error('[getCalendarTimeBounds] DIAGNOSTIC: Invalid DateTime objects:', {
      startDateTime: startDateTime.toISO(),
      endDateTime: endDateTime.toISO(),
      startReason: startDateTime.invalidReason,
      endReason: endDateTime.invalidReason
    });
    throw new Error(`Invalid DateTime: ${startDateTime.invalidReason || endDateTime.invalidReason}`);
  }
  
  // Convert to JavaScript Dates
  const startJSDate = startDateTime.toJSDate();
  const endJSDate = endDateTime.toJSDate();
  
  console.log('[getCalendarTimeBounds] DIAGNOSTIC: JavaScript Dates created:', {
    startJSDate,
    endJSDate,
    startValid: startJSDate instanceof Date && !isNaN(startJSDate.getTime()),
    endValid: endJSDate instanceof Date && !isNaN(endJSDate.getTime()),
    startTimestamp: startJSDate.getTime(),
    endTimestamp: endJSDate.getTime()
  });
  
  // Final validation of JavaScript Dates
  if (!startJSDate || !endJSDate || isNaN(startJSDate.getTime()) || isNaN(endJSDate.getTime())) {
    console.error('[getCalendarTimeBounds] DIAGNOSTIC: Invalid JavaScript Dates:', {
      startJSDate, endJSDate
    });
    throw new Error('Failed to create valid JavaScript Dates from DateTime objects');
  }
  
  const result = {
    start: startJSDate,
    end: endJSDate
  };
  
  console.log('[getCalendarTimeBounds] DIAGNOSTIC: Final result:', result);
  return result;
};