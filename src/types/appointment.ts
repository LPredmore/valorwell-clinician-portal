
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
  type: string;
  status: string;
  video_room_url?: string | null;
  notes?: string | null;
  appointment_recurring?: string | null;
  recurring_group_id?: string | null;
  
  // Client information, structured as an object.
  // This is populated by useAppointments.tsx from the Supabase 'clients' join.
  client?: {
    client_first_name: string; // Should not be null after processing in useAppointments (uses || '')
    client_last_name: string;  // Should not be null after processing
    client_preferred_name: string; // Should not be null after processing
  };
  
  // Convenience field, populated by useAppointments.tsx
  // CONSISTENT FORMAT: Always uses "client_preferred_name client_last_name" when both exist
  // Falls back to "client_first_name client_last_name"
  clientName?: string;
  
  // Billing and coding fields
  cpt_code?: string | null;
  diagnosis_code_pointers?: string | null;
  modifiers?: string[] | null;
  place_of_service_code?: string | null;
  billed_amount?: number | null;
  
  // Claims-related fields
  claim_status?: string | null;
  claim_claimmd_id?: string | null;
  claim_claimmd_batch_id?: string | null;
  claim_last_submission_date?: string | null;
  claim_status_last_checked?: string | null;
  claim_response_json?: any | null;
  
  // ERA (Electronic Remittance Advice) fields
  era_claimmd_id?: string | null;
  era_check_eft_number?: string | null;
  era_payment_date?: string | null;
  
  // Insurance payment fields
  insurance_paid_amount?: number | null;
  insurance_adjustment_amount?: number | null;
  insurance_adjustment_details_json?: any | null;
  
  // Patient payment fields
  patient_responsibility_amount?: number | null;
  denial_details_json?: any | null;
  patient_payment_status?: string | null;
  patient_paid_amount?: number | null;
  patient_payment_date?: string | null;
  stripe_charge_ids?: string[] | null;
  
  // Additional billing fields
  billing_notes?: string | null;
  requires_billing_review?: boolean;
  last_statement_to_patient_date?: string | null;
  
  // Standard audit fields
  created_at?: string;
  updated_at?: string;
}
