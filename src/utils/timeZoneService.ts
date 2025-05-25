import { DateTime, IANAZone } from 'luxon';

export class TimeZoneService {
  public static readonly DEFAULT_TIMEZONE = 'America/Chicago';
  public static readonly TIME_FORMAT_24 = 'HH:mm';
  public static readonly TIME_FORMAT_AMPM = 'h:mm a';
  public static readonly DATE_FORMAT = 'yyyy-MM-dd';

  /**
   * Ensures that the given timezone is a valid IANA timezone.
   * If the timezone is null, undefined, or invalid, it returns the default timezone.
   * @param timezone The timezone string to validate.
   * @returns A valid IANA timezone string.
   */
  public static ensureIANATimeZone(timezone: string | string[] | null | undefined): string {
    // Handle array values - CRITICAL FIX for timezone conversion bug
    if (Array.isArray(timezone)) {
      console.warn('Timezone received as array, extracting first element:', timezone);
      timezone = timezone[0];
    }
    
    // Handle null, undefined, or empty string
    if (!timezone || (typeof timezone === 'string' && timezone.trim() === '')) {
      console.warn('No timezone provided, using default timezone:', this.DEFAULT_TIMEZONE);
      return this.DEFAULT_TIMEZONE;
    }

    // Handle object conversion issues - if timezone is somehow an object
    if (typeof timezone === 'object') {
      console.warn('Timezone is an object instead of a string:', timezone);
      try {
        // Try to extract a string representation
        const tzString = String(timezone);
        if (tzString && tzString.length > 0 && tzString !== '[object Object]') {
          return this.normalizeTimezoneString(tzString);
        }
      } catch (error) {
        console.error('Error converting timezone object to string:', error);
      }
      return this.DEFAULT_TIMEZONE;
    }

    return this.normalizeTimezoneString(String(timezone));
  }

  /**
   * Helper function to normalize timezone strings
   * @param timezoneStr The timezone string to normalize
   * @returns A normalized timezone string
   */
  public static normalizeTimezoneString(timezoneStr: string): string {
    // Normalize common timezone abbreviations
    if (timezoneStr === 'EST') return 'America/New_York';
    if (timezoneStr === 'CST') return 'America/Chicago';
    if (timezoneStr === 'MST') return 'America/Denver';
    if (timezoneStr === 'PST') return 'America/Los_Angeles';
    if (timezoneStr === 'EDT') return 'America/New_York';
    if (timezoneStr === 'CDT') return 'America/Chicago';
    if (timezoneStr === 'MDT') return 'America/Denver';
    if (timezoneStr === 'PDT') return 'America/Los_Angeles';
    
    try {
      // Validate using IANAZone
      if (!IANAZone.isValidZone(timezoneStr)) {
        console.warn(`Invalid timezone '${timezoneStr}', using default timezone: ${this.DEFAULT_TIMEZONE}`);
        return this.DEFAULT_TIMEZONE;
      }
      
      // Additional validation by trying to use the timezone
      const testDate = DateTime.now().setZone(timezoneStr);
      if (!testDate.isValid) {
        console.warn(`Timezone '${timezoneStr}' failed validation: ${testDate.invalidReason}`);
        return this.DEFAULT_TIMEZONE;
      }
      
      return timezoneStr;
    } catch (error) {
      console.error(`Error validating timezone '${timezoneStr}':`, error);
      return this.DEFAULT_TIMEZONE;
    }
  }

  /**
   * Returns the current DateTime in the specified timezone.
   * @param timezone The timezone to use.
   * @returns The current DateTime in the specified timezone.
   */
  public static now(timezone: string = this.DEFAULT_TIMEZONE): DateTime {
    const safeTimezone = this.ensureIANATimeZone(timezone);
    return DateTime.now().setZone(safeTimezone);
  }

  /**
   * Returns today's date (without time) in the specified timezone.
   * @param timezone The timezone to use.
   * @returns Today's date in the specified timezone.
   */
  public static today(timezone: string = this.DEFAULT_TIMEZONE): DateTime {
    const safeTimezone = this.ensureIANATimeZone(timezone);
    return DateTime.now().setZone(safeTimezone).startOf('day');
  }

