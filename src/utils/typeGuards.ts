import { 
  Appointment, 
  AppointmentStatus, 
  AppointmentType, 
  RecurringPattern,
  AppointmentClientInfo,
  AppointmentBillingInfo,
  AuditInfo
} from '@/types/appointment';

import {
  AvailabilityBlock,
  AvailabilityException,
  TimeSlot,
  DayAvailability,
  WeeklyAvailabilityPattern,
  DayOfWeek,
  AvailabilityStatus
} from '@/types/availability';

import { DateTime } from 'luxon';

/**
 * Type Guards for Appointment Types
 */

/**
 * Checks if a value is a valid AppointmentStatus
 */
export function isAppointmentStatus(value: any): value is AppointmentStatus {
  return Object.values(AppointmentStatus).includes(value as AppointmentStatus);
}

/**
 * Checks if a value is a valid AppointmentType
 */
export function isAppointmentType(value: any): value is AppointmentType {
  return Object.values(AppointmentType).includes(value as AppointmentType);
}

/**
 * Checks if a value is a valid ISO date string
 */
export function isISODateString(value: any): boolean {
  if (typeof value !== 'string') return false;
  
  try {
    const date = DateTime.fromISO(value);
    return date.isValid;
  } catch {
    return false;
  }
}

/**
 * Enhanced type guard for RecurringPattern with detailed validation
 */
export function isRecurringPattern(obj: any): obj is RecurringPattern {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check required fields
  if (!['daily', 'weekly', 'monthly'].includes(obj.frequency)) return false;
  if (typeof obj.interval !== 'number' || obj.interval <= 0) return false;
  
  // Check optional fields
  if (obj.endDate !== undefined && !isISODateString(obj.endDate)) return false;
  
  if (obj.endAfterOccurrences !== undefined && 
      (typeof obj.endAfterOccurrences !== 'number' || obj.endAfterOccurrences <= 0)) {
    return false;
  }
  
  if (obj.daysOfWeek !== undefined) {
    if (!Array.isArray(obj.daysOfWeek)) return false;
    
    // Days of week should be numbers between 0-6 (Sunday-Saturday)
    if (!obj.daysOfWeek.every((day: any) => 
      typeof day === 'number' && day >= 0 && day <= 6)) {
      return false;
    }
  }
  
  if (obj.dayOfMonth !== undefined) {
    if (typeof obj.dayOfMonth !== 'number' || 
        obj.dayOfMonth < 1 || 
        obj.dayOfMonth > 31) {
      return false;
    }
  }
  
  if (obj.weekOfMonth !== undefined) {
    if (typeof obj.weekOfMonth !== 'number' || 
        obj.weekOfMonth < 1 || 
        obj.weekOfMonth > 5) {
      return false;
    }
  }
  
  return true;
}

/**
 * Enhanced type guard for AppointmentClientInfo with detailed validation
 */
export function isAppointmentClientInfo(obj: any): obj is AppointmentClientInfo {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check required fields
  if (typeof obj.client_first_name !== 'string') return false;
  if (typeof obj.client_last_name !== 'string') return false;
  if (typeof obj.client_preferred_name !== 'string') return false;
  if (typeof obj.client_email !== 'string') return false;
  if (typeof obj.client_phone !== 'string') return false;
  
  // Check optional fields
  if (obj.client_status !== null && typeof obj.client_status !== 'string') return false;
  if (obj.client_date_of_birth !== null && !isISODateString(obj.client_date_of_birth)) return false;
  if (obj.client_gender !== null && typeof obj.client_gender !== 'string') return false;
  if (obj.client_address !== null && typeof obj.client_address !== 'string') return false;
  if (obj.client_city !== null && typeof obj.client_city !== 'string') return false;
  if (obj.client_state !== null && typeof obj.client_state !== 'string') return false;
  if (obj.client_zipcode !== null && typeof obj.client_zipcode !== 'string') return false;
  
  return true;
}

/**
 * Type guard for AppointmentBillingInfo
 */
