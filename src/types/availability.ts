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
 * Availability Exception Interface
 * Represents an exception to the regular availability pattern
 */
export interface AvailabilityException {
  id: string;
  clinician_id: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  day_of_week?: DayOfWeek | string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Represents an availability block for a clinician in the UTC-only data model.
 * This type matches the schema of the availability_blocks table.
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
 * Type guard to check if an object is a valid AvailabilityBlock
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
 * Type guard to check if an object is a valid AvailabilityException
 */
export function isAvailabilityException(obj: any): obj is AvailabilityException {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.clinician_id === 'string' &&
    typeof obj.specific_date === 'string' &&
    typeof obj.start_time === 'string' &&
    typeof obj.end_time === 'string' &&
    typeof obj.is_active === 'boolean' &&
    typeof obj.is_deleted === 'boolean' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string' &&
    (obj.day_of_week === undefined || 
     Object.values(DayOfWeek).includes(obj.day_of_week as DayOfWeek) || 
     typeof obj.day_of_week === 'string')
  );
}