  /**
   * Creates a DateTime object from a JavaScript Date object in the specified timezone.
   * @param date The JavaScript Date object.
   * @param timezone The timezone to use.
   * @returns A DateTime object representing the same point in time as the Date object, but in the specified timezone.
   */
  public static fromJSDate(date: Date, timezone: string = this.DEFAULT_TIMEZONE): DateTime {
    const safeTimezone = this.ensureIANATimeZone(timezone);
    return DateTime.fromJSDate(date, { zone: safeTimezone });
  }

  /**
   * Creates a DateTime object from a date string in the specified timezone.
   * @param dateString The date string in 'yyyy-MM-dd' format.
   * @param timezone The timezone to use.
   * @returns A DateTime object representing the date in the specified timezone.
   */
  public static fromDateString(dateString: string, timezone: string = this.DEFAULT_TIMEZONE): DateTime {
    const safeTimezone = this.ensureIANATimeZone(timezone);
    return DateTime.fromFormat(dateString, this.DATE_FORMAT, { zone: safeTimezone });
  }

  /**
   * Creates a DateTime object from a time string in the specified timezone, using today's date.
   * @param timeString The time string in 'HH:mm' format.
   * @param timezone The timezone to use.
   * @returns A DateTime object representing the time on today's date in the specified timezone.
   */
  public static fromTimeString(timeString: string, timezone: string = this.DEFAULT_TIMEZONE): DateTime {
    const safeTimezone = this.ensureIANATimeZone(timezone);
    const now = DateTime.now().setZone(safeTimezone);
    const [hours, minutes] = timeString.split(':').map(Number);
    return now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  }

  /**
   * Creates a DateTime object from a date string and a time string in the specified timezone.
   * @param dateString The date string in 'yyyy-MM-dd' format.
   * @param timeString The time string in 'HH:mm' format.
   * @param timezone The timezone to use.
   * @returns A DateTime object representing the date and time in the specified timezone.
   */
  public static createDateTime(dateString: string, timeString: string, timezone: string = this.DEFAULT_TIMEZONE): DateTime {
    const safeTimezone = this.ensureIANATimeZone(timezone);
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);

