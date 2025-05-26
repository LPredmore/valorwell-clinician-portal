
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
}
