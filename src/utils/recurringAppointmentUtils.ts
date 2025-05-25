import { DateTime } from 'luxon';
import { RecurringPattern, RecurringException, Appointment } from '@/types/appointment';
import { TimeZoneService } from './timeZoneService';

/**
 * Generate dates for a recurring appointment pattern
 * @param startDate The first date of the recurring series
 * @param pattern The recurring pattern
 * @param maxOccurrences Maximum number of occurrences to generate (default: 52)
 * @returns Array of DateTime objects representing the recurring dates
 */
export function generateRecurringDates(
  startDate: DateTime,
  pattern: RecurringPattern,
  maxOccurrences: number = 52
): DateTime[] {
  // Use the pattern's timezone or default to UTC
  const timezone = pattern.timezone || 'UTC';
  
  // Ensure startDate is in the correct timezone
  const start = startDate.setZone(timezone);
  
  // Initialize result array with the start date
  const dates: DateTime[] = [start];
  
  // Calculate end date if provided
  const endDate = pattern.endDate ? DateTime.fromISO(pattern.endDate, { zone: timezone }) : null;
  
  // Determine how many occurrences to generate
  const occurrencesToGenerate = pattern.endAfterOccurrences 
    ? Math.min(pattern.endAfterOccurrences - 1, maxOccurrences - 1)
    : maxOccurrences - 1;
  
  // Generate the recurring dates
  let currentDate = start;
  let count = 0;
  
  while (count < occurrencesToGenerate) {
    let nextDate: DateTime;
    
    // Calculate next date based on frequency and interval
    switch (pattern.frequency) {
      case 'daily':
        nextDate = currentDate.plus({ days: pattern.interval });
        break;
        
      case 'weekly':
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // For weekly recurrence with specific days of week
          // Find the next day of week that's in the pattern
          let found = false;
          nextDate = currentDate.plus({ days: 1 });
          
          // Look ahead up to 7 days to find the next matching day
          for (let i = 0; i < 7 && !found; i++) {
            const nextDayOfWeek = nextDate.weekday % 7; // Convert to 0-based (0 = Sunday)
            if (pattern.daysOfWeek.includes(nextDayOfWeek)) {
              found = true;
            } else {
              nextDate = nextDate.plus({ days: 1 });
            }
          }
          
          // If we didn't find a matching day, use the interval
          if (!found) {
            nextDate = currentDate.plus({ weeks: pattern.interval });
          }
        } else {
          // Simple weekly recurrence
          nextDate = currentDate.plus({ weeks: pattern.interval });
        }
        break;
        
      case 'monthly':
        if (pattern.dayOfMonth) {
          // Monthly on a specific day of month (e.g., the 15th of each month)
          nextDate = currentDate.plus({ months: pattern.interval }).set({ day: pattern.dayOfMonth });
          
          // Handle invalid dates (e.g., Feb 30)
          if (!nextDate.isValid) {
            // Use the last day of the month instead
            nextDate = currentDate.plus({ months: pattern.interval }).endOf('month');
          }
        } else if (pattern.weekOfMonth && pattern.dayOfWeekMonth !== undefined) {
          // Monthly on a specific day of a specific week (e.g., 2nd Monday)
          const nextMonth = currentDate.plus({ months: pattern.interval });
          const firstDayOfMonth = nextMonth.startOf('month');
          
          // Find the first occurrence of the specified day in the month
          let firstSpecificDay = firstDayOfMonth;
          while (firstSpecificDay.weekday % 7 !== pattern.dayOfWeekMonth) {
            firstSpecificDay = firstSpecificDay.plus({ days: 1 });
          }
          
          // Add the required number of weeks
          nextDate = firstSpecificDay.plus({ weeks: pattern.weekOfMonth - 1 });
          
          // If this pushes us into the next month, use the last occurrence in the current month
          if (nextDate.month !== nextMonth.month) {
            nextDate = firstSpecificDay.plus({ weeks: pattern.weekOfMonth - 2 });
          }
        } else {
          // Default monthly recurrence (same day each month)
          nextDate = currentDate.plus({ months: pattern.interval });
        }
        break;
        
      case 'yearly':
        if (pattern.monthOfYear) {
          // Yearly on a specific month and day
          nextDate = currentDate.plus({ years: pattern.interval }).set({ month: pattern.monthOfYear });
        } else {
          // Simple yearly recurrence (same day each year)
          nextDate = currentDate.plus({ years: pattern.interval });
        }
        break;
        
      default:
        // Default to weekly if frequency is not recognized
        nextDate = currentDate.plus({ weeks: pattern.interval });
    }
    
    // Check if we've reached the end date
    if (endDate && nextDate > endDate) {
      break;
    }
    
    // Add the date to our results
    dates.push(nextDate);
    currentDate = nextDate;
    count++;
  }
  
  // Filter out any exceptions
  if (pattern.exceptions && pattern.exceptions.length > 0) {
    const exceptionDates = pattern.exceptions.map(ex => DateTime.fromISO(ex, { zone: timezone }));
    
    return dates.filter(date => 
      !exceptionDates.some(exDate => 
        date.hasSame(exDate, 'day')
      )
    );
  }
  
  return dates;
}

