
/**
 * Client Details Interface
 * Represents complete client information
 */
export interface ClientDetails {
  id: string;
  client_first_name: string;
  client_last_name: string;
  client_preferred_name?: string;
  client_email: string;
  client_phone: string;
  client_status?: string;
  client_date_of_birth?: string;
  client_age?: number;
  client_gender?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_zipcode?: string;
  client_assigned_therapist?: string;
  client_emergency_contact_name?: string;
  client_emergency_contact_phone?: string;
  client_emergency_contact_relationship?: string;
  client_insurance_provider?: string;
  client_insurance_id?: string;
  client_insurance_group?: string;
  client_copay?: number;
  client_deductible?: number;
  client_notes?: string;
  client_intake_date?: string;
  client_last_session_date?: string;
  client_next_session_date?: string;
  client_session_frequency?: string;
  client_treatment_goals?: string;
  client_medications?: string;
  client_allergies?: string;
  client_medical_history?: string;
  client_mental_health_history?: string;
  client_substance_use_history?: string;
  client_family_history?: string;
  client_social_history?: string;
  client_education_history?: string;
  client_employment_history?: string;
  client_legal_history?: string;
  client_trauma_history?: string;
  client_suicide_risk_assessment?: string;
  client_violence_risk_assessment?: string;
  client_treatment_plan?: string;
  client_progress_notes?: string;
  client_discharge_summary?: string;
  client_referral_source?: string;
  client_referral_date?: string;
  client_referral_reason?: string;
  client_consent_forms?: string;
  client_release_forms?: string;
  client_payment_method?: string;
  client_billing_address?: string;
  client_billing_city?: string;
  client_billing_state?: string;
  client_billing_zipcode?: string;
  created_at?: string;
  updated_at?: string;

  // Additional fields for session notes and treatment plans
  client_diagnosis?: string[];
  client_planlength?: string;
  client_treatmentfrequency?: string;
  client_personsinattendance?: string;
  client_appearance?: string;
  client_attitude?: string;
  client_behavior?: string;
  client_speech?: string;
  client_affect?: string;
  client_thoughtprocess?: string;
  client_perception?: string;
  client_orientation?: string;
  client_memoryconcentration?: string;
  client_insightjudgement?: string;
  client_mood?: string;
  client_substanceabuserisk?: string;
  client_suicidalideation?: string;
  client_homicidalideation?: string;
  client_primaryobjective?: string;
  client_intervention1?: string;
  client_intervention2?: string;
  client_secondaryobjective?: string;
  client_intervention3?: string;
  client_intervention4?: string;
  client_tertiaryobjective?: string;
  client_intervention5?: string;
  client_intervention6?: string;
  client_functioning?: string;
  client_prognosis?: string;
  client_progress?: string;
  client_problem?: string;
  client_treatmentgoal?: string;
  client_sessionnarrative?: string;
  client_nexttreatmentplanupdate?: string;
  client_privatenote?: string;
}

/**
 * Partial Client Details Interface
 * For when only basic client info is fetched
 */
export interface PartialClientDetails {
  id: string;
  client_first_name: string;
  client_last_name: string;
  client_preferred_name?: string;
  client_email?: string;
  client_phone?: string;
}

/**
 * Tab Props Interface
 * For client detail tabs
 */
export interface TabProps {
  clientData: ClientDetails | null;
  isEditing: boolean;
  onSave: (data: Partial<ClientDetails>) => void;
  onCancel: () => void;
}

/**
 * Session Note Template Props Interface
 */
export interface SessionNoteTemplateProps {
  clientData: ClientDetails | null;
  clinicianName: string;
  appointment?: any;
  onClose: () => void;
}

/**
 * Insurance Type Options
 */
export const insuranceTypeOptions = [
  'Private Insurance',
  'Medicare',
  'Medicaid',
  'Self-Pay',
  'Worker\'s Compensation',
  'Other'
];

/**
 * Relationship Options
 */
export const relationshipOptions = [
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Friend',
  'Guardian',
  'Other'
];
