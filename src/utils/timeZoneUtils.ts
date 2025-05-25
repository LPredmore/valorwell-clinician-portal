
/**
 * TimeZoneUtils provides a standardized interface for all timezone operations
 * in the application. All components should use these functions instead of
 * directly using TimeZoneService or Luxon to ensure consistent timezone handling.
 *
 * This module has been refactored to improve timezone handling reliability and
 * prevent timezone-related errors that were causing calendar display issues.
 */

import { DateTime } from 'luxon';
import { TimeZoneService } from './timeZoneService';
import { Appointment } from '@/types/appointment';
import { CalendarDebugUtils } from './calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'TimeZoneUtils';

/**
 * Get the user's timezone from the browser
 * @returns A valid IANA timezone string
 */
export function getUserTimeZone(): string {
  try {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ensureIANATimeZone(browserTimezone);
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return TimeZoneService.DEFAULT_TIMEZONE;
  }
}

/**
 * Format timezone for display (e.g. "EDT" or "America/New_York")
 * @param timezone The timezone to format
 * @returns A formatted timezone string
 */
export function formatTimeZoneDisplay(timezone: string): string {
  try {
    const safeTimezone = ensureIANATimeZone(timezone);
    
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
 * @param dateStr The date string in 'yyyy-MM-dd' format
 * @param timeStr The time string in 'HH:mm' format
 * @param timezone The timezone to convert to
 * @returns A DateTime object in the specified timezone
 */
export function convertToTimezone(dateStr: string, timeStr: string, timezone: string) {
  try {
    const safeTimezone = ensureIANATimeZone(timezone);
    return TimeZoneService.createDateTime(dateStr, timeStr, safeTimezone);
  } catch (error) {
    console.error('Error converting to timezone:', error);
    return TimeZoneService.now(ensureIANATimeZone(timezone));
  }
}

/**
 * Format a date with timezone (e.g. "Mar 12, 2023 at 3:30 PM EDT")
 * @param date The date to format
 * @param timezone The timezone to use for formatting
 * @param formatStr The format string to use
 * @returns A formatted date string
 */
export function formatWithTimeZone(date: Date, timezone: string, formatStr: string = 'MMM d, yyyy \'at\' h:mm a ZZZZ'): string {
  try {
    const safeTimezone = ensureIANATimeZone(timezone);
    const dt = TimeZoneService.fromJSDate(date, safeTimezone);
    return TimeZoneService.formatDateTime(dt, formatStr);
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

/**
 * Ensures a timezone string is a valid IANA timezone
 * @param timezone The timezone string to validate
 * @returns A valid IANA timezone string
 */
/**
 * Ensures a timezone string is a valid IANA timezone
 * Enhanced to handle more edge cases and provide better error reporting
 * @param timezone The timezone string to validate
 * @returns A valid IANA timezone string
 */
/**
 * Ensures a timezone string is a valid IANA timezone
 * Enhanced with better validation, error handling, and normalization
 * @param timezone The timezone string to validate
 * @returns A valid IANA timezone string
 */
export function ensureIANATimeZone(timezone: string | string[] | null | undefined): string {
  // Delegate to the improved TimeZoneService implementation
  return TimeZoneService.ensureIANATimeZone(timezone);
}

/**
 * Helper function to normalize timezone strings
 * @param timezoneStr The timezone string to normalize
 * @returns A normalized timezone string
 * @deprecated Use TimeZoneService.normalizeTimezoneString instead
 */
function normalizeTimezoneString(timezoneStr: string): string {
  // This function is kept for backward compatibility
  // but delegates to TimeZoneService for consistent behavior
  return TimeZoneService.ensureIANATimeZone(timezoneStr);
}

/**
 * Get a user-friendly display name for a timezone
 * @param timezone The timezone to get a display name for
 * @returns A user-friendly display name
 */
export function getTimeZoneDisplayName(timezone: string): string {
  const safeTimezone = ensureIANATimeZone(timezone);
  return TimeZoneService.getTimeZoneDisplayName(safeTimezone);
}

/**
 * Convert a UTC ISO string to a DateTime object in the specified timezone
 * @param utcString The UTC ISO string to convert
 * @param timezone The timezone to convert to
 * @returns A DateTime object in the specified timezone
 */
/**
 * Convert a UTC ISO string to a DateTime object in the specified timezone
 * Enhanced with better error handling and fallbacks
 * @param utcString The UTC ISO string to convert
 * @param timezone The timezone to convert to
 * @returns A DateTime object in the specified timezone
 */
export function fromUTC(utcString: string, timezone: string): DateTime {
  try {
    const safeTimezone = ensureIANATimeZone(timezone);
    
    // Validate the UTC string
    if (!utcString || typeof utcString !== 'string') {
      console.error('Invalid UTC string provided to fromUTC:', utcString);
      return TimeZoneService.now(safeTimezone); // Return current time as fallback
    }
    
    // Use the improved TimeZoneService.fromUTC which now handles errors gracefully
    return TimeZoneService.fromUTC(utcString, safeTimezone);
  } catch (error) {
    console.error('Error in timeZoneUtils.fromUTC:', error);
    // Provide a graceful fallback
    return TimeZoneService.now(ensureIANATimeZone(timezone));
  }
}

/**
 * Convert a DateTime object to a UTC ISO string
 * @param dateTime The DateTime object to convert
 * @returns A UTC ISO string
 */
export function toUTC(dateTime: DateTime): string {
  return dateTime.toUTC().toISO();
}

/**
 * Convert a local date and time to UTC
 * @param localDateTimeStr The local date and time string in 'yyyy-MM-ddTHH:mm' format
 * @param timezone The timezone of the local date and time
 * @returns A DateTime object in UTC
 */
/**
 * Convert a local date and time to UTC
 * Enhanced with better error handling and fallbacks
 * @param localDateTimeStr The local date and time string in 'yyyy-MM-ddTHH:mm' format
 * @param timezone The timezone of the local date and time
 * @returns A DateTime object in UTC
 */
export function convertLocalToUTC(localDateTimeStr: string, timezone: string): DateTime {
  try {
    const safeTimezone = ensureIANATimeZone(timezone);
    
    // Validate the local date time string
    if (!localDateTimeStr || typeof localDateTimeStr !== 'string') {
      console.error('Invalid local date time string provided to convertLocalToUTC:', localDateTimeStr);
      return TimeZoneService.now('UTC'); // Return current time in UTC as fallback
    }
    
    // Use the improved TimeZoneService.convertLocalToUTC which now handles errors gracefully
    return TimeZoneService.convertLocalToUTC(localDateTimeStr, safeTimezone);
  } catch (error) {
    console.error('Error in timeZoneUtils.convertLocalToUTC:', error);
    // Provide a graceful fallback
    return TimeZoneService.now('UTC');
  }
}

/**
 * Create a DateTime object from a JavaScript Date object in the specified timezone
 * @param date The JavaScript Date object
 * @param timezone The timezone to use
 * @returns A DateTime object in the specified timezone
 */
export function fromJSDate(date: Date, timezone: string): DateTime {
  const safeTimezone = ensureIANATimeZone(timezone);
  return TimeZoneService.fromJSDate(date, safeTimezone);
}

/**
 * Create a DateTime object from an ISO string in the specified timezone
 * @param isoString The ISO string to parse
 * @param timezone The timezone to use
 * @returns A DateTime object in the specified timezone
 */
export function fromISO(isoString: string, timezone: string): DateTime {
  const safeTimezone = ensureIANATimeZone(timezone);
  return DateTime.fromISO(isoString, { zone: safeTimezone });
}

/**
 * Get the current DateTime in the specified timezone
 * @param timezone The timezone to use
 * @returns A DateTime object representing the current time in the specified timezone
 */
export function now(timezone: string): DateTime {
  const safeTimezone = ensureIANATimeZone(timezone);
  return TimeZoneService.now(safeTimezone);
}

/**
 * Format a DateTime object to a date string
 * @param dateTime The DateTime object to format
 * @param format The format string to use
 * @returns A formatted date string
 */
export function formatDate(dateTime: DateTime, format: string = TimeZoneService.DATE_FORMAT): string {
  return TimeZoneService.formatDate(dateTime, format);
}

/**
 * Format a DateTime object to a time string
 * @param dateTime The DateTime object to format
 * @param format The format string to use
 * @returns A formatted time string
 */
export function formatTime(dateTime: DateTime, format: string = TimeZoneService.TIME_FORMAT_AMPM): string {
  return TimeZoneService.formatTime(dateTime, format);
}

/**
 * Format a DateTime object to a combined date and time string
 * @param dateTime The DateTime object to format
 * @param format The format string to use
 * @returns A formatted date and time string
 */
export function formatDateTime(dateTime: DateTime, format: string): string {
  return TimeZoneService.formatDateTime(dateTime, format);
}

/**
 * Validate if a string is a valid timezone string
 * @param timezone The timezone string to validate
 * @returns True if the timezone is valid, false otherwise
 */
export function isValidTimeZone(timezone: string | string[] | null | undefined): boolean {
  if (!timezone) return false;
  
  // Handle array case
  if (Array.isArray(timezone)) {
    if (timezone.length === 0) return false;
    timezone = timezone[0];
  }
  
  try {
    const result = TimeZoneService.ensureIANATimeZone(timezone);
    return typeof timezone === 'string' && result === timezone;
  } catch (error) {
    return false;
  }
}

/**
 * Safely serialize a timezone string to ensure it's always a string
 * This helps prevent issues with timezone objects vs. strings
 * @param timezone The timezone to serialize
 * @returns A string representation of the timezone
 */
export function serializeTimeZone(timezone: any): string {
  if (!timezone) return TimeZoneService.DEFAULT_TIMEZONE;
  
  // Handle array case explicitly
  if (Array.isArray(timezone)) {
    console.warn('Timezone was an array, extracting first element:', timezone);
    if (timezone.length > 0) {
      return ensureIANATimeZone(timezone[0]);
    }
    return TimeZoneService.DEFAULT_TIMEZONE;
  }
  
  if (typeof timezone === 'string') {
    return ensureIANATimeZone(timezone);
  }
  
  if (typeof timezone === 'object') {
    console.warn('Timezone was an object instead of a string:', timezone);
    // Try to extract a string representation
    if (timezone.toString && typeof timezone.toString === 'function') {
      const tzString = timezone.toString();
      if (typeof tzString === 'string' && tzString.length > 0) {
        return ensureIANATimeZone(tzString);
      }
    }
  }
  
  console.error('Could not serialize timezone:', timezone);
  return TimeZoneService.DEFAULT_TIMEZONE;
}

/**
 * Safely clone objects without losing string types or timezone information
 * This is a replacement for JSON.parse(JSON.stringify()) which can corrupt timezone strings
 * @param obj The object to clone
 * @returns A deep clone of the object with preserved string types
 */
/**
 * Safely clone objects without losing string types or timezone information
 * Enhanced to better handle timezone strings and prevent object conversion issues
 * This is a replacement for JSON.parse(JSON.stringify()) which can corrupt timezone strings
 * @param obj The object to clone
 * @returns A deep clone of the object with preserved string types
 */
export function safeClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(safeClone) as unknown as T;
  }
  
  // Handle DateTime objects from Luxon (convert to ISO string)
  if (obj && typeof obj === 'object' && 'toISO' in obj && typeof obj.toISO === 'function') {
    try {
      return obj.toISO() as unknown as T;
    } catch (error) {
      console.error('Error converting DateTime to ISO string:', error);
      return obj;
    }
  }
  
  
  // Handle objects
  const cloned: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as Record<string, any>)[key];
      
      // Enhanced handling for timezone strings and related fields
      if ((
        key === 'timezone' ||
        key.includes('timezone') ||
        key.includes('time_zone') ||
        key.includes('tz')
      ) && value !== null) {
        if (typeof value === 'string') {
          // Ensure it's a primitive string and a valid timezone
          cloned[key] = String(ensureIANATimeZone(value));
        } else if (typeof value === 'object') {
          // Try to convert object timezones to strings
          try {
            const tzString = String(value);
            cloned[key] = ensureIANATimeZone(tzString);
          } catch (error) {
            console.error('Error converting timezone object to string:', error);
            cloned[key] = TimeZoneService.DEFAULT_TIMEZONE;
          }
        } else {
          // For any other type, use the default timezone
          cloned[key] = TimeZoneService.DEFAULT_TIMEZONE;
        }
      } else {
        // Normal deep cloning for other properties
        cloned[key] = safeClone(value);
      }
    }
  }
  
  return cloned as T;
}
