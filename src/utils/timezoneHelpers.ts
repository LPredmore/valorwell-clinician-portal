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
 * Convert form datetime-local input to UTC for storage using browser timezone
 * @param datetimeLocalStr String from datetime-local input (YYYY-MM-DDTHH:MM)
 * @returns UTC ISO string for database storage
 */
export const formInputToUTC = (datetimeLocalStr: string): string => {
  // Get the browser's timezone
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Parse the form input explicitly in the browser's timezone
  const localDateTime = DateTime.fromISO(datetimeLocalStr, { zone: browserTimeZone });
  
  // Convert to UTC for storage
  return localDateTime.toUTC().toISO();
};

/**
 * Convert UTC timestamp to datetime-local format for form display using browser timezone
 * @param utcString UTC timestamp string
 * @returns String in YYYY-MM-DDTHH:MM format for datetime-local input
 */
export const utcToFormInput = (utcString: string): string => {
  // Convert UTC to browser timezone
  const localDateTime = DateTime.fromISO(utcString, { zone: 'UTC' });
  
  // Format for datetime-local input
  return localDateTime.toFormat("yyyy-MM-dd'T'HH:mm");
};

/**
 * Convert UTC timestamp to JavaScript Date for React Big Calendar using browser timezone
 * @param utcString UTC timestamp string
 * @returns JavaScript Date object
 */
export const utcToCalendarDate = (utcString: string): Date => {
  console.debug('[utcToCalendarDate] args:', { utcString });
  
  // CRITICAL: Validate UTC string format
  if (!utcString || typeof utcString !== 'string') {
    console.error('[utcToCalendarDate] Invalid UTC string:', { utcString, type: typeof utcString });
    return new Date(); // Return current time as fallback
  }
  
  try {
    // Direct conversion using browser timezone
    const jsDate = new Date(utcString);
    
    // CRITICAL: Validate the resulting JavaScript Date
    if (!jsDate || isNaN(jsDate.getTime())) {
      console.error('[utcToCalendarDate] Invalid JavaScript Date result:', {
        utcString,
        jsDate,
        dateTime: jsDate?.getTime()
      });
      return new Date(); // Return current time as fallback
    }
    
    return jsDate;
  } catch (error) {
    console.error('[utcToCalendarDate] Exception during conversion:', {
      utcString,
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
  endTime: string
): { start: Date; end: Date } => {
  // Use browser's local timezone exclusively
  console.log('[getCalendarTimeBounds] BROWSER TIMEZONE MODE: Using local timezone only');
  
  console.log('[getCalendarTimeBounds] BROWSER TIMEZONE:', {
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    startTime,
    endTime
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
  
  // Use current date in browser's local timezone
  const now = DateTime.now(); // Uses browser's local timezone
  const currentDate = now.startOf('day');
  
  // Create start time on current date
  const startDateTime = currentDate.set({ hour: startHour, minute: startMinute });
  
  // Create end time on current date - keep both start and end on same day
  let endDateTime = currentDate.set({ hour: endHour, minute: endMinute });
  
  // CRITICAL: For React Big Calendar, both minTime and maxTime must be on the same date
  // Do NOT roll over to next day - keep end time as 23:59 on the same day
  if (endDateTime <= startDateTime) {
    // Only adjust if end time is actually before start time (not for 23:59)
    endDateTime = startDateTime.plus({ hours: 1 });
    console.log('[getCalendarTimeBounds] DIAGNOSTIC: Adjusted end time to ensure valid range');
  }
  
  // Convert to JavaScript Dates
  const startJSDate = startDateTime.toJSDate();
  const endJSDate = endDateTime.toJSDate();
  
  // Phase 2: Validate Time Zone Service
  console.log('[getCalendarTimeBounds] BROWSER TIMEZONE CONVERSION:', {
    inputStartTime: startTime,
    inputEndTime: endTime,
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    
    // Show intermediate DateTime objects
    startDateTimeISO: startDateTime.toISO(),
    endDateTimeISO: endDateTime.toISO(),
    startDateTimeOffset: startDateTime.offset,
    endDateTimeOffset: endDateTime.offset,
    
    // Show final JS Date conversion
    startJSDateISO: startJSDate.toISOString(),
    endJSDateISO: endJSDate.toISOString(),
    startJSDateLocal: startJSDate.toString(),
    endJSDateLocal: endJSDate.toString(),
    
    // Critical: Show what hours these represent
    startHourUTC: startJSDate.getUTCHours(),
    endHourUTC: endJSDate.getUTCHours(),
    startHourLocal: startJSDate.getHours(),
    endHourLocal: endJSDate.getHours(),
  });
  
  console.log('[getCalendarTimeBounds] BROWSER TIMEZONE VALIDATION:', {
    startTime: startDateTime.toISO(),
    endTime: endDateTime.toISO(),
    startJSDate: startJSDate.toISOString(),
    endJSDate: endJSDate.toISOString(),
    is24Hour: startHour === 0 && endHour === 23 && endMinute === 59,
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hourSpan: Math.abs(endJSDate.getTime() - startJSDate.getTime()) / (1000 * 60 * 60),
    spansMultipleDays: startJSDate.getDate() !== endJSDate.getDate(),
    message: startHour === 0 && endHour === 23 && endMinute === 59 ? 
      '✅ 24-HOUR DISPLAY CONFIGURED' : 
      '⚠️ LIMITED TIME RANGE'
  });
  
  return { start: startJSDate, end: endJSDate };
};