/**
 * Apply a recurring pattern to create multiple appointments
 * @param baseAppointment The template appointment to use for the series
 * @param pattern The recurring pattern
 * @param timezone The timezone to use for calculations
 * @returns Array of appointments in the series
 */
export function createRecurringAppointments(
  baseAppointment: Appointment,
  pattern: RecurringPattern,
  timezone: string
): Appointment[] {
  // Generate a unique group ID for this recurring series
  const recurringGroupId = `recurring-${baseAppointment.id}-${Date.now()}`;
  
  // Parse the start and end times
  const startDateTime = DateTime.fromISO(baseAppointment.start_at, { zone: 'UTC' });
  const endDateTime = DateTime.fromISO(baseAppointment.end_at, { zone: 'UTC' });
  
  // Calculate duration in minutes
  const durationMinutes = endDateTime.diff(startDateTime, 'minutes').minutes;
  
  // Generate the recurring dates
  const recurringDates = generateRecurringDates(
    startDateTime.setZone(timezone),
    pattern
  );
  
  // Create an appointment for each date
  return recurringDates.map((date, index) => {
    // Convert back to UTC for storage
    const utcStart = date.toUTC();
    const utcEnd = utcStart.plus({ minutes: durationMinutes });
    
    // Create a new appointment based on the template
    return {
      ...baseAppointment,
      // Generate a new ID for each appointment except the first one
      id: index === 0 ? baseAppointment.id : `${baseAppointment.id}-${index}`,
      start_at: utcStart.toISO(),
      end_at: utcEnd.toISO(),
      recurring_group_id: recurringGroupId,
      appointment_recurring: pattern
    };
  });
}

/**
 * Check if an appointment is part of a recurring series
 * @param appointment The appointment to check
 * @returns True if the appointment is part of a recurring series
 */
export function isRecurringAppointment(appointment: Appointment): boolean {
  return (
    !!appointment.recurring_group_id &&
    !!appointment.appointment_recurring
  );
}

/**
 * Get the next occurrence of a recurring appointment after a given date
 * @param appointment A recurring appointment
 * @param afterDate The date to find the next occurrence after
 * @param timezone The timezone to use for calculations
 * @returns The date of the next occurrence, or null if none exists
 */
export function getNextOccurrence(
  appointment: Appointment,
  afterDate: DateTime,
  timezone: string
): DateTime | null {
  // Ensure we have a recurring appointment
  if (!isRecurringAppointment(appointment)) {
    return null;
  }
  
  // Parse the recurring pattern
  const pattern = typeof appointment.appointment_recurring === 'string'
    ? JSON.parse(appointment.appointment_recurring)
    : appointment.appointment_recurring;
  
  // Parse the start time
  const startDateTime = DateTime.fromISO(appointment.start_at, { zone: 'UTC' }).setZone(timezone);
  
  // If the start date is already after the requested date, return it
  if (startDateTime > afterDate) {
    return startDateTime;
  }
  
  // Generate recurring dates
  const recurringDates = generateRecurringDates(startDateTime, pattern);
  
  // Find the first date after the requested date
  return recurringDates.find(date => date > afterDate) || null;
}

