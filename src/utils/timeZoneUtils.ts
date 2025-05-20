
import { TimeZoneService } from './timeZoneService';

/**
 * Get the user's timezone from the browser
 */
export function getUserTimeZone(): string {
  try {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TimeZoneService.ensureIANATimeZone(browserTimezone);
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return TimeZoneService.DEFAULT_TIMEZONE;
  }
}

/**
 * Format timezone for display (e.g. "EDT" or "America/New_York")
 */
export function formatTimeZoneDisplay(timezone: string): string {
  try {
    const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
    
    const now = TimeZoneService.now(safeTimezone);
    if (!now.isValid) {
      console.error('Invalid DateTime for timezone display', now.invalidReason, now.invalidExplanation);
      return safeTimezone;
    }
    return now.toFormat('ZZZZ'); // Returns the timezone abbreviation (e.g., EDT)
  } catch (error) {
    console.error('Error formatting timezone display:', error);
    return timezone || TimeZoneService.DEFAULT_TIMEZONE;
  }
}

/**
 * Convert a date and time string to a specific timezone
 */
export function convertToTimezone(dateStr: string, timeStr: string, timezone: string) {
  try {
    return TimeZoneService.createDateTime(dateStr, timeStr, timezone);
  } catch (error) {
    console.error('Error converting to timezone:', error);
    return TimeZoneService.now(timezone);
  }
}

/**
 * Format a date with timezone (e.g. "Mar 12, 2023 at 3:30 PM EDT")
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
