
-- Fix Nylas integration database schema and RLS policies
-- This migration addresses UUID/text type mismatches and RLS policy issues
-- Handle policy dependencies correctly

-- First, drop ALL existing RLS policies that might reference columns we need to alter
DROP POLICY IF EXISTS "Users can view their own connections" ON nylas_connections;
DROP POLICY IF EXISTS "Users can manage their own connections" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_connections_own" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_connections_user_access" ON nylas_connections;

DROP POLICY IF EXISTS "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "scheduler_configs_own" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "scheduler_configs_user_access" ON nylas_scheduler_configs;

DROP POLICY IF EXISTS "calendar_mappings_own" ON external_calendar_mappings;
DROP POLICY IF EXISTS "Users can manage their own mappings" ON external_calendar_mappings;
DROP POLICY IF EXISTS "calendar_mappings_user_access" ON external_calendar_mappings;

DROP POLICY IF EXISTS "sync_logs_own" ON nylas_sync_logs;
DROP POLICY IF EXISTS "Users can view their own sync logs" ON nylas_sync_logs;
DROP POLICY IF EXISTS "sync_logs_user_access" ON nylas_sync_logs;

-- Now drop foreign key constraints that might prevent column type changes
DO $$ 
BEGIN
    -- Drop existing foreign key constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nylas_connections_user_id_fkey'
    ) THEN
        ALTER TABLE nylas_connections DROP CONSTRAINT nylas_connections_user_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nylas_sync_logs_connection_id_fkey'
    ) THEN
        ALTER TABLE nylas_sync_logs DROP CONSTRAINT nylas_sync_logs_connection_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nylas_scheduler_configs_clinician_id_fkey'
    ) THEN
        ALTER TABLE nylas_scheduler_configs DROP CONSTRAINT nylas_scheduler_configs_clinician_id_fkey;
    END IF;
END $$;

-- Fix the nylas_connections table structure
DO $$
BEGIN
    -- Only alter if the column exists and is not already UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nylas_connections' 
        AND column_name = 'user_id' 
        AND data_type != 'uuid'
    ) THEN
        ALTER TABLE nylas_connections 
        ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    END IF;
END $$;

-- Fix nylas_scheduler_configs to use proper UUID foreign key
DO $$
BEGIN
    -- Only alter if the column exists and is not already UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nylas_scheduler_configs' 
        AND column_name = 'clinician_id' 
        AND data_type != 'uuid'
    ) THEN
        ALTER TABLE nylas_scheduler_configs 
        ALTER COLUMN clinician_id TYPE uuid USING clinician_id::uuid;
    END IF;
END $$;

-- Add missing columns to nylas_connections if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nylas_connections' AND column_name = 'connector_id') THEN
        ALTER TABLE nylas_connections ADD COLUMN connector_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nylas_connections' AND column_name = 'grant_status') THEN
        ALTER TABLE nylas_connections ADD COLUMN grant_status text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nylas_connections' AND column_name = 'scopes') THEN
        ALTER TABLE nylas_connections ADD COLUMN scopes text[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nylas_connections' AND column_name = 'last_sync_at') THEN
        ALTER TABLE nylas_connections ADD COLUMN last_sync_at timestamptz;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nylas_connections' AND column_name = 'sync_errors') THEN
        ALTER TABLE nylas_connections ADD COLUMN sync_errors jsonb;
    END IF;
END $$;

-- Recreate foreign key constraints with proper types
DO $$ 
BEGIN
    -- Add the proper foreign key constraint for nylas_connections
    ALTER TABLE nylas_connections 
    ADD CONSTRAINT nylas_connections_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Add the proper foreign key constraint for nylas_sync_logs
    ALTER TABLE nylas_sync_logs 
    ADD CONSTRAINT nylas_sync_logs_connection_id_fkey 
    FOREIGN KEY (connection_id) REFERENCES nylas_connections(id) ON DELETE CASCADE;
    
    -- Add foreign key constraint for scheduler configs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nylas_scheduler_configs') THEN
        ALTER TABLE nylas_scheduler_configs 
        ADD CONSTRAINT nylas_scheduler_configs_clinician_id_fkey 
        FOREIGN KEY (clinician_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create comprehensive RLS policies
CREATE POLICY "nylas_connections_user_access" ON nylas_connections
  FOR ALL USING (user_id = auth.uid());

-- Create proper RLS policy for scheduler configs (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nylas_scheduler_configs') THEN
        EXECUTE 'CREATE POLICY "scheduler_configs_user_access" ON nylas_scheduler_configs FOR ALL USING (clinician_id = auth.uid())';
    END IF;
END $$;

-- Fix external_calendar_mappings policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_calendar_mappings') THEN
        EXECUTE 'CREATE POLICY "calendar_mappings_user_access" ON external_calendar_mappings FOR ALL USING (EXISTS (SELECT 1 FROM nylas_connections WHERE id = connection_id AND user_id = auth.uid()))';
    END IF;
END $$;

-- Fix sync logs policies
CREATE POLICY "sync_logs_user_access" ON nylas_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Ensure all tables have RLS enabled
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nylas_scheduler_configs') THEN
        EXECUTE 'ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_calendar_mappings') THEN
        EXECUTE 'ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;
ALTER TABLE nylas_sync_logs ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT ALL ON nylas_connections TO authenticated;
GRANT SELECT ON nylas_sync_logs TO authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nylas_scheduler_configs') THEN
        EXECUTE 'GRANT ALL ON nylas_scheduler_configs TO authenticated';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_calendar_mappings') THEN
        EXECUTE 'GRANT ALL ON external_calendar_mappings TO authenticated';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nylas_connections_user_id ON nylas_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_nylas_sync_logs_connection_id ON nylas_sync_logs(connection_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nylas_scheduler_configs') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_nylas_scheduler_configs_clinician_id ON nylas_scheduler_configs(clinician_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_calendar_mappings') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_external_calendar_mappings_connection_id ON external_calendar_mappings(connection_id)';
    END IF;
END $$;