/**
 * Add an exception to a recurring pattern
 * @param pattern The recurring pattern to modify
 * @param exceptionDate The date to add as an exception
 * @returns The updated recurring pattern
 */
export function addExceptionToPattern(
  pattern: RecurringPattern,
  exceptionDate: string | DateTime
): RecurringPattern {
  // Convert the exception date to ISO string if it's a DateTime
  const exceptionIso = typeof exceptionDate === 'string'
    ? exceptionDate
    : exceptionDate.toISO();
  
  // Create a new pattern with the exception added
  return {
    ...pattern,
    exceptions: [
      ...(pattern.exceptions || []),
      exceptionIso
    ]
  };
}

/**
 * Remove an exception from a recurring pattern
 * @param pattern The recurring pattern to modify
 * @param exceptionDate The exception date to remove
 * @returns The updated recurring pattern
 */
export function removeExceptionFromPattern(
  pattern: RecurringPattern,
  exceptionDate: string | DateTime
): RecurringPattern {
  // If there are no exceptions, return the original pattern
  if (!pattern.exceptions || pattern.exceptions.length === 0) {
    return pattern;
  }
  
  // Convert the exception date to ISO string if it's a DateTime
  const exceptionIso = typeof exceptionDate === 'string'
    ? exceptionDate
    : exceptionDate.toISO();
  
  // Create a new pattern with the exception removed
  return {
    ...pattern,
    exceptions: pattern.exceptions.filter(ex => !ex.startsWith(exceptionIso.split('T')[0]))
  };
}

/**
 * Format a recurring pattern as a human-readable string
 * @param pattern The recurring pattern to format
 * @returns A human-readable description of the pattern
 */
export function formatRecurringPattern(pattern: RecurringPattern): string {
  if (!pattern) return 'No recurrence';
  
  const { frequency, interval } = pattern;
  
  // Base description
  let description = `Every ${interval > 1 ? interval : ''} `;
  
  // Add frequency
  switch (frequency) {
    case 'daily':
      description += interval > 1 ? 'days' : 'day';
      break;
      
    case 'weekly':
      description += interval > 1 ? 'weeks' : 'week';
      
      // Add days of week if specified
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const days = pattern.daysOfWeek.map(day => dayNames[day]);
        
        if (days.length === 7) {
          description += ' on every day';
        } else if (days.length === 1) {
          description += ` on ${days[0]}`;
        } else {
          const lastDay = days.pop();
          description += ` on ${days.join(', ')} and ${lastDay}`;
        }
      }
      break;
      
    case 'monthly':
      description += interval > 1 ? 'months' : 'month';
      
      // Add day of month if specified
      if (pattern.dayOfMonth) {
        description += ` on day ${pattern.dayOfMonth}`;
      } else if (pattern.weekOfMonth && pattern.dayOfWeekMonth !== undefined) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const ordinals = ['first', 'second', 'third', 'fourth', 'fifth'];
        
        description += ` on the ${ordinals[pattern.weekOfMonth - 1]} ${dayNames[pattern.dayOfWeekMonth]}`;
      }
      break;
      
    case 'yearly':
      description += interval > 1 ? 'years' : 'year';
      
      // Add month of year if specified
      if (pattern.monthOfYear) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        description += ` in ${monthNames[pattern.monthOfYear - 1]}`;
      }
      break;
  }
  
  // Add end condition
  if (pattern.endDate) {
    const endDate = DateTime.fromISO(pattern.endDate);
    description += ` until ${endDate.toFormat('MMMM d, yyyy')}`;
  } else if (pattern.endAfterOccurrences) {
    description += `, ${pattern.endAfterOccurrences} times`;
  }
  
  // Add exception count if any
  if (pattern.exceptions && pattern.exceptions.length > 0) {
    description += ` (${pattern.exceptions.length} exception${pattern.exceptions.length > 1 ? 's' : ''})`;
  }
  
  return description;
}