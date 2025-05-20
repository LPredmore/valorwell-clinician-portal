
-- This migration updates the appointments table schema to match the provided specification

DO $$
BEGIN
    -- Check for missing columns and add them if they don't exist
    
    -- Basic appointment fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'appointment_recurring') THEN
        ALTER TABLE appointments ADD COLUMN appointment_recurring text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'recurring_group_id') THEN
        ALTER TABLE appointments ADD COLUMN recurring_group_id uuid;
    END IF;
    
    -- Billing and coding fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'cpt_code') THEN
        ALTER TABLE appointments ADD COLUMN cpt_code text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'diagnosis_code_pointers') THEN
        ALTER TABLE appointments ADD COLUMN diagnosis_code_pointers text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'modifiers') THEN
        ALTER TABLE appointments ADD COLUMN modifiers text[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'place_of_service_code') THEN
        ALTER TABLE appointments ADD COLUMN place_of_service_code text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'billed_amount') THEN
        ALTER TABLE appointments ADD COLUMN billed_amount numeric;
    END IF;
    
    -- Claims-related fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'claim_status') THEN
        ALTER TABLE appointments ADD COLUMN claim_status text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'claim_claimmd_id') THEN
        ALTER TABLE appointments ADD COLUMN claim_claimmd_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'claim_claimmd_batch_id') THEN
        ALTER TABLE appointments ADD COLUMN claim_claimmd_batch_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'claim_last_submission_date') THEN
        ALTER TABLE appointments ADD COLUMN claim_last_submission_date timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'claim_status_last_checked') THEN
        ALTER TABLE appointments ADD COLUMN claim_status_last_checked timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'claim_response_json') THEN
        ALTER TABLE appointments ADD COLUMN claim_response_json jsonb;
    END IF;
    
    -- ERA (Electronic Remittance Advice) fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'era_claimmd_id') THEN
        ALTER TABLE appointments ADD COLUMN era_claimmd_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'era_check_eft_number') THEN
        ALTER TABLE appointments ADD COLUMN era_check_eft_number text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'era_payment_date') THEN
        ALTER TABLE appointments ADD COLUMN era_payment_date date;
    END IF;
    
    -- Insurance payment fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'insurance_paid_amount') THEN
        ALTER TABLE appointments ADD COLUMN insurance_paid_amount numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'insurance_adjustment_amount') THEN
        ALTER TABLE appointments ADD COLUMN insurance_adjustment_amount numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'insurance_adjustment_details_json') THEN
        ALTER TABLE appointments ADD COLUMN insurance_adjustment_details_json jsonb;
    END IF;
    
    -- Patient payment fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'patient_responsibility_amount') THEN
        ALTER TABLE appointments ADD COLUMN patient_responsibility_amount numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'denial_details_json') THEN
        ALTER TABLE appointments ADD COLUMN denial_details_json jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'patient_payment_status') THEN
        ALTER TABLE appointments ADD COLUMN patient_payment_status text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'patient_paid_amount') THEN
        ALTER TABLE appointments ADD COLUMN patient_paid_amount numeric;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'patient_payment_date') THEN
        ALTER TABLE appointments ADD COLUMN patient_payment_date date;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'stripe_charge_ids') THEN
        ALTER TABLE appointments ADD COLUMN stripe_charge_ids text[];
    END IF;
    
    -- Additional billing fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'billing_notes') THEN
        ALTER TABLE appointments ADD COLUMN billing_notes text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'requires_billing_review') THEN
        ALTER TABLE appointments ADD COLUMN requires_billing_review boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'last_statement_to_patient_date') THEN
        ALTER TABLE appointments ADD COLUMN last_statement_to_patient_date date;
    END IF;
    
    -- Ensure default values are set correctly
    ALTER TABLE appointments 
      ALTER COLUMN id SET DEFAULT gen_random_uuid(),
      ALTER COLUMN status SET DEFAULT 'scheduled'::text,
      ALTER COLUMN created_at SET DEFAULT now(),
      ALTER COLUMN updated_at SET DEFAULT now();
    
    -- Ensure NOT NULL constraints are set correctly
    ALTER TABLE appointments 
      ALTER COLUMN client_id SET NOT NULL,
      ALTER COLUMN clinician_id SET NOT NULL,
      ALTER COLUMN type SET NOT NULL,
      ALTER COLUMN status SET NOT NULL,
      ALTER COLUMN created_at SET NOT NULL,
      ALTER COLUMN updated_at SET NOT NULL,
      ALTER COLUMN start_at SET NOT NULL,
      ALTER COLUMN end_at SET NOT NULL;

    -- Comment on the table
    COMMENT ON TABLE appointments IS 'Updated schema to match specification on 2025-05-20';
END
$$;
