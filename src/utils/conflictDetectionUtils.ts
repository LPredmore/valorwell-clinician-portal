import { DateTime } from 'luxon';
import { Appointment } from '@/types/appointment';
import { generateRecurringDates, isRecurringAppointment } from './recurringAppointmentUtils';

/**
 * Conflict type enum
 * Defines the types of conflicts that can occur between appointments
 */
export enum ConflictType {
  OVERLAP = 'overlap',
  ADJACENT = 'adjacent',
  CONTAINED = 'contained',
  CONTAINS = 'contains',
  BACK_TO_BACK = 'back_to_back'
}

/**
 * Conflict resolution strategy enum
 * Defines the strategies for resolving conflicts
 */
export enum ConflictResolutionStrategy {
  RESCHEDULE = 'reschedule',
  SHORTEN = 'shorten',
  SPLIT = 'split',
  CANCEL = 'cancel',
  OVERRIDE = 'override',
  IGNORE = 'ignore'
}

/**
 * Appointment conflict interface
 * Defines the structure for conflicts between appointments
 */
export interface AppointmentConflict {
  type: ConflictType;
  appointment1: Appointment;
  appointment2: Appointment;
  overlapDurationMinutes?: number;
  possibleResolutions: ConflictResolutionStrategy[];
}

/**
 * Check if two appointments overlap
 * @param appt1 First appointment
 * @param appt2 Second appointment
 * @returns True if the appointments overlap
 */
export function doAppointmentsOverlap(appt1: Appointment, appt2: Appointment): boolean {
  // Parse the start and end times
  const start1 = DateTime.fromISO(appt1.start_at);
  const end1 = DateTime.fromISO(appt1.end_at);
  const start2 = DateTime.fromISO(appt2.start_at);
  const end2 = DateTime.fromISO(appt2.end_at);
  
  // Check for overlap
  return (start1 < end2 && start2 < end1);
}

/**
 * Calculate the overlap duration between two appointments
 * @param appt1 First appointment
 * @param appt2 Second appointment
 * @returns The overlap duration in minutes, or 0 if no overlap
 */
export function calculateOverlapDuration(appt1: Appointment, appt2: Appointment): number {
  // Parse the start and end times
  const start1 = DateTime.fromISO(appt1.start_at);
  const end1 = DateTime.fromISO(appt1.end_at);
  const start2 = DateTime.fromISO(appt2.start_at);
  const end2 = DateTime.fromISO(appt2.end_at);
  
  // Check for overlap
  if (start1 >= end2 || start2 >= end1) {
    return 0;
  }
  
  // Calculate overlap
  const overlapStart = start1 > start2 ? start1 : start2;
  const overlapEnd = end1 < end2 ? end1 : end2;
  
  // Return duration in minutes
  return overlapEnd.diff(overlapStart, 'minutes').minutes;
}

/**
 * Determine the type of conflict between two appointments
 * @param appt1 First appointment
 * @param appt2 Second appointment
 * @returns The conflict type, or null if no conflict
 */
export function determineConflictType(appt1: Appointment, appt2: Appointment): ConflictType | null {
  // Parse the start and end times
  const start1 = DateTime.fromISO(appt1.start_at);
  const end1 = DateTime.fromISO(appt1.end_at);
  const start2 = DateTime.fromISO(appt2.start_at);
  const end2 = DateTime.fromISO(appt2.end_at);
  
  // Check for exact match (same start and end)
  if (start1.equals(start2) && end1.equals(end2)) {
    return ConflictType.OVERLAP;
  }
  
  // Check if appointment 1 contains appointment 2
  if (start1 <= start2 && end1 >= end2) {
    return ConflictType.CONTAINS;
  }
  
  // Check if appointment 2 contains appointment 1
  if (start2 <= start1 && end2 >= end1) {
    return ConflictType.CONTAINED;
  }
  
  // Check for overlap
  if (start1 < end2 && start2 < end1) {
    return ConflictType.OVERLAP;
  }
  
  // Check for adjacent appointments (back-to-back)
  if (start1.equals(end2) || end1.equals(start2)) {
    return ConflictType.BACK_TO_BACK;
  }
  
  // Check for adjacent appointments with a small gap (within 5 minutes)
  const gap1 = start1.diff(end2, 'minutes').minutes;
  const gap2 = start2.diff(end1, 'minutes').minutes;
  
  if (Math.abs(gap1) <= 5 || Math.abs(gap2) <= 5) {
    return ConflictType.ADJACENT;
  }
  
  // No conflict
  return null;
}

/**
 * Get possible resolution strategies for a conflict
 * @param conflictType The type of conflict
 * @returns Array of possible resolution strategies
 */
