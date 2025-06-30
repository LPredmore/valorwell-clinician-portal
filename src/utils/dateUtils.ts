
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
      // Last resort - use JS Date constructor
      () => {
        const jsDate = new Date(dateOfBirth);
        return DateTime.fromJSDate(jsDate);
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

  // Calculate age in years
  const now = DateTime.now();
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
    // Last resort: use regular JS Date constructor
    const dateObj = new Date(dateString);
    if (!isNaN(dateObj.getTime())) {
      console.log(`Successfully parsed date ${dateString} with Date constructor:`, dateObj);
      return dateObj;
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
          dateTime = DateTime.fromJSDate(jsDate);
        }
      }
    } catch (e) {
      console.error(`[formatDateForDB] Error parsing date string: "${date}"`, e);
      return null;
    }
  } else if (date instanceof Date) {
    dateTime = DateTime.fromJSDate(date);
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
 * Convert a Luxon DateTime (in any zone) into a JS Date whose
 * fields (Y/M/D h:m:s) match the DateTime values, ignoring timezone.
 * This ensures React Big Calendar displays times correctly in the clinician's timezone.
 */
export function buildLocalDate(dt: DateTime): Date {
  return new Date(
    dt.year,
    dt.month - 1,
    dt.day,
    dt.hour,
    dt.minute,
    dt.second,
    dt.millisecond
  );
}
