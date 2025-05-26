
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
 * Column-based Time Slot Interface
 * Represents time slots from clinician table columns
 */
export interface ColumnBasedTimeSlot {
  startTime: string;
  endTime: string;
  timezone?: string;
  slotNumber: number; // 1, 2, or 3
}

/**
 * Clinician Availability Slot Interface
 * Represents individual availability slots from clinician columns
 */
export interface ClinicianAvailabilitySlot {
  day: string; // monday, tuesday, etc.
  slots: ColumnBasedTimeSlot[];
}

/**
 * Column-based Availability Interface
 * Represents availability data directly from clinician table columns
 */
export interface ColumnBasedAvailability {
  clinicianId: string;
  timezone: string;
  slots: ClinicianAvailabilitySlot[];
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
 * Represents a complete week's availability pattern
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
 * Represents an exception to regular availability
 */
export interface AvailabilityException {
  id: string;
  clinician_id: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  day_of_week?: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Availability Block Interface
 * Represents a block of availability for a clinician
 * Updated to support both legacy and column-based systems
 */
export interface AvailabilityBlock {
  id: string;
  clinician_id: string;
  day_of_week: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  recurring_pattern?: WeeklyAvailabilityPattern;
}

/**
 * Clinician Column Data Interface
 * Represents data structure directly from clinicians table columns
 */
export interface ClinicianColumnData {
  id: string;
  clinician_first_name: string;
  clinician_last_name: string;
  clinician_professional_name?: string;
  clinician_email?: string;
  clinician_time_zone: string;
  clinician_bio?: string;
  clinician_image_url?: string;
  // Monday availability slots
  clinician_availability_start_monday_1?: string;
  clinician_availability_end_monday_1?: string;
  clinician_availability_timezone_monday_1?: string;
  clinician_availability_start_monday_2?: string;
  clinician_availability_end_monday_2?: string;
  clinician_availability_timezone_monday_2?: string;
  clinician_availability_start_monday_3?: string;
  clinician_availability_end_monday_3?: string;
  clinician_availability_timezone_monday_3?: string;
  // Tuesday availability slots
  clinician_availability_start_tuesday_1?: string;
  clinician_availability_end_tuesday_1?: string;
  clinician_availability_timezone_tuesday_1?: string;
  clinician_availability_start_tuesday_2?: string;
  clinician_availability_end_tuesday_2?: string;
  clinician_availability_timezone_tuesday_2?: string;
  clinician_availability_start_tuesday_3?: string;
  clinician_availability_end_tuesday_3?: string;
  clinician_availability_timezone_tuesday_3?: string;
  // Wednesday availability slots
  clinician_availability_start_wednesday_1?: string;
  clinician_availability_end_wednesday_1?: string;
  clinician_availability_timezone_wednesday_1?: string;
  clinician_availability_start_wednesday_2?: string;
  clinician_availability_end_wednesday_2?: string;
  clinician_availability_timezone_wednesday_2?: string;
  clinician_availability_start_wednesday_3?: string;
  clinician_availability_end_wednesday_3?: string;
  clinician_availability_timezone_wednesday_3?: string;
  // Thursday availability slots
  clinician_availability_start_thursday_1?: string;
  clinician_availability_end_thursday_1?: string;
  clinician_availability_timezone_thursday_1?: string;
  clinician_availability_start_thursday_2?: string;
  clinician_availability_end_thursday_2?: string;
  clinician_availability_timezone_thursday_2?: string;
  clinician_availability_start_thursday_3?: string;
  clinician_availability_end_thursday_3?: string;
  clinician_availability_timezone_thursday_3?: string;
  // Friday availability slots
  clinician_availability_start_friday_1?: string;
  clinician_availability_end_friday_1?: string;
  clinician_availability_timezone_friday_1?: string;
  clinician_availability_start_friday_2?: string;
  clinician_availability_end_friday_2?: string;
  clinician_availability_timezone_friday_2?: string;
  clinician_availability_start_friday_3?: string;
  clinician_availability_end_friday_3?: string;
  clinician_availability_timezone_friday_3?: string;
  // Saturday availability slots
  clinician_availability_start_saturday_1?: string;
  clinician_availability_end_saturday_1?: string;
  clinician_availability_timezone_saturday_1?: string;
  clinician_availability_start_saturday_2?: string;
  clinician_availability_end_saturday_2?: string;
  clinician_availability_timezone_saturday_2?: string;
  clinician_availability_start_saturday_3?: string;
  clinician_availability_end_saturday_3?: string;
  clinician_availability_timezone_saturday_3?: string;
  // Sunday availability slots
  clinician_availability_start_sunday_1?: string;
  clinician_availability_end_sunday_1?: string;
  clinician_availability_timezone_sunday_1?: string;
  clinician_availability_start_sunday_2?: string;
  clinician_availability_end_sunday_2?: string;
  clinician_availability_timezone_sunday_2?: string;
  clinician_availability_start_sunday_3?: string;
  clinician_availability_end_sunday_3?: string;
  clinician_availability_timezone_sunday_3?: string;
}
