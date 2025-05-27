
import { TimeZoneService } from './timeZoneService';
import { DateTime } from 'luxon';

/**
 * Get the user's timezone from the browser
 * @returns A valid IANA timezone string
 */
export function getUserTimeZone(): string {
  try {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TimeZoneService.ensureIANATimeZone(browserTimezone);
  } catch {
    // Fallback to default timezone if browser API fails
    return TimeZoneService.DEFAULT_TIMEZONE;
  }
}

/**
 * Format timezone for display (e.g. "EDT" or "America/New_York")
 * @param timezone The timezone to format
 * @returns Formatted timezone string (typically abbreviation)
 */
export function formatTimeZoneDisplay(timezone: string): string {
  try {
    // Ensure we have a valid timezone
    const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
    
    // Get current time in the timezone
    const now = TimeZoneService.now(safeTimezone);
    
    // Return the timezone abbreviation if valid
    if (now.isValid) {
      return now.toFormat('ZZZZ'); // Returns the timezone abbreviation (e.g., EDT)
    }
    
    // Fallback to the timezone name itself
    return safeTimezone;
  } catch {
    // Return original or default if formatting fails
    return timezone || TimeZoneService.DEFAULT_TIMEZONE;
  }
}

/**
 * Convert a date and time string to a DateTime in a specific timezone
 * @param dateStr Date string in YYYY-MM-DD format
 * @param timeStr Time string in HH:MM format
 * @param timezone Target timezone
 * @returns DateTime object in the specified timezone
 */
export function convertToTimezone(dateStr: string, timeStr: string, timezone: string): DateTime {
  try {
    return TimeZoneService.createDateTime(dateStr, timeStr, timezone);
  } catch {
    // Return current time in the timezone if conversion fails
    return TimeZoneService.now(timezone);
  }
}

/**
 * Format a date with timezone (e.g. "Mar 12, 2023 at 3:30 PM EDT")
 * @param date Date to format
 * @param timezone Timezone to use for formatting
 * @param formatStr Optional format string
 * @returns Formatted date string with timezone
 */
export function formatWithTimeZone(date: Date, timezone: string, formatStr: string = 'MMM d, yyyy \'at\' h:mm a ZZZZ'): string {
  try {
    const dt = TimeZoneService.fromJSDate(date, timezone);
    return TimeZoneService.formatDateTime(dt, formatStr);
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

/**
 * Ensures a timezone string is a valid IANA timezone
 */
export function ensureIANATimeZone(timezone: string | null | undefined): string {
  return TimeZoneService.ensureIANATimeZone(timezone);
}

/**
 * Get a user-friendly display name for a timezone
 */
export function getTimeZoneDisplayName(timezone: string): string {
  return TimeZoneService.getTimeZoneDisplayName(timezone);
}
