/**
 * Availability Status Enum
 * Defines all possible availability statuses
 */
export enum AvailabilityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted'
}

/**
 * Day of Week Enum
 * Defines all days of the week
 */
export enum DayOfWeek {
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday'
}

/**
 * Time Slot Interface
 * Represents a single time slot in a day
 */
export interface TimeSlot {
  startTime: string;  // Format: "HH:MM"
  endTime: string;    // Format: "HH:MM"
  timezone: string;   // IANA timezone string
}

/**
 * Day Availability Interface
 * Represents availability for a specific day of the week
 */
export interface DayAvailability {
  dayOfWeek: DayOfWeek | string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

/**
 * Weekly Availability Pattern Interface
 * Represents a clinician's weekly availability pattern
 */
export interface WeeklyAvailabilityPattern {
  [DayOfWeek.MONDAY]: DayAvailability;
  [DayOfWeek.TUESDAY]: DayAvailability;
  [DayOfWeek.WEDNESDAY]: DayAvailability;
  [DayOfWeek.THURSDAY]: DayAvailability;
  [DayOfWeek.FRIDAY]: DayAvailability;
  [DayOfWeek.SATURDAY]: DayAvailability;
  [DayOfWeek.SUNDAY]: DayAvailability;
}

/**
 * Clinician Availability Slot Interface
 * Represents a single availability slot for a clinician
 * This directly reflects the clinician table structure
 */
export interface ClinicianAvailabilitySlot {
  day: string;            // "monday", "tuesday", etc.
  slot: number;           // 1 | 2 | 3
  start_time: string | null;
  end_time: string | null;
  timezone: string;
}

/**
 * AvailabilityBlock Interface
 * This is a compatibility interface that maps the clinician availability data
 * to the format expected by existing components.
 * @deprecated Use ClinicianAvailabilitySlot instead for new code
 */
export interface AvailabilityBlock {
  id: string;
  clinician_id: string;
  start_at: string; // UTC ISO string
  end_at: string;   // UTC ISO string
  is_active: boolean;
  recurring_pattern?: WeeklyAvailabilityPattern | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Type guard to check if an object is a valid TimeSlot
 */
export function isTimeSlot(obj: any): obj is TimeSlot {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.startTime === 'string' &&
    typeof obj.endTime === 'string' &&
    typeof obj.timezone === 'string' &&
    /^\d{2}:\d{2}$/.test(obj.startTime) &&
    /^\d{2}:\d{2}$/.test(obj.endTime)
  );
}

/**
 * Type guard to check if an object is a valid DayAvailability
 */
export function isDayAvailability(obj: any): obj is DayAvailability {
  return (
    obj &&
    typeof obj === 'object' &&
    (Object.values(DayOfWeek).includes(obj.dayOfWeek as DayOfWeek) || typeof obj.dayOfWeek === 'string') &&
    typeof obj.isAvailable === 'boolean' &&
    Array.isArray(obj.timeSlots) &&
    obj.timeSlots.every((slot: any) => isTimeSlot(slot))
  );
}

/**
 * Type guard to check if an object is a valid WeeklyAvailabilityPattern
 */
export function isWeeklyAvailabilityPattern(obj: any): obj is WeeklyAvailabilityPattern {
  return (
    obj &&
    typeof obj === 'object' &&
    isDayAvailability(obj[DayOfWeek.MONDAY]) &&
    isDayAvailability(obj[DayOfWeek.TUESDAY]) &&
    isDayAvailability(obj[DayOfWeek.WEDNESDAY]) &&
    isDayAvailability(obj[DayOfWeek.THURSDAY]) &&
    isDayAvailability(obj[DayOfWeek.FRIDAY]) &&
    isDayAvailability(obj[DayOfWeek.SATURDAY]) &&
    isDayAvailability(obj[DayOfWeek.SUNDAY])
  );
}

/**
 * Type guard to check if an object is a valid ClinicianAvailabilitySlot
 */
export function isClinicianAvailabilitySlot(obj: any): obj is ClinicianAvailabilitySlot {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.day === 'string' &&
    typeof obj.slot === 'number' &&
    (obj.start_time === null || typeof obj.start_time === 'string') &&
    (obj.end_time === null || typeof obj.end_time === 'string') &&
    typeof obj.timezone === 'string'
  );
}

/**
 * Type guard to check if an object is a valid AvailabilityBlock
 * @deprecated Use isClinicianAvailabilitySlot instead for new code
 */
export function isAvailabilityBlock(obj: any): obj is AvailabilityBlock {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.clinician_id === 'string' &&
    typeof obj.start_at === 'string' &&
    typeof obj.end_at === 'string' &&
    typeof obj.is_active === 'boolean'
  );
}