export function getPossibleResolutions(conflictType: ConflictType): ConflictResolutionStrategy[] {
  switch (conflictType) {
    case ConflictType.OVERLAP:
      return [
        ConflictResolutionStrategy.RESCHEDULE,
        ConflictResolutionStrategy.SHORTEN,
        ConflictResolutionStrategy.CANCEL,
        ConflictResolutionStrategy.OVERRIDE
      ];
      
    case ConflictType.CONTAINED:
      return [
        ConflictResolutionStrategy.RESCHEDULE,
        ConflictResolutionStrategy.CANCEL,
        ConflictResolutionStrategy.OVERRIDE
      ];
      
    case ConflictType.CONTAINS:
      return [
        ConflictResolutionStrategy.SPLIT,
        ConflictResolutionStrategy.RESCHEDULE,
        ConflictResolutionStrategy.CANCEL,
        ConflictResolutionStrategy.OVERRIDE
      ];
      
    case ConflictType.ADJACENT:
    case ConflictType.BACK_TO_BACK:
      return [
        ConflictResolutionStrategy.RESCHEDULE,
        ConflictResolutionStrategy.IGNORE
      ];
      
    default:
      return [ConflictResolutionStrategy.IGNORE];
  }
}

/**
 * Detect conflicts between a new appointment and existing appointments
 * @param newAppointment The new appointment to check
 * @param existingAppointments Array of existing appointments
 * @returns Array of conflicts
 */
export function detectConflicts(
  newAppointment: Appointment,
  existingAppointments: Appointment[]
): AppointmentConflict[] {
  const conflicts: AppointmentConflict[] = [];
  
  // Check each existing appointment for conflicts
  for (const existingAppointment of existingAppointments) {
    // Skip if it's the same appointment (for updates)
    if (existingAppointment.id === newAppointment.id) {
      continue;
    }
    
    // Determine conflict type
    const conflictType = determineConflictType(newAppointment, existingAppointment);
    
    // If there's a conflict, add it to the results
    if (conflictType) {
      conflicts.push({
        type: conflictType,
        appointment1: newAppointment,
        appointment2: existingAppointment,
        overlapDurationMinutes: calculateOverlapDuration(newAppointment, existingAppointment),
        possibleResolutions: getPossibleResolutions(conflictType)
      });
    }
  }
  
  return conflicts;
}

/**
 * Detect conflicts for a recurring appointment
 * @param newAppointment The new recurring appointment to check
 * @param existingAppointments Array of existing appointments
 * @param timezone The timezone to use for calculations
 * @returns Array of conflicts
 */
export function detectRecurringConflicts(
  newAppointment: Appointment,
  existingAppointments: Appointment[],
  timezone: string
): AppointmentConflict[] {
  // If the appointment is not recurring, use the standard conflict detection
  if (!isRecurringAppointment(newAppointment)) {
    return detectConflicts(newAppointment, existingAppointments);
  }
  
  const conflicts: AppointmentConflict[] = [];
  
  // Parse the recurring pattern
  const pattern = typeof newAppointment.appointment_recurring === 'string'
    ? JSON.parse(newAppointment.appointment_recurring)
    : newAppointment.appointment_recurring;
  
  // Parse the start time
  const startDateTime = DateTime.fromISO(newAppointment.start_at, { zone: 'UTC' }).setZone(timezone);
  
  // Generate recurring dates
  const recurringDates = generateRecurringDates(startDateTime, pattern);
  
  // Calculate appointment duration
  const endDateTime = DateTime.fromISO(newAppointment.end_at, { zone: 'UTC' }).setZone(timezone);
  const durationMinutes = endDateTime.diff(startDateTime, 'minutes').minutes;
  
  // Check each recurring date for conflicts
  for (const recurringDate of recurringDates) {
    // Create a temporary appointment for this occurrence
    const occurrenceStart = recurringDate.toUTC().toISO();
    const occurrenceEnd = recurringDate.plus({ minutes: durationMinutes }).toUTC().toISO();
    
    const occurrenceAppointment: Appointment = {
      ...newAppointment,
      start_at: occurrenceStart,
      end_at: occurrenceEnd
    };
    
    // Detect conflicts for this occurrence
    const occurrenceConflicts = detectConflicts(occurrenceAppointment, existingAppointments);
    
    // Add to the overall conflicts
    conflicts.push(...occurrenceConflicts);
  }
  
  return conflicts;
}

/**
 * Apply a conflict resolution strategy
 * @param conflict The conflict to resolve
 * @param strategy The resolution strategy to apply
 * @param params Additional parameters for the resolution
 * @returns The resolved appointment(s)
 */
