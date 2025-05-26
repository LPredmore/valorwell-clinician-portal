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
  public static ensureIANATimeZone(timezone: string | null | undefined): string {
    if (!timezone) {
      console.warn('No timezone provided, using default timezone:', this.DEFAULT_TIMEZONE);
      return this.DEFAULT_TIMEZONE;
    }

    try {
      if (!IANAZone.isValidZone(timezone)) {
        console.warn(`Invalid timezone '${timezone}' provided, using default timezone: ${this.DEFAULT_TIMEZONE}`);
        return this.DEFAULT_TIMEZONE;
      }
      DateTime.now().setZone(timezone); // Try using the timezone to verify it
      return timezone;
    } catch (error) {
      console.error(`Error validating timezone '${timezone}', using default timezone:`, error);
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
    // Ensure we're working with a valid timezone
    const safeTimezone = this.ensureIANATimeZone(timezone);

    // Parse the ISO string as UTC, then convert to the target timezone
    const dt = DateTime.fromISO(utcString, { zone: 'UTC' }).setZone(safeTimezone);

    if (!dt.isValid) {
      console.error('Invalid DateTime from UTC conversion:', dt.invalidReason, dt.invalidExplanation);
      throw new Error(`Failed to convert UTC time: ${dt.invalidReason}`);
    }

    return dt;
  }

  // Alias for convertUTCToLocal to maintain backward compatibility
  public static convertUTCToLocal = TimeZoneService.fromUTC;

  /**
   * Converts a local date and time to UTC with DST transition validation
   * @param localDateTimeStr The local date and time string in 'yyyy-MM-ddTHH:mm' format
   * @param timezone The timezone of the local date and time
   * @returns A DateTime object representing the time in UTC
   */
  public static convertLocalToUTC(localDateTimeStr: string, timezone: string): DateTime {
    const safeTimezone = this.ensureIANATimeZone(timezone);
    
    // Validate input format (YYYY-MM-DDTHH:MM format)
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(localDateTimeStr)) {
      console.error('Invalid date-time format:', localDateTimeStr);
      throw new Error(`Invalid date-time format: ${localDateTimeStr}. Expected format: "YYYY-MM-DDTHH:MM"`);
    }
    
    // Parse the local date time string in the specified timezone
    const localDateTime = DateTime.fromISO(localDateTimeStr, { zone: safeTimezone });
    
    // Basic validation
    if (!localDateTime.isValid) {
      console.error('Invalid DateTime during conversion:', localDateTimeStr, safeTimezone);
      throw new Error(`Invalid date-time during conversion: ${localDateTime.invalidReason}`);
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
      throw new Error(`UTC conversion failed: ${utcDateTime.invalidReason}`);
    }
    
    return utcDateTime;
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
