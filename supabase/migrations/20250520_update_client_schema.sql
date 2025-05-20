
-- This migration updates the clients table schema to match the provided specification

-- Check for missing columns and add them if they don't exist
DO $$
BEGIN
    -- Check and add client_is_profile_complete if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_is_profile_complete') THEN
        ALTER TABLE clients ADD COLUMN client_is_profile_complete text;
    END IF;

    -- Check and add client_treatmentplan_startdate if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_treatmentplan_startdate') THEN
        ALTER TABLE clients ADD COLUMN client_treatmentplan_startdate date;
    END IF;

    -- Check and add client_primary_payer_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_primary_payer_id') THEN
        ALTER TABLE clients ADD COLUMN client_primary_payer_id text;
    END IF;

    -- Check and add client_secondary_payer_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_secondary_payer_id') THEN
        ALTER TABLE clients ADD COLUMN client_secondary_payer_id text;
    END IF;

    -- Check and add client_tertiary_payer_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_tertiary_payer_id') THEN
        ALTER TABLE clients ADD COLUMN client_tertiary_payer_id text;
    END IF;

    -- Check and add eligibility_status_primary if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'eligibility_status_primary') THEN
        ALTER TABLE clients ADD COLUMN eligibility_status_primary text;
    END IF;

    -- Check and add eligibility_last_checked_primary if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'eligibility_last_checked_primary') THEN
        ALTER TABLE clients ADD COLUMN eligibility_last_checked_primary timestamp with time zone;
    END IF;

    -- Check and add eligibility_claimmd_id_primary if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'eligibility_claimmd_id_primary') THEN
        ALTER TABLE clients ADD COLUMN eligibility_claimmd_id_primary text;
    END IF;

    -- Check and add eligibility_response_details_primary_json if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'eligibility_response_details_primary_json') THEN
        ALTER TABLE clients ADD COLUMN eligibility_response_details_primary_json jsonb;
    END IF;

    -- Check and add eligibility_copay_primary if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'eligibility_copay_primary') THEN
        ALTER TABLE clients ADD COLUMN eligibility_copay_primary numeric;
    END IF;

    -- Check and add eligibility_deductible_primary if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'eligibility_deductible_primary') THEN
        ALTER TABLE clients ADD COLUMN eligibility_deductible_primary numeric;
    END IF;

    -- Check and add eligibility_coinsurance_primary_percent if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'eligibility_coinsurance_primary_percent') THEN
        ALTER TABLE clients ADD COLUMN eligibility_coinsurance_primary_percent numeric;
    END IF;

    -- Check and add stripe_customer_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE clients ADD COLUMN stripe_customer_id text;
    END IF;

    -- Check and add client_city if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_city') THEN
        ALTER TABLE clients ADD COLUMN client_city text;
    END IF;

    -- Check and add client_zipcode if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_zipcode') THEN
        ALTER TABLE clients ADD COLUMN client_zipcode text;
    END IF;

    -- Check and add client_address if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_address') THEN
        ALTER TABLE clients ADD COLUMN client_address text;
    END IF;

    -- Check and add client_zip_code if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_zip_code') THEN
        ALTER TABLE clients ADD COLUMN client_zip_code text;
    END IF;

    -- Check and add client_temppassword if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_temppassword') THEN
        ALTER TABLE clients ADD COLUMN client_temppassword text;
    END IF;

    -- Ensure client_diagnosis is of type text[] with default '{}'::text[]
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_diagnosis') THEN
        ALTER TABLE clients ALTER COLUMN client_diagnosis TYPE text[] USING client_diagnosis::text[];
        ALTER TABLE clients ALTER COLUMN client_diagnosis SET DEFAULT '{}'::text[];
    ELSE
        ALTER TABLE clients ADD COLUMN client_diagnosis text[] DEFAULT '{}'::text[];
    END IF;

    -- Ensure client_status has default 'Waiting'::text
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'client_status') THEN
        ALTER TABLE clients ALTER COLUMN client_status SET DEFAULT 'Waiting'::text;
    END IF;

    -- Ensure created_at has NOT NULL and default now()
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'created_at') THEN
        ALTER TABLE clients ALTER COLUMN created_at SET NOT NULL;
        ALTER TABLE clients ALTER COLUMN created_at SET DEFAULT now();
    END IF;

    -- Ensure updated_at has NOT NULL and default now()
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'updated_at') THEN
        ALTER TABLE clients ALTER COLUMN updated_at SET NOT NULL;
        ALTER TABLE clients ALTER COLUMN updated_at SET DEFAULT now();
    END IF;

    -- Ensure role has NOT NULL and default 'client'::app_role
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'role') THEN
        ALTER TABLE clients ALTER COLUMN role SET NOT NULL;
        ALTER TABLE clients ALTER COLUMN role SET DEFAULT 'client'::app_role;
    END IF;

    -- Comment on the migration
    COMMENT ON TABLE clients IS 'Updated schema to match specification on 2025-05-20';
END
$$;
