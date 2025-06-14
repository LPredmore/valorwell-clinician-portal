export interface Client {
  id: string;
  client_first_name: string | null;
  client_last_name: string | null;
  client_preferred_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_date_of_birth: string | null;
  client_age: number | null;
  client_gender: string | null;
  client_gender_identity: string | null;
  client_state: string | null;
  client_time_zone: string | null;
  client_minor: string | null;
  client_status: string | null;
  client_assigned_therapist: string | null;
  client_referral_source: string | null;
  client_self_goal: string | null;
  client_diagnosis: string[] | null;
  client_insurance_company_primary: string | null;
  client_policy_number_primary: string | null;
  client_group_number_primary: string | null;
  client_subscriber_name_primary: string | null;
  client_insurance_type_primary: string | null;
  client_subscriber_dob_primary: string | null;
  client_subscriber_relationship_primary: string | null;
  client_insurance_company_secondary: string | null;
  client_policy_number_secondary: string | null;
  client_group_number_secondary: string | null;
  client_subscriber_name_secondary: string | null;
  client_insurance_type_secondary: string | null;
  client_subscriber_dob_secondary: string | null;
  client_subscriber_relationship_secondary: string | null;
  client_insurance_company_tertiary: string | null;
  client_policy_number_tertiary: string | null;
  client_group_number_tertiary: string | null;
  client_subscriber_name_tertiary: string | null;
  client_insurance_type_tertiary: string | null;
  client_subscriber_dob_tertiary: string | null;
  client_subscriber_relationship_tertiary: string | null;
  client_planlength: string | null;
  client_treatmentfrequency: string | null;
  client_problem: string | null;
  client_treatmentgoal: string | null;
  client_primaryobjective: string | null;
  client_secondaryobjective: string | null;
  client_tertiaryobjective: string | null;
  client_intervention1: string | null;
  client_intervention2: string | null;
  client_intervention3: string | null;
  client_intervention4: string | null;
  client_intervention5: string | null;
  client_intervention6: string | null;
  client_nexttreatmentplanupdate: string | null;
  client_privatenote: string | null;
  // Session note specific fields
  client_appearance: string | null;
  client_attitude: string | null;
  client_behavior: string | null;
  client_speech: string | null;
  client_affect: string | null;
  client_thoughtprocess: string | null;
  client_perception: string | null;
  client_orientation: string | null;
  client_memoryconcentration: string | null;
  client_insightjudgement: string | null;
  client_mood: string | null;
  client_substanceabuserisk: string | null;
  client_suicidalideation: string | null;
  client_homicidalideation: string | null;
  client_functioning: string | null;
  client_prognosis: string | null;
  client_progress: string | null;
  client_sessionnarrative: string | null;
  client_medications: string | null;
  client_personsinattendance: string | null;
  client_currentsymptoms: string | null;
  // VA Insurance related fields
  client_vacoverage: string | null;
  client_champva: string | null;
  client_tricare_beneficiary_category: string | null;
  client_tricare_sponsor_name: string | null;
  client_tricare_sponsor_branch: string | null;
  client_tricare_sponsor_id: string | null;
  client_tricare_plan: string | null;
  client_tricare_region: string | null;
  client_tricare_policy_id: string | null;
  client_tricare_has_referral: string | null;
  client_tricare_referral_number: string | null;
  // Added fields from the schema
  client_recentdischarge: string | null;
  client_branchOS: string | null;
  client_disabilityrating: string | null;
  client_relationship: string | null;
  client_is_profile_complete: string | null;
  client_treatmentplan_startdate: string | null;
  client_temppassword: string | null;
  client_primary_payer_id: string | null;
  client_secondary_payer_id: string | null;
  client_tertiary_payer_id: string | null;
  eligibility_status_primary: string | null;
  eligibility_last_checked_primary: string | null;
  eligibility_claimmd_id_primary: string | null;
  eligibility_response_details_primary_json: any | null;
  eligibility_copay_primary: number | null;
  eligibility_deductible_primary: number | null;
  eligibility_coinsurance_primary_percent: number | null;
  stripe_customer_id: string | null;
  client_city: string | null;
  client_zipcode: string | null;
  client_address: string | null;
  client_zip_code: string | null;
  // Keep existing fields for compatibility
  client_veteran_relationship?: string | null;
  client_situation_explanation?: string | null;
  client_mental_health_referral?: string | null;
  client_other_insurance?: string | null;
  client_champva_agreement?: boolean;
  client_tricare_insurance_agreement?: boolean;
  hasMoreInsurance?: string | null;
  client_has_even_more_insurance?: string | null;
}

export interface Clinician {
  id: string;
  clinician_professional_name: string | null;
  clinician_first_name: string | null;
  clinician_last_name: string | null;
  clinician_time_zone: string | null;
  clinician_nameinsurance: string | null;
}

export interface TabProps {
  isEditing: boolean;
  form: any;
  clientData: Client | null;
  clinicians?: Clinician[];
  handleAddDiagnosis?: () => void;
  handleRemoveDiagnosis?: (index: number) => void;
}

export interface SessionNoteTemplateProps {
  onClose: () => void;
  appointment?: any;
  clinicianName?: string;
  clientData?: Client | null;
}

export const relationshipOptions = ["Self", "Spouse", "Child", "Other"];
export const insuranceTypeOptions = ["Commercial", "Medicaid", "Medicare", "TRICARE", "Other"];
