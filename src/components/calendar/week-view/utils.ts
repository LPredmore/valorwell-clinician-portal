
import { TimeBlock, AppointmentBlock } from './types';
import { DateTime } from 'luxon';

// PHASE 1: Refactor to accept only Luxon DateTime objects
// Check if a slot is the start of an availability block
export const isStartOfBlock = (dayTimeSlot: DateTime, block?: TimeBlock): boolean => {
  if (!block || !block.start) return false;

  // PHASE 3: Enhanced debug logging
  console.log('[isStartOfBlock] Checking if slot is start of block:', {
    slotTime: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
    blockStart: block.start.toFormat('yyyy-MM-dd HH:mm'),
    timezone: dayTimeSlot.zoneName
  });

  // Use Luxon's hasSame method for more reliable comparison
  return block.start.hasSame(dayTimeSlot, 'hour') &&
         block.start.hasSame(dayTimeSlot, 'minute') &&
         block.start.hasSame(dayTimeSlot, 'day');
};

// PHASE 1: Refactor to accept only Luxon DateTime objects
// Check if a slot is the end of an availability block
export const isEndOfBlock = (dayTimeSlot: DateTime, block?: TimeBlock): boolean => {
  if (!block || !block.end) return false;

  // Add 30 minutes to slot time (standard slot duration) and compare with block end
  const slotEndTime = dayTimeSlot.plus({ minutes: 30 });
  
  // PHASE 3: Enhanced debug logging
  console.log('[isEndOfBlock] Checking if slot is end of block:', {
    slotTime: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
    slotEndTime: slotEndTime.toFormat('yyyy-MM-dd HH:mm'),
    blockEnd: block.end.toFormat('yyyy-MM-dd HH:mm'),
    timezone: dayTimeSlot.zoneName
  });
  
  // Compare using Luxon's hasSame
  return block.end.hasSame(slotEndTime, 'hour') &&
         block.end.hasSame(slotEndTime, 'minute') &&
         block.end.hasSame(slotEndTime, 'day');
};

// PHASE 1: Refactor to accept only Luxon DateTime objects
// Check if a slot is the start of an appointment
export const isStartOfAppointment = (dayTimeSlot: DateTime, appointment?: AppointmentBlock): boolean => {
  if (!appointment || !appointment.start) return false;
  
  // PHASE 3: Enhanced debug logging
  console.log('[isStartOfAppointment] Checking if slot is start of appointment:', {
    slotTime: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
    appointmentStart: appointment.start.toFormat('yyyy-MM-dd HH:mm'),
    timezone: dayTimeSlot.zoneName
  });
  
  // Compare using hasSame for more reliable comparison
  return appointment.start.hasSame(dayTimeSlot, 'minute') && 
         appointment.start.hasSame(dayTimeSlot, 'hour') && 
         appointment.start.hasSame(dayTimeSlot, 'day');
};

// PHASE 1: Refactor to accept only Luxon DateTime objects
// Check if a time is within an appointment block
export const isWithinAppointment = (dayTimeSlot: DateTime, appointment?: AppointmentBlock): boolean => {
  if (!appointment || !appointment.start || !appointment.end) return false;
  
  // PHASE 3: Enhanced debug logging
  console.log('[isWithinAppointment] Checking if slot is within appointment:', {
    slotTime: dayTimeSlot.toFormat('yyyy-MM-dd HH:mm'),
    appointmentStart: appointment.start.toFormat('yyyy-MM-dd HH:mm'),
    appointmentEnd: appointment.end.toFormat('yyyy-MM-dd HH:mm'),
    timezone: dayTimeSlot.zoneName
  });
  
  // Use Luxon's comparison operators
  return dayTimeSlot >= appointment.start && dayTimeSlot < appointment.end;
};