    return DateTime.fromObject({
      year: year,
      month: month,
      day: day,
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0
    }, { zone: safeTimezone });
  }

  /**
   * Formats a DateTime object to a date string in 'yyyy-MM-dd' format.
   * @param dateTime The DateTime object to format.
   * @returns A string representing the date in 'yyyy-MM-dd' format.
   */
  public static formatDate(dateTime: DateTime, format: string = this.DATE_FORMAT): string {
    return dateTime.toFormat(format);
  }

  /**
   * Formats a DateTime object to a time string in 'h:mm a' format.
   * @param dateTime The DateTime object to format.
   * @returns A string representing the time in 'h:mm a' format.
   */
  public static formatTime(dateTime: DateTime, format: string = this.TIME_FORMAT_AMPM): string {
    return dateTime.toFormat(format);
  }

  /**
   * Formats a DateTime object to a time string in 'HH:mm' (24-hour) format.
   * @param dateTime The DateTime object to format.
   * @returns A string representing the time in 'HH:mm' format.
   */
  public static formatTime24(dateTime: DateTime, format: string = this.TIME_FORMAT_24): string {
    return dateTime.toFormat(format);
  }

  /**
   * Formats a DateTime object to a combined date and time string.
   * @param dateTime The DateTime object to format.
   * @param format The format string to use.
   * @returns A string representing the date and time in the specified format.
   */
  public static formatDateTime(dateTime: DateTime, format: string): string {
    return dateTime.toFormat(format);
  }

  /**
   * Gets the start of the month for a given DateTime.
   * @param dateTime The DateTime object.
   * @returns A DateTime object representing the start of the month.
   */
  public static startOfMonth(dateTime: DateTime): DateTime {
    return dateTime.startOf('month');
  }

  /**
   * Gets the end of the month for a given DateTime.
   * @param dateTime The DateTime object.
   * @returns A DateTime object representing the end of the month.
   */
  public static endOfMonth(dateTime: DateTime): DateTime {
    return dateTime.endOf('month');
  }

  /**
   * Gets the start of the week for a given DateTime.
   * @param dateTime The DateTime object.
   * @returns A DateTime object representing the start of the week (Sunday).
   */
  public static startOfWeek(dateTime: DateTime): DateTime {
    return dateTime.startOf('week');
  }

  /**
   * Gets the end of the week for a given DateTime.
   * @param dateTime The DateTime object.
   * @returns A DateTime object representing the end of the week (Saturday).
   */
  public static endOfWeek(dateTime: DateTime): DateTime {
    return dateTime.endOf('week');
  }

  /**
   * Generates an array of DateTime objects for each day within a given interval.
   * @param start The start DateTime.
   * @param end The end DateTime.
   * @returns An array of DateTime objects, one for each day in the interval.
   */
  public static eachDayOfInterval(start: DateTime, end: DateTime): DateTime[] {
    let current = start;
    const days: DateTime[] = [];

    while (current <= end) {
      days.push(current);
      current = current.plus({ days: 1 });
    }

    return days;
  }

  /**
   * Checks if two DateTime objects represent the same day, regardless of the time.
   * @param date1 The first DateTime object.
   * @param date2 The second DateTime object.
   * @returns True if both DateTime objects are on the same day, false otherwise.
   */
  public static isSameDay(date1: DateTime, date2: DateTime): boolean {
    return date1.hasSame(date2, 'day');
  }

  /**
   * Export a method that converts UTC ISO string to a DateTime object in the user's timezone
   */
  public static fromUTC(utcString: string, timezone: string): DateTime {
    try {
      // Ensure we're working with a valid timezone
      const safeTimezone = this.ensureIANATimeZone(timezone);

      // Validate the UTC string format
      if (!utcString || typeof utcString !== 'string') {
        console.error('Invalid UTC string provided:', utcString);
        return DateTime.now().setZone('UTC'); // Return current time in UTC as fallback
      }

      // Parse the ISO string as UTC, then convert to the target timezone
      const dt = DateTime.fromISO(utcString, { zone: 'UTC' }).setZone(safeTimezone);

      if (!dt.isValid) {
        console.error('Invalid DateTime from UTC conversion:', dt.invalidReason, dt.invalidExplanation);
        // Return current time in the target timezone as fallback instead of throwing
        return DateTime.now().setZone(safeTimezone);
      }

      return dt;
    } catch (error) {
      console.error('Error in fromUTC conversion:', error);
      // Provide a graceful fallback instead of crashing
      return DateTime.now().setZone(this.DEFAULT_TIMEZONE);
    }
  }

  // Alias for convertUTCToLocal to maintain backward compatibility
  public static convertUTCToLocal = TimeZoneService.fromUTC;

  /**
   * Converts a local date and time to UTC with DST transition validation
   * @param localDateTimeStr The local date and time string in 'yyyy-MM-ddTHH:mm' format
   * @param timezone The timezone of the local date and time
   * @returns A DateTime object representing the time in UTC
   */
  /**
   * Converts a local date and time to UTC with DST transition validation
   * Enhanced with better error handling and fallbacks
   * @param localDateTimeStr The local date and time string in 'yyyy-MM-ddTHH:mm' format
   * @param timezone The timezone of the local date and time
   * @returns A DateTime object representing the time in UTC
   */
  public static convertLocalToUTC(localDateTimeStr: string, timezone: string): DateTime {
    try {
      const safeTimezone = this.ensureIANATimeZone(timezone);
      
      // Validate input format (YYYY-MM-DDTHH:MM format)
      if (!localDateTimeStr || typeof localDateTimeStr !== 'string') {
        console.error('Invalid or missing date-time string:', localDateTimeStr);
        return DateTime.now().toUTC(); // Return current UTC time as fallback
      }
      
      // More flexible format validation
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(localDateTimeStr)) {
        console.error('Invalid date-time format:', localDateTimeStr);
        // Try to parse it anyway, but if that fails, return current time
        const attemptParse = DateTime.fromISO(localDateTimeStr, { zone: safeTimezone });
        if (!attemptParse.isValid) {
          return DateTime.now().toUTC();
        }
        return attemptParse.toUTC();
      }
      
      // Parse the local date time string in the specified timezone
      const localDateTime = DateTime.fromISO(localDateTimeStr, { zone: safeTimezone });
      
      // Basic validation
      if (!localDateTime.isValid) {
        console.error('Invalid DateTime during conversion:', localDateTimeStr, safeTimezone);
        return DateTime.now().toUTC(); // Return current UTC time as fallback
      }
      
      // Check for DST transitions in a safer way that's compatible with Luxon
      const offset = localDateTime.offset;
      const oneHourBefore = localDateTime.minus({ hours: 1 });
      const oneHourAfter = localDateTime.plus({ hours: 1 });
      
      // If the offset changes within this time window, we're near a DST transition
      if (offset !== oneHourBefore.offset || offset !== oneHourAfter.offset) {
        console.warn('DateTime may be in DST transition period:', localDateTime.toISO(), safeTimezone);
        // We can log but still proceed with the conversion
      }
      
      // Ensure the parsed date is in the expected timezone
      if (localDateTime.zoneName !== safeTimezone) {
        console.warn('Parsed DateTime zone mismatch:', localDateTime.zoneName, '≠', safeTimezone);
      }
      
      // Convert to UTC
      const utcDateTime = localDateTime.toUTC();
      
      // Add additional validation for the conversion result
      if (!utcDateTime.isValid) {
        console.error('UTC conversion failed:', localDateTime.toISO(), '→', utcDateTime.invalidReason);
        return DateTime.now().toUTC(); // Return current UTC time as fallback
      }
      
      return utcDateTime;
    } catch (error) {
      console.error('Error in convertLocalToUTC:', error);
      // Provide a graceful fallback
      return DateTime.now().toUTC();
    }
  }
  
  /**
   * Adds a specified number of days to a DateTime object
   * @param dateTime The DateTime object to add days to
   * @param days The number of days to add
   * @returns A new DateTime object with the added days
   */
  public static addDays(dateTime: DateTime, days: number): DateTime {
    return dateTime.plus({ days });
  }
  
  /**
   * Adds a specified number of months to a DateTime object
   * @param dateTime The DateTime object to add months to
   * @param months The number of months to add
   * @returns A new DateTime object with the added months
   */
  public static addMonths(dateTime: DateTime, months: number): DateTime {
    return dateTime.plus({ months });
  }
  
  /**
   * Formats a UTC timestamp string in the specified timezone
   * @param utcString The UTC timestamp string in ISO format
   * @param timezone The timezone to format the timestamp in
   * @param format The format to use for formatting
   * @returns A formatted string representing the time in the specified timezone
   */
  public static formatUTCInTimezone(utcString: string, timezone: string, format: string = 'h:mm a'): string {
    try {
      const localDateTime = this.fromUTC(utcString, timezone);
      return localDateTime.toFormat(format);
    } catch (error) {
      console.error('Error formatting UTC in timezone:', error);
      return 'Invalid time';
    }
  }
  
  /**
   * Gets a user-friendly display name for a timezone
   * @param timezone The IANA timezone string
   * @returns A user-friendly display name for the timezone
   */
  public static getTimeZoneDisplayName(timezone: string): string {
    const safeTimezone = this.ensureIANATimeZone(timezone);
    try {
      const now = DateTime.now().setZone(safeTimezone);
      const offsetFormatted = now.toFormat('ZZ');
      const zoneName = safeTimezone.split('/').pop()?.replace('_', ' ') || safeTimezone;
      return `${zoneName} (${offsetFormatted})`;
    } catch (error) {
      console.error('Error getting timezone display name:', error);
      return safeTimezone;
    }
  }
}
