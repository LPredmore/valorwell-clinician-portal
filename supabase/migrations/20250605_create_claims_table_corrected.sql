
-- Create claims table for dedicated claims processing
-- This table will replace the use of appointments table for claims submission

CREATE TABLE IF NOT EXISTS public.claims (
  -- Primary key and core identification
  claims_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key relationships
  claims_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  claims_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  claims_clinician_id uuid NOT NULL REFERENCES public.clinicians(id) ON DELETE CASCADE,
  
  -- Core claims information
  claims_service_date date NOT NULL,
  claims_type text NOT NULL DEFAULT 'session', -- 'session', 'phq9', 'gad7', etc.
  claims_status text NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'paid', 'denied', 'processing'
  
  -- Billing and coding fields
  claims_cpt_code text,
  claims_diagnosis_code_pointers text,
  claims_modifiers text[],
  claims_place_of_service_code text,
  claims_billed_amount numeric(10,2),
  
  -- ClaimMD integration fields
  claims_claimmd_id text,
  claims_claimmd_batch_id text,
  claims_last_submission_date timestamp with time zone,
  claims_status_last_checked timestamp with time zone,
  claims_response_json jsonb,
  
  -- ERA (Electronic Remittance Advice) fields
  claims_era_claimmd_id text,
  claims_era_check_eft_number text,
  claims_era_payment_date date,
  
  -- Insurance payment fields
  claims_insurance_paid_amount numeric(10,2),
  claims_insurance_adjustment_amount numeric(10,2),
  claims_insurance_adjustment_details_json jsonb,
  
  -- Patient payment fields
  claims_patient_responsibility_amount numeric(10,2),
  claims_denial_details_json jsonb,
  claims_patient_payment_status text,
  claims_patient_paid_amount numeric(10,2),
  claims_patient_payment_date date,
  claims_stripe_charge_ids text[],
  
  -- Additional billing fields
  claims_billing_notes text,
  claims_requires_billing_review boolean DEFAULT false,
  claims_last_statement_to_patient_date date,
  
  -- Audit and metadata fields
  claims_created_at timestamp with time zone DEFAULT now(),
  claims_updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_claims_appointment_id ON public.claims(claims_appointment_id);
CREATE INDEX IF NOT EXISTS idx_claims_client_id ON public.claims(claims_client_id);
CREATE INDEX IF NOT EXISTS idx_claims_clinician_id ON public.claims(claims_clinician_id);
CREATE INDEX IF NOT EXISTS idx_claims_service_date ON public.claims(claims_service_date);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(claims_status);
CREATE INDEX IF NOT EXISTS idx_claims_type ON public.claims(claims_type);
CREATE INDEX IF NOT EXISTS idx_claims_claimmd_id ON public.claims(claims_claimmd_id);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON public.claims(claims_created_at);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_claims_clinician_status ON public.claims(claims_clinician_id, claims_status);
CREATE INDEX IF NOT EXISTS idx_claims_client_service_date ON public.claims(claims_client_id, claims_service_date);
CREATE INDEX IF NOT EXISTS idx_claims_status_submission_date ON public.claims(claims_status, claims_last_submission_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_claims_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.claims_updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_claims_updated_at 
    BEFORE UPDATE ON public.claims 
    FOR EACH ROW 
    EXECUTE FUNCTION update_claims_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with corrected admin checks

-- Policy for clinicians to see their own claims
CREATE POLICY "Clinicians can view their own claims" ON public.claims
    FOR SELECT USING (
        claims_clinician_id = auth.uid()
    );

-- Policy for clinicians to insert their own claims
CREATE POLICY "Clinicians can insert their own claims" ON public.claims
    FOR INSERT WITH CHECK (
        claims_clinician_id = auth.uid()
    );

-- Policy for clinicians to update their own claims
CREATE POLICY "Clinicians can update their own claims" ON public.claims
    FOR UPDATE USING (
        claims_clinician_id = auth.uid()
    );

-- Policy for admins to view all claims (using admins table)
CREATE POLICY "Admins can view all claims" ON public.claims
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE id = auth.uid()
        )
    );

-- Policy for admins to manage all claims (using admins table)
CREATE POLICY "Admins can manage all claims" ON public.claims
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE id = auth.uid()
        )
    );

-- Add comments to document the table structure
COMMENT ON TABLE public.claims IS 'Dedicated table for claims processing and billing management';
COMMENT ON COLUMN public.claims.claims_id IS 'Unique identifier for each claim record';
COMMENT ON COLUMN public.claims.claims_appointment_id IS 'Reference to the original appointment (nullable for manual claims)';
COMMENT ON COLUMN public.claims.claims_client_id IS 'Reference to the client/patient';
COMMENT ON COLUMN public.claims.claims_clinician_id IS 'Reference to the provider/clinician';
COMMENT ON COLUMN public.claims.claims_service_date IS 'Date when the service was provided';
COMMENT ON COLUMN public.claims.claims_type IS 'Type of claim: session, phq9, gad7, etc.';
COMMENT ON COLUMN public.claims.claims_status IS 'Current status of the claim in the billing workflow';
COMMENT ON COLUMN public.claims.claims_cpt_code IS 'CPT procedure code for the service';
COMMENT ON COLUMN public.claims.claims_billed_amount IS 'Amount billed for this claim';
COMMENT ON COLUMN public.claims.claims_claimmd_id IS 'ClaimMD system identifier for this claim';

-- Log this migration
INSERT INTO public.migration_logs (migration_name, description, details)
VALUES (
    '20250605_create_claims_table_corrected',
    'Created dedicated claims table for billing and claims processing with corrected RLS policies',
    jsonb_build_object(
        'action', 'create_table',
        'table_name', 'claims',
        'features', jsonb_build_array(
            'foreign_key_relationships',
            'comprehensive_indexes',
            'row_level_security',
            'audit_fields',
            'updated_at_trigger'
        )
    )
);
