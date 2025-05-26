
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
  client_gender_identity?: string;
  client_time_zone?: string;
  client_minor?: boolean;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_zipcode?: string;
  client_zip_code?: string; // Alternative name used in some components
  client_assigned_therapist?: string;
  client_emergency_contact_name?: string;
  client_emergency_contact_phone?: string;
  client_emergency_contact_relationship?: string;
  client_insurance_provider?: string;
  client_insurance_id?: string;
  client_insurance_group?: string;
  
  // Primary insurance fields
  client_insurance_company_primary?: string;
  client_policy_number_primary?: string;
  client_group_number_primary?: string;
  client_subscriber_name_primary?: string;
  client_insurance_type_primary?: string;
  client_subscriber_dob_primary?: string;
  client_subscriber_relationship_primary?: string;
  
  // Secondary insurance fields
  client_insurance_company_secondary?: string;
  client_policy_number_secondary?: string;
  client_group_number_secondary?: string;
  client_subscriber_name_secondary?: string;
  client_insurance_type_secondary?: string;
  client_subscriber_dob_secondary?: string;
  client_subscriber_relationship_secondary?: string;
  
  // Tertiary insurance fields
  client_insurance_company_tertiary?: string;
  client_policy_number_tertiary?: string;
  client_group_number_tertiary?: string;
  client_subscriber_name_tertiary?: string;
  client_insurance_type_tertiary?: string;
  client_subscriber_dob_tertiary?: string;
  client_subscriber_relationship_tertiary?: string;
  
  // Government insurance fields
  client_vacoverage?: string;
  client_champva?: string;
  client_tricare_has_referral?: boolean;
  client_tricare_beneficiary_category?: string;
  client_tricare_sponsor_name?: string;
  client_tricare_sponsor_branch?: string;
  client_tricare_sponsor_id?: string;
  client_tricare_plan?: string;
  client_tricare_region?: string;
  client_tricare_policy_id?: string;
  client_tricare_referral_number?: string;
  
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
  client_treatmentplan_startdate?: string;
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
  client_self_goal?: string;
  client_is_profile_complete?: boolean;
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
 * Clinician Interface
 * Represents clinician information
 */
export interface Clinician {
  id: string;
  clinician_first_name: string;
  clinician_last_name: string;
  clinician_professional_name?: string;
  clinician_email?: string;
  clinician_time_zone: string;
  clinician_bio?: string;
  clinician_image_url?: string;
  // Availability columns for all days and slots
  [key: string]: any; // For dynamic availability columns
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
  form?: any;
  handleAddDiagnosis?: (diagnosis: string) => void;
  handleRemoveDiagnosis?: (index: number) => void;
  clinicians?: Clinician[];
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
