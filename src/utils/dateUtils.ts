
import { DateTime } from 'luxon';

/**
 * Calculates age in years from a date of birth using Luxon.
 * Handles string (ISO or other parsable formats) or Date object inputs.
 * @param dateOfBirth - The date of birth, can be a Date object, an ISO string, 
 * another date string parsable by Luxon, or null/undefined.
 * @returns number representing age in years, or null if input is invalid or not provided.
 */
/**
 * Calculates age in years from a date of birth
 * Handles multiple date formats and performs robust parsing
 * @param dateOfBirth Date of birth as Date object or string
 * @returns Age in years, or null if input is invalid
 */
export const calculateAge = (dateOfBirth: Date | string | null | undefined): number | null => {
  // Return null for empty inputs
  if (!dateOfBirth) {
    return null;
  }

  let dobDateTime: DateTime | null = null;

  // Parse string dates with multiple format attempts
  if (typeof dateOfBirth === 'string') {
    // Try different formats in order of preference
    const formats = [
      // Try parsing as ISO format
      () => DateTime.fromISO(dateOfBirth),
      // Try SQL date format
      () => DateTime.fromSQL(dateOfBirth),
      // Try standard date format
      () => DateTime.fromFormat(dateOfBirth, 'yyyy-MM-dd'),
      // Last resort - use JS Date constructor but convert to UTC
      () => {
        const jsDate = new Date(dateOfBirth);
        return DateTime.fromJSDate(jsDate).toUTC();
      }
    ];

    // Try each format until one works
    for (const formatFn of formats) {
      try {
        dobDateTime = formatFn();
        if (dobDateTime.isValid) {
          break;
        }
      } catch (e) {
        // Continue to next format
      }
    }
  } else if (dateOfBirth instanceof Date) {
    // Convert JS Date to Luxon DateTime
    dobDateTime = DateTime.fromJSDate(dateOfBirth);
  }

  // Return null if we couldn't parse the date
  if (!dobDateTime || !dobDateTime.isValid) {
    return null;
  }

  // Calculate age in years using UTC to eliminate browser timezone dependency
  const now = DateTime.utc();
  const age = now.diff(dobDateTime, 'years').years;
  
  // Return whole years (floor to handle partial years)
  return Math.floor(age);
};

/**
 * Helper function to parse date strings into Date objects
 * @param dateString - The date string to parse
 * @returns Date object if successful, null otherwise
 */
export const parseDateString = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    // Try parsing as Luxon DateTime first
    const luxonDate = DateTime.fromISO(dateString);
    if (luxonDate.isValid) {
      console.log(`Successfully parsed date ${dateString} as ISO format:`, luxonDate.toJSDate());
      return luxonDate.toJSDate();
    }
  } catch (e) {
    console.error(`Error parsing ${dateString} as ISO:`, e);
  }
  
  try {
    // Try SQL format (YYYY-MM-DD)
    const luxonDate = DateTime.fromSQL(dateString);
    if (luxonDate.isValid) {
      console.log(`Successfully parsed date ${dateString} as SQL format:`, luxonDate.toJSDate());
      return luxonDate.toJSDate();
    }
  } catch (e) {
    console.error(`Error parsing ${dateString} as SQL:`, e);
  }
  
  try {
    // Last resort: use regular JS Date constructor but return UTC
    const dateObj = new Date(dateString);
    if (!isNaN(dateObj.getTime())) {
      // Convert to UTC to eliminate browser timezone effects
      const utcDate = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
      console.log(`Successfully parsed date ${dateString} with Date constructor (UTC):`, utcDate);
      return utcDate;
    }
  } catch (e) {
    console.error(`Error parsing ${dateString} with Date constructor:`, e);
  }
  
  console.warn(`Could not parse date string: ${dateString}`);
  return null;
};

/**
 * Format a date for database storage (YYYY-MM-DD)
 * @param date - Date object or string to format
 * @returns Formatted date string for database or null if invalid
 */
export const formatDateForDB = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  
  let dateTime: DateTime | null = null;
  
  // Convert to Luxon DateTime based on input type
  if (typeof date === 'string') {
    try {
      dateTime = DateTime.fromISO(date);
      
      if (!dateTime.isValid) {
        dateTime = DateTime.fromSQL(date);
      }
      
      if (!dateTime.isValid) {
        const jsDate = new Date(date);
        if (!isNaN(jsDate.getTime())) {
          // Convert to UTC to eliminate browser timezone effects
          dateTime = DateTime.fromJSDate(jsDate).toUTC();
        }
      }
    } catch (e) {
      console.error(`[formatDateForDB] Error parsing date string: "${date}"`, e);
      return null;
    }
  } else if (date instanceof Date) {
    // Convert to UTC to eliminate browser timezone effects
    dateTime = DateTime.fromJSDate(date).toUTC();
  }
  
  // If we couldn't parse the date, return null
  if (!dateTime || !dateTime.isValid) {
    console.warn(`[formatDateForDB] Invalid date: ${date}`);
    return null;
  }
  
  // Format as YYYY-MM-DD for database storage
  const formattedDate = dateTime.toFormat('yyyy-MM-dd');
  console.log(`[formatDateForDB] Formatted date: ${formattedDate}`);
  return formattedDate;
};

/**
 * CRITICAL: Single conversion path for all React Big Calendar events
 * Parse any ISO (with or without offset) as UTC if offset present, else in zone; then toJSDate
 * This REPLACES all previous conversion methods and eliminates double-conversion issues.
 */
export function toEventDate(iso: string, zone: string): Date {
  // Parse either UTC ISO (with Z/offset) or local ISO (no offset) in specified zone
  const dt = iso.includes('Z') || iso.includes('+') || iso.includes('-') 
    ? DateTime.fromISO(iso).setZone(zone)  // UTC ISO → convert to zone
    : DateTime.fromISO(iso, { zone });     // Local ISO → parse in zone
  
  if (dt.isValid) {
    console.log('[toEventDate] CRITICAL: Single conversion path:', {
      input: iso,
      zone,
      parsedDateTime: dt.toISO()
    });
  } else {
    console.warn('[toEventDate] Invalid date created:', { input: iso, zone });
  }
  
  return dt.toJSDate();  // Absolute instant for React Big Calendar
}
