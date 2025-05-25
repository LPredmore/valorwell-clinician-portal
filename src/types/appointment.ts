/**
 * Appointment Status Enum
 * Defines all possible appointment statuses
 */
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
  PENDING = 'pending'
}

/**
 * Appointment Type Enum
 * Defines all possible appointment types
 */
export enum AppointmentType {
  INITIAL_CONSULTATION = 'initial_consultation',
  FOLLOW_UP = 'follow_up',
  THERAPY_SESSION = 'therapy_session',
  ASSESSMENT = 'assessment',
  GROUP_THERAPY = 'group_therapy',
  EMERGENCY = 'emergency',
  TELEHEALTH = 'telehealth',
  IN_PERSON = 'in_person'
}

/**
 * Recurring Pattern Type
 * Defines the structure for recurring appointments
 */
export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 weeks, every 3 days
  endDate?: string; // ISO date string for when recurrence ends
  endAfterOccurrences?: number; // Alternative to endDate - stop after N occurrences
  
  // Weekly recurrence options
  daysOfWeek?: number[]; // 0-6 where 0 is Sunday, e.g., [1, 3] for Monday and Wednesday
  
  // Monthly recurrence options
  dayOfMonth?: number; // 1-31, e.g., 15 for the 15th of each month
  weekOfMonth?: number; // 1-5, e.g., 2 for the second week
  dayOfWeekMonth?: number; // 0-6, e.g., 1 for Monday of the specified week
  
  // Yearly recurrence options
  monthOfYear?: number; // 1-12, e.g., 3 for March
  
  // Exception handling
  exceptions?: string[]; // Array of ISO date strings for dates to skip
  
  // Timezone information for consistent recurrence across DST changes
  timezone?: string; // IANA timezone string
}

/**
 * Recurring Exception Type
 * Defines the structure for exceptions to recurring appointments
 */
export interface RecurringException {
  id: string;
  recurring_group_id: string;
  exception_date: string; // ISO date string
  reason?: string;
  is_rescheduled?: boolean;
  rescheduled_to?: string; // ISO date string if rescheduled
}

/**
 * Client Information Type
 * Defines the structure for client information in appointments
 */
export interface AppointmentClientInfo {
  client_first_name: string;
  client_last_name: string;
  client_preferred_name: string;
  client_email: string;
  client_phone: string;
  client_status: string | null;
  client_date_of_birth: string | null;
  client_gender: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zipcode: string | null;
}

/**
 * Billing Information Type
 * Defines the structure for billing information in appointments
 */
export interface AppointmentBillingInfo {
  cpt_code?: string | null;
  diagnosis_code_pointers?: string | null;
  modifiers?: string[] | null;
  place_of_service_code?: string | null;
  billed_amount?: number | null;
  claim_status?: string | null;
  claim_claimmd_id?: string | null;
  claim_claimmd_batch_id?: string | null;
  claim_last_submission_date?: string | null;
  claim_status_last_checked?: string | null;
  claim_response_json?: any | null;
  era_claimmd_id?: string | null;
  era_check_eft_number?: string | null;
  era_payment_date?: string | null;
  insurance_paid_amount?: number | null;
  insurance_adjustment_amount?: number | null;
  insurance_adjustment_details_json?: any | null;
  patient_responsibility_amount?: number | null;
  denial_details_json?: any | null;
  patient_payment_status?: string | null;
  patient_paid_amount?: number | null;
  patient_payment_date?: string | null;
  stripe_charge_ids?: string[] | null;
  billing_notes?: string | null;
  requires_billing_review?: boolean;
  last_statement_to_patient_date?: string | null;
}

/**
 * Audit Information Type
 * Defines the structure for audit information in appointments
 */
export interface AuditInfo {
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

/**
 * Unified Appointment interface for all components.
 * UTC timestamps (start_at, end_at) are the sole source of truth for appointment timing.
 * This interface represents a processed appointment object ready for use in the application.
 */
export interface Appointment {
  id: string;
  client_id: string;      // Foreign key
  clinician_id: string;   // Foreign key
  start_at: string;       // UTC ISO timestamp string (e.g., "2025-05-07T14:00:00.000Z")
  end_at: string;         // UTC ISO timestamp string (e.g., "2025-05-07T15:00:00.000Z")
  type: AppointmentType | string;
  status: AppointmentStatus | string;
  video_room_url?: string | null;
  notes?: string | null;
  appointment_recurring?: RecurringPattern | string | null;
  recurring_group_id?: string | null;
  
  // Client information, structured as an object.
  // This is populated by useAppointments.tsx from the Supabase 'clients' join.
  client?: AppointmentClientInfo;
  
  // Convenience field, populated by useAppointments.tsx
  // CONSISTENT FORMAT: Always uses "client_preferred_name client_last_name" when both exist
  // Falls back to "client_first_name client_last_name"
  clientName?: string;
  
  // Billing and claims information
  billing?: AppointmentBillingInfo;
  
  // Audit information
  audit?: AuditInfo;
}

/**
 * Type guard to check if an object is a valid Appointment
 */
export function isAppointment(obj: any): obj is Appointment {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.client_id === 'string' &&
    typeof obj.clinician_id === 'string' &&
    typeof obj.start_at === 'string' &&
    typeof obj.end_at === 'string' &&
    (typeof obj.type === 'string' || Object.values(AppointmentType).includes(obj.type)) &&
    (typeof obj.status === 'string' || Object.values(AppointmentStatus).includes(obj.status))
  );
}

/**
 * Type guard to check if an object is a valid RecurringPattern
 */
export function isRecurringPattern(obj: any): obj is RecurringPattern {
  return (
    obj &&
    typeof obj === 'object' &&
    ['daily', 'weekly', 'monthly', 'yearly'].includes(obj.frequency) &&
    typeof obj.interval === 'number' &&
    (obj.endDate === undefined || typeof obj.endDate === 'string') &&
    (obj.endAfterOccurrences === undefined || typeof obj.endAfterOccurrences === 'number') &&
    (obj.daysOfWeek === undefined || Array.isArray(obj.daysOfWeek)) &&
    (obj.dayOfMonth === undefined || typeof obj.dayOfMonth === 'number') &&
    (obj.weekOfMonth === undefined || typeof obj.weekOfMonth === 'number') &&
    (obj.dayOfWeekMonth === undefined || typeof obj.dayOfWeekMonth === 'number') &&
    (obj.monthOfYear === undefined || typeof obj.monthOfYear === 'number') &&
    (obj.exceptions === undefined || Array.isArray(obj.exceptions)) &&
    (obj.timezone === undefined || typeof obj.timezone === 'string')
  );
}

/**
 * Type guard to check if an object is a valid RecurringException
 */
export function isRecurringException(obj: any): obj is RecurringException {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.recurring_group_id === 'string' &&
    typeof obj.exception_date === 'string' &&
    (obj.reason === undefined || typeof obj.reason === 'string') &&
    (obj.is_rescheduled === undefined || typeof obj.is_rescheduled === 'boolean') &&
    (obj.rescheduled_to === undefined || typeof obj.rescheduled_to === 'string')
  );
}

/**
 * Type guard to check if an object is a valid AppointmentClientInfo
 */
export function isAppointmentClientInfo(obj: any): obj is AppointmentClientInfo {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.client_first_name === 'string' &&
    typeof obj.client_last_name === 'string' &&
    typeof obj.client_preferred_name === 'string' &&
    typeof obj.client_email === 'string' &&
    typeof obj.client_phone === 'string'
  );
}
