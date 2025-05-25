/**
 * Appointment Template Type Enum
 * Defines all possible template types
 */
export enum TemplateType {
  INITIAL_CONSULTATION = 'initial_consultation',
  FOLLOW_UP = 'follow_up',
  THERAPY_SESSION = 'therapy_session',
  ASSESSMENT = 'assessment',
  GROUP_THERAPY = 'group_therapy',
  EMERGENCY = 'emergency',
  TELEHEALTH = 'telehealth',
  IN_PERSON = 'in_person',
  CUSTOM = 'custom'
}

/**
 * Template Category Enum
 * Defines categories for organizing templates
 */
export enum TemplateCategory {
  STANDARD = 'standard',
  SPECIALIZED = 'specialized',
  EMERGENCY = 'emergency',
  ASSESSMENT = 'assessment',
  PERSONAL = 'personal',
  FAVORITE = 'favorite'
}

/**
 * Appointment Template interface
 * Defines the structure for appointment templates
 */
export interface AppointmentTemplate {
  id: string;
  name: string;
  description?: string;
  type: TemplateType | string;
  duration: number; // in minutes
  notes?: string;
  category: TemplateCategory | string;
  is_favorite: boolean;
  clinician_id: string; // The clinician who created this template
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Optional fields for pre-filled appointment data
  default_location?: string;
  default_video_enabled?: boolean;
  default_reminder_minutes?: number[];
  default_billing_code?: string;
  default_diagnosis_codes?: string[];
  
  // Recurring pattern (optional)
  default_recurring_pattern?: {
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: number[];
  };
}

/**
 * Type guard to check if an object is a valid AppointmentTemplate
 */
export function isAppointmentTemplate(obj: any): obj is AppointmentTemplate {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.duration === 'number' &&
    typeof obj.category === 'string' &&
    typeof obj.is_favorite === 'boolean' &&
    typeof obj.clinician_id === 'string' &&
    (obj.description === undefined || typeof obj.description === 'string') &&
    (obj.notes === undefined || typeof obj.notes === 'string') &&
    (obj.is_default === undefined || typeof obj.is_default === 'boolean') &&
    (obj.created_at === undefined || typeof obj.created_at === 'string') &&
    (obj.updated_at === undefined || typeof obj.updated_at === 'string') &&
    (obj.default_location === undefined || typeof obj.default_location === 'string') &&
    (obj.default_video_enabled === undefined || typeof obj.default_video_enabled === 'boolean') &&
    (obj.default_reminder_minutes === undefined || Array.isArray(obj.default_reminder_minutes)) &&
    (obj.default_billing_code === undefined || typeof obj.default_billing_code === 'string') &&
    (obj.default_diagnosis_codes === undefined || Array.isArray(obj.default_diagnosis_codes)) &&
    (obj.default_recurring_pattern === undefined || 
      (typeof obj.default_recurring_pattern === 'object' &&
       (obj.default_recurring_pattern.frequency === undefined || 
        ['daily', 'weekly', 'monthly', 'yearly'].includes(obj.default_recurring_pattern.frequency)) &&
       (obj.default_recurring_pattern.interval === undefined || 
        typeof obj.default_recurring_pattern.interval === 'number') &&
       (obj.default_recurring_pattern.daysOfWeek === undefined || 
        Array.isArray(obj.default_recurring_pattern.daysOfWeek))
      )
    )
  );
}