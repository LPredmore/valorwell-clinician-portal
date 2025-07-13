-- Remove redundant and unused columns from appointments table

-- Drop claims-related columns (now handled by CMS1500_claims table)
ALTER TABLE public.appointments 
DROP COLUMN IF EXISTS cpt_code,
DROP COLUMN IF EXISTS diagnosis_code_pointers,
DROP COLUMN IF EXISTS modifiers,
DROP COLUMN IF EXISTS place_of_service_code,
DROP COLUMN IF EXISTS billed_amount,
DROP COLUMN IF EXISTS claim_status,
DROP COLUMN IF EXISTS claim_claimmd_id,
DROP COLUMN IF EXISTS claim_claimmd_batch_id,
DROP COLUMN IF EXISTS claim_last_submission_date,
DROP COLUMN IF EXISTS claim_status_last_checked,
DROP COLUMN IF EXISTS claim_response_json;

-- Drop ERA (Electronic Remittance Advice) fields
ALTER TABLE public.appointments
DROP COLUMN IF EXISTS era_claimmd_id,
DROP COLUMN IF EXISTS era_check_eft_number,
DROP COLUMN IF EXISTS era_payment_date;

-- Drop insurance payment fields
ALTER TABLE public.appointments
DROP COLUMN IF EXISTS insurance_paid_amount,
DROP COLUMN IF EXISTS insurance_adjustment_amount,
DROP COLUMN IF EXISTS insurance_adjustment_details_json;

-- Drop patient payment fields
ALTER TABLE public.appointments
DROP COLUMN IF EXISTS patient_responsibility_amount,
DROP COLUMN IF EXISTS denial_details_json,
DROP COLUMN IF EXISTS patient_payment_status,
DROP COLUMN IF EXISTS patient_paid_amount,
DROP COLUMN IF EXISTS patient_payment_date,
DROP COLUMN IF EXISTS stripe_charge_ids;

-- Drop additional billing fields
ALTER TABLE public.appointments
DROP COLUMN IF EXISTS billing_notes,
DROP COLUMN IF EXISTS requires_billing_review,
DROP COLUMN IF EXISTS last_statement_to_patient_date;

-- Drop legacy/unused fields
ALTER TABLE public.appointments
DROP COLUMN IF EXISTS date_of_session,
DROP COLUMN IF EXISTS google_calendar_event_id,
DROP COLUMN IF EXISTS claimid,
DROP COLUMN IF EXISTS client_name;