export function isAppointmentBillingInfo(obj: any): obj is AppointmentBillingInfo {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check optional fields with their expected types
  if (obj.cpt_code !== undefined && obj.cpt_code !== null && typeof obj.cpt_code !== 'string') return false;
  if (obj.diagnosis_code_pointers !== undefined && obj.diagnosis_code_pointers !== null && typeof obj.diagnosis_code_pointers !== 'string') return false;
  
  if (obj.modifiers !== undefined && obj.modifiers !== null) {
    if (!Array.isArray(obj.modifiers) || !obj.modifiers.every((m: any) => typeof m === 'string')) {
      return false;
    }
  }
  
  if (obj.place_of_service_code !== undefined && obj.place_of_service_code !== null && typeof obj.place_of_service_code !== 'string') return false;
  if (obj.billed_amount !== undefined && obj.billed_amount !== null && typeof obj.billed_amount !== 'number') return false;
  
  // Check all other billing fields
  const numberFields = [
    'insurance_paid_amount', 'insurance_adjustment_amount', 
    'patient_responsibility_amount', 'patient_paid_amount'
  ];
  
  for (const field of numberFields) {
    if (obj[field] !== undefined && obj[field] !== null && typeof obj[field] !== 'number') {
      return false;
    }
  }
  
  const stringFields = [
    'claim_status', 'claim_claimmd_id', 'claim_claimmd_batch_id',
    'claim_last_submission_date', 'claim_status_last_checked',
    'era_claimmd_id', 'era_check_eft_number', 'era_payment_date',
    'patient_payment_status', 'patient_payment_date',
    'billing_notes', 'last_statement_to_patient_date'
  ];
  
  for (const field of stringFields) {
    if (obj[field] !== undefined && obj[field] !== null && typeof obj[field] !== 'string') {
      return false;
    }
  }
  
  if (obj.stripe_charge_ids !== undefined && obj.stripe_charge_ids !== null) {
    if (!Array.isArray(obj.stripe_charge_ids) || !obj.stripe_charge_ids.every((id: any) => typeof id === 'string')) {
      return false;
    }
  }
  
  if (obj.requires_billing_review !== undefined && typeof obj.requires_billing_review !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * Type guard for AuditInfo
 */
export function isAuditInfo(obj: any): obj is AuditInfo {
  if (!obj || typeof obj !== 'object') return false;
  
  if (obj.created_at !== undefined && !isISODateString(obj.created_at)) return false;
  if (obj.updated_at !== undefined && !isISODateString(obj.updated_at)) return false;
  if (obj.created_by !== undefined && typeof obj.created_by !== 'string') return false;
  if (obj.updated_by !== undefined && typeof obj.updated_by !== 'string') return false;
  
  return true;
}

/**
 * Enhanced type guard for Appointment with detailed validation
 */
export function isAppointment(obj: any): obj is Appointment {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check required fields
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.client_id !== 'string') return false;
  if (typeof obj.clinician_id !== 'string') return false;
  if (!isISODateString(obj.start_at)) return false;
  if (!isISODateString(obj.end_at)) return false;
  
  // Check that start_at is before end_at
  const start = DateTime.fromISO(obj.start_at);
  const end = DateTime.fromISO(obj.end_at);
  if (start >= end) return false;
  
  // Check type and status
  if (!isAppointmentType(obj.type) && typeof obj.type !== 'string') return false;
  if (!isAppointmentStatus(obj.status) && typeof obj.status !== 'string') return false;
  
  // Check optional fields
  if (obj.video_room_url !== undefined && obj.video_room_url !== null && typeof obj.video_room_url !== 'string') return false;
  if (obj.notes !== undefined && obj.notes !== null && typeof obj.notes !== 'string') return false;
  
  if (obj.appointment_recurring !== undefined && obj.appointment_recurring !== null) {
    if (typeof obj.appointment_recurring !== 'string' && !isRecurringPattern(obj.appointment_recurring)) {
      return false;
    }
  }
  
  if (obj.recurring_group_id !== undefined && obj.recurring_group_id !== null && typeof obj.recurring_group_id !== 'string') return false;
  
  // Check client object if present
  if (obj.client !== undefined && !isAppointmentClientInfo(obj.client)) return false;
  
  // Check clientName if present
  if (obj.clientName !== undefined && typeof obj.clientName !== 'string') return false;
  
  // Check billing info if present
  if (obj.billing !== undefined && !isAppointmentBillingInfo(obj.billing)) return false;
  
  // Check audit info if present
  if (obj.audit !== undefined && !isAuditInfo(obj.audit)) return false;
  
  return true;
}

/**
 * Type Guards for Availability Types
 */

/**
 * Checks if a value is a valid DayOfWeek
 */
export function isDayOfWeek(value: any): value is DayOfWeek {
  return Object.values(DayOfWeek).includes(value as DayOfWeek);
}

/**
 * Checks if a value is a valid AvailabilityStatus
 */
export function isAvailabilityStatus(value: any): value is AvailabilityStatus {
  return Object.values(AvailabilityStatus).includes(value as AvailabilityStatus);
}

/**
 * Enhanced type guard for TimeSlot with detailed validation
 */
export function isTimeSlot(obj: any): obj is TimeSlot {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check required fields
  if (typeof obj.startTime !== 'string' || !(/^\d{2}:\d{2}$/.test(obj.startTime))) return false;
  if (typeof obj.endTime !== 'string' || !(/^\d{2}:\d{2}$/.test(obj.endTime))) return false;
  if (typeof obj.timezone !== 'string') return false;
  
  // Validate time format and values
  const [startHour, startMinute] = obj.startTime.split(':').map(Number);
  const [endHour, endMinute] = obj.endTime.split(':').map(Number);
  
  if (startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59) return false;
  if (endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59) return false;
  
  // Validate that start time is before end time
  if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) return false;
  
  // Validate timezone
  try {
    const dt = DateTime.now().setZone(obj.timezone);
    if (!dt.isValid) return false;
  } catch {
    return false;
  }
  
  return true;
}

