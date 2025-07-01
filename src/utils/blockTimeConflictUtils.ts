
import { DateTime } from 'luxon';

export interface BlockedTimeSlot {
  id: string;
  start: Date;
  end: Date;
  title: string;
  type: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

/**
 * Check if a proposed appointment time conflicts with blocked time slots
 */
export const hasBlockedTimeConflict = (
  proposedSlot: TimeSlot,
  blockedSlots: BlockedTimeSlot[]
): { hasConflict: boolean; conflictingSlot?: BlockedTimeSlot } => {
  const proposedStart = DateTime.fromJSDate(proposedSlot.start);
  const proposedEnd = DateTime.fromJSDate(proposedSlot.end);

  for (const blockedSlot of blockedSlots) {
    // Only check blocked_time type appointments
    if (blockedSlot.type !== 'blocked_time') continue;

    const blockedStart = DateTime.fromJSDate(blockedSlot.start);
    const blockedEnd = DateTime.fromJSDate(blockedSlot.end);

    // Check for overlap: proposed slot overlaps with blocked slot
    if (proposedStart < blockedEnd && proposedEnd > blockedStart) {
      return {
        hasConflict: true,
        conflictingSlot: blockedSlot
      };
    }
  }

  return { hasConflict: false };
};

/**
 * Get formatted conflict message for user feedback
 */
export const getBlockedTimeConflictMessage = (conflictingSlot: BlockedTimeSlot): string => {
  const startTime = DateTime.fromJSDate(conflictingSlot.start).toFormat('h:mm a');
  const endTime = DateTime.fromJSDate(conflictingSlot.end).toFormat('h:mm a');
  const date = DateTime.fromJSDate(conflictingSlot.start).toFormat('MMM d, yyyy');
  
  return `This time conflicts with blocked time "${conflictingSlot.title}" on ${date} from ${startTime} to ${endTime}. Please choose a different time slot.`;
};

/**
 * Filter available time slots by removing those that conflict with blocked time
 */
export const filterAvailableSlotsByBlockedTime = (
  availableSlots: TimeSlot[],
  blockedSlots: BlockedTimeSlot[]
): TimeSlot[] => {
  return availableSlots.filter(slot => {
    const { hasConflict } = hasBlockedTimeConflict(slot, blockedSlots);
    return !hasConflict;
  });
};
