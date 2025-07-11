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
 * CRITICAL: Supports 24-hour display from midnight to midnight for React Big Calendar
 * @param startTime Time string like "00:00"
 * @param endTime Time string like "23:59"
 * @param timezone The clinician's timezone
 * @returns Object with start and end Date objects for calendar bounds
 */
export const getCalendarTimeBounds = (
  startTime: string, 
  endTime: string, 
  timezone: string
): { start: Date; end: Date } => {
  // CRITICAL: Handle "loading" timezone gracefully with safe fallback
  if (timezone === 'loading') {
    console.log('[getCalendarTimeBounds] LOADING GUARD: Timezone loading, returning safe 24-hour fallback');
    const today = new Date();
    const startJSDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endJSDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0);
    return { start: startJSDate, end: endJSDate };
  }
  
  // Additional validation for edge cases
  if (!timezone || typeof timezone !== 'string') {
    console.error('[getCalendarTimeBounds] DEFENSIVE GUARD: Invalid timezone value:', { timezone, type: typeof timezone });
    const today = new Date();
    const startJSDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endJSDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0);
    return { start: startJSDate, end: endJSDate };
  }
  
  const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
  
  console.log('[getCalendarTimeBounds] TIMEZONE VALIDATION:', {
    originalTimezone: timezone,
    safeTimezone,
    startTime,
    endTime,
    isLoadingState: timezone === 'loading'
  });
  
  // Parse and validate time strings
  const startTimeParts = startTime.split(':').map(Number);
  const endTimeParts = endTime.split(':').map(Number);
  
  if (startTimeParts.length !== 2 || endTimeParts.length !== 2) {
    throw new Error(`Invalid time format: ${startTime} or ${endTime}`);
  }
  
  const [startHour, startMinute] = startTimeParts;
  const [endHour, endMinute] = endTimeParts;
  
  // Validate hour and minute ranges
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 ||
      startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
    throw new Error(`Invalid time values: ${startTime} or ${endTime}`);
  }
  
  // Use current date in timezone for consistent calendar display
  const now = DateTime.now().setZone(safeTimezone);
  const currentDate = now.startOf('day');
  
  // Create start time on current date
  const startDateTime = currentDate.set({ hour: startHour, minute: startMinute });
  
  // CRITICAL: For 24-hour display (00:00 to 23:59), React Big Calendar needs
  // the max time to be the NEXT day at midnight for proper display
  let endDateTime;
  if (startHour === 0 && endHour === 23 && endMinute === 59) {
    // 24-hour display: end time should be next day at midnight
    endDateTime = currentDate.plus({ days: 1 }).set({ hour: 0, minute: 0 });
    console.log('[getCalendarTimeBounds] DIAGNOSTIC: 24-hour display detected, using next-day midnight for end');
  } else {
    // Regular time range: use same day
    endDateTime = currentDate.set({ hour: endHour, minute: endMinute });
    
    // Ensure end time is after start time for non-24-hour ranges
    if (endDateTime <= startDateTime) {
      endDateTime = startDateTime.plus({ hours: 1 });
      console.log('[getCalendarTimeBounds] DIAGNOSTIC: Adjusted end time to ensure valid range');
    }
  }
  
  // Convert to JavaScript Dates
  const startJSDate = startDateTime.toJSDate();
  const endJSDate = endDateTime.toJSDate();
  
  console.log('[getCalendarTimeBounds] CALENDAR TIME BOUNDS VALIDATION:', {
    startTime: startDateTime.toISO(),
    endTime: endDateTime.toISO(),
    startJSDate: startJSDate.toISOString(),
    endJSDate: endJSDate.toISOString(),
    is24Hour: startHour === 0 && endHour === 23 && endMinute === 59,
    timezone: safeTimezone,
    hourSpan: Math.abs(endJSDate.getTime() - startJSDate.getTime()) / (1000 * 60 * 60),
    spansMultipleDays: startJSDate.getDate() !== endJSDate.getDate(),
    message: startHour === 0 && endHour === 23 && endMinute === 59 ? 
      '✅ 24-HOUR DISPLAY CONFIGURED' : 
      '⚠️ LIMITED TIME RANGE'
  });
  
  return { start: startJSDate, end: endJSDate };
};