/**
 * Enhanced type guard for DayAvailability with detailed validation
 */
export function isDayAvailability(obj: any): obj is DayAvailability {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check required fields
  if (!isDayOfWeek(obj.dayOfWeek) && typeof obj.dayOfWeek !== 'string') return false;
  if (typeof obj.isAvailable !== 'boolean') return false;
  
  // Check timeSlots array
  if (!Array.isArray(obj.timeSlots)) return false;
  
  // If isAvailable is true, timeSlots should not be empty
  if (obj.isAvailable && obj.timeSlots.length === 0) return false;
  
  // Validate each time slot
  for (const slot of obj.timeSlots) {
    if (!isTimeSlot(slot)) return false;
  }
  
  return true;
}

/**
 * Enhanced type guard for WeeklyAvailabilityPattern with detailed validation
 */
export function isWeeklyAvailabilityPattern(obj: any): obj is WeeklyAvailabilityPattern {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check that all days of the week are present
  for (const day of Object.values(DayOfWeek)) {
    if (!obj[day] || !isDayAvailability(obj[day])) return false;
  }
  
  return true;
}

/**
 * Enhanced type guard for AvailabilityException with detailed validation
 */
export function isAvailabilityException(obj: any): obj is AvailabilityException {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check required fields
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.clinician_id !== 'string') return false;
  if (typeof obj.specific_date !== 'string' || !(/^\d{4}-\d{2}-\d{2}$/.test(obj.specific_date))) return false;
  if (typeof obj.start_time !== 'string' || !(/^\d{2}:\d{2}(:\d{2})?$/.test(obj.start_time))) return false;
  if (typeof obj.end_time !== 'string' || !(/^\d{2}:\d{2}(:\d{2})?$/.test(obj.end_time))) return false;
  if (typeof obj.is_active !== 'boolean') return false;
  if (typeof obj.is_deleted !== 'boolean') return false;
  if (!isISODateString(obj.created_at)) return false;
  if (!isISODateString(obj.updated_at)) return false;
  
  // Check optional fields
  if (obj.day_of_week !== undefined && 
      !isDayOfWeek(obj.day_of_week) && 
      typeof obj.day_of_week !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * Enhanced type guard for AvailabilityBlock with detailed validation
 */
export function isAvailabilityBlock(obj: any): obj is AvailabilityBlock {
  if (!obj || typeof obj !== 'object') return false;
  
  // Check required fields
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.clinician_id !== 'string') return false;
  if (!isISODateString(obj.start_at)) return false;
  if (!isISODateString(obj.end_at)) return false;
  if (typeof obj.is_active !== 'boolean') return false;
  
  // Check that start_at is before end_at
  const start = DateTime.fromISO(obj.start_at);
  const end = DateTime.fromISO(obj.end_at);
  if (start >= end) return false;
  
  // Check optional fields
  if (obj.recurring_pattern !== undefined && obj.recurring_pattern !== null) {
    if (!isWeeklyAvailabilityPattern(obj.recurring_pattern)) return false;
  }
  
  if (obj.created_at !== undefined && !isISODateString(obj.created_at)) return false;
  if (obj.updated_at !== undefined && !isISODateString(obj.updated_at)) return false;
  
  return true;
}

/**
 * Utility function to validate an object against a type guard
 * Returns the validated object or throws an error with details
 */
export function validateOrThrow<T>(obj: any, typeGuard: (obj: any) => obj is T, typeName: string): T {
  if (typeGuard(obj)) {
    return obj;
  }
  
  throw new Error(`Invalid ${typeName}: ${JSON.stringify(obj)}`);
}

/**
 * Utility function to validate an array of objects against a type guard
 * Returns the validated array or throws an error with details
 */
export function validateArrayOrThrow<T>(
  arr: any[], 
  typeGuard: (obj: any) => obj is T, 
  typeName: string
): T[] {
  if (!Array.isArray(arr)) {
    throw new Error(`Expected an array of ${typeName}, but got: ${typeof arr}`);
  }
  
  return arr.map((item, index) => {
    if (typeGuard(item)) {
      return item;
    }
    
    throw new Error(`Invalid ${typeName} at index ${index}: ${JSON.stringify(item)}`);
  });
}