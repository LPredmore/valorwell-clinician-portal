
import { TimeBlock, AppointmentBlock } from './types';
import { DateTime } from 'luxon';

/**
 * Check if a time slot is the start of an availability block
 * @param dayTimeSlot The time slot to check
 * @param block The availability block to compare against
 * @returns True if the time slot is the start of the block
 */
export const isStartOfBlock = (dayTimeSlot: DateTime, block?: TimeBlock): boolean => {
  if (!block || !block.start) return false;

  return block.start.hasSame(dayTimeSlot, 'hour') &&
         block.start.hasSame(dayTimeSlot, 'minute') &&
         block.start.hasSame(dayTimeSlot, 'day');
};

/**
 * Check if a time slot is the end of an availability block
 * @param dayTimeSlot The time slot to check
 * @param block The availability block to compare against
 * @returns True if the time slot is the end of the block
 */
export const isEndOfBlock = (dayTimeSlot: DateTime, block?: TimeBlock): boolean => {
  if (!block || !block.end) return false;

  // Add 30 minutes to slot time (standard slot duration) and compare with block end
  const slotEndTime = dayTimeSlot.plus({ minutes: 30 });
  
  return block.end.hasSame(slotEndTime, 'hour') &&
         block.end.hasSame(slotEndTime, 'minute') &&
         block.end.hasSame(slotEndTime, 'day');
};

/**
 * Check if a time slot is the start of an appointment
 * @param dayTimeSlot The time slot to check
 * @param appointment The appointment to compare against
 * @returns True if the time slot is the start of the appointment
 */
export const isStartOfAppointment = (dayTimeSlot: DateTime, appointment?: AppointmentBlock): boolean => {
  if (!appointment || !appointment.start) return false;
  
  return appointment.start.hasSame(dayTimeSlot, 'minute') &&
         appointment.start.hasSame(dayTimeSlot, 'hour') &&
         appointment.start.hasSame(dayTimeSlot, 'day');
};

/**
 * Check if a time slot is within an appointment block
 * @param dayTimeSlot The time slot to check
 * @param appointment The appointment to compare against
 * @returns True if the time slot is within the appointment
 */
export const isWithinAppointment = (dayTimeSlot: DateTime, appointment?: AppointmentBlock): boolean => {
  if (!appointment || !appointment.start || !appointment.end) return false;
  
  return dayTimeSlot >= appointment.start && dayTimeSlot < appointment.end;
};