export function resolveConflict(
  conflict: AppointmentConflict,
  strategy: ConflictResolutionStrategy,
  params: {
    newStartTime?: string;
    newEndTime?: string;
    cancelReason?: string;
  } = {}
): Appointment | Appointment[] | null {
  const { appointment1: appt } = conflict;
  
  switch (strategy) {
    case ConflictResolutionStrategy.RESCHEDULE:
      // Reschedule the appointment to a new time
      if (!params.newStartTime || !params.newEndTime) {
        throw new Error('New start and end times are required for rescheduling');
      }
      
      return {
        ...appt,
        start_at: params.newStartTime,
        end_at: params.newEndTime
      };
      
    case ConflictResolutionStrategy.SHORTEN:
      // Shorten the appointment to avoid the conflict
      if (!params.newEndTime) {
        throw new Error('New end time is required for shortening');
      }
      
      return {
        ...appt,
        end_at: params.newEndTime
      };
      
    case ConflictResolutionStrategy.SPLIT:
      // Split the appointment into two parts around the conflict
      if (!params.newEndTime || !params.newStartTime) {
        throw new Error('New start and end times are required for splitting');
      }
      
      const firstPart: Appointment = {
        ...appt,
        id: `${appt.id}-1`,
        end_at: params.newEndTime
      };
      
      const secondPart: Appointment = {
        ...appt,
        id: `${appt.id}-2`,
        start_at: params.newStartTime
      };
      
      return [firstPart, secondPart];
      
    case ConflictResolutionStrategy.CANCEL:
      // Cancel the appointment
      return {
        ...appt,
        status: 'cancelled',
        notes: params.cancelReason 
          ? `${appt.notes || ''}\nCancelled: ${params.cancelReason}`.trim()
          : appt.notes
      };
      
    case ConflictResolutionStrategy.OVERRIDE:
      // Override the conflict (keep the appointment as is)
      return appt;
      
    case ConflictResolutionStrategy.IGNORE:
      // Ignore the conflict (keep the appointment as is)
      return appt;
      
    default:
      return null;
  }
}

/**
 * Suggest alternative times for an appointment with conflicts
 * @param appointment The appointment to find alternatives for
 * @param existingAppointments Array of existing appointments
 * @param timezone The timezone to use for calculations
 * @param maxSuggestions Maximum number of suggestions to return
 * @returns Array of suggested appointment times
 */
export function suggestAlternativeTimes(
  appointment: Appointment,
  existingAppointments: Appointment[],
  timezone: string,
  maxSuggestions: number = 5
): Appointment[] {
  const suggestions: Appointment[] = [];
  
  // Parse the appointment times
  const startDateTime = DateTime.fromISO(appointment.start_at, { zone: 'UTC' }).setZone(timezone);
  const endDateTime = DateTime.fromISO(appointment.end_at, { zone: 'UTC' }).setZone(timezone);
  const durationMinutes = endDateTime.diff(startDateTime, 'minutes').minutes;
  
  // Try different times on the same day
  const dayStart = startDateTime.set({ hour: 8, minute: 0 });
  const dayEnd = startDateTime.set({ hour: 17, minute: 0 });
  
  // Create time slots at 15-minute intervals
  for (let time = dayStart; time < dayEnd; time = time.plus({ minutes: 15 })) {
    // Skip if this is the original time
    if (time.equals(startDateTime)) {
      continue;
    }
    
    // Calculate end time
    const suggestedEnd = time.plus({ minutes: durationMinutes });
    
    // Skip if the appointment would end after business hours
    if (suggestedEnd > dayEnd) {
      continue;
    }
    
    // Create a suggested appointment
    const suggestedAppointment: Appointment = {
      ...appointment,
      start_at: time.toUTC().toISO(),
      end_at: suggestedEnd.toUTC().toISO()
    };
    
    // Check for conflicts
    const conflicts = detectConflicts(suggestedAppointment, existingAppointments);
    
    // If there are no conflicts, add to suggestions
    if (conflicts.length === 0) {
      suggestions.push(suggestedAppointment);
      
      // Stop if we have enough suggestions
      if (suggestions.length >= maxSuggestions) {
        break;
      }
    }
  }
  
  // If we don't have enough suggestions, try the next day
  if (suggestions.length < maxSuggestions) {
    const nextDay = startDateTime.plus({ days: 1 }).set({ hour: 8, minute: 0 });
    const nextDayEnd = nextDay.set({ hour: 17, minute: 0 });
    
    for (let time = nextDay; time < nextDayEnd; time = time.plus({ minutes: 30 })) {
      // Calculate end time
      const suggestedEnd = time.plus({ minutes: durationMinutes });
      
      // Skip if the appointment would end after business hours
      if (suggestedEnd > nextDayEnd) {
        continue;
      }
      
      // Create a suggested appointment
      const suggestedAppointment: Appointment = {
        ...appointment,
        start_at: time.toUTC().toISO(),
        end_at: suggestedEnd.toUTC().toISO()
      };
      
      // Check for conflicts
      const conflicts = detectConflicts(suggestedAppointment, existingAppointments);
      
      // If there are no conflicts, add to suggestions
      if (conflicts.length === 0) {
        suggestions.push(suggestedAppointment);
        
        // Stop if we have enough suggestions
        if (suggestions.length >= maxSuggestions) {
          break;
        }
      }
    }
  }
  
  return suggestions;
}