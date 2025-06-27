
-- Fix Nylas integration database schema and RLS policies
-- This migration addresses UUID/text type mismatches and RLS policy issues

-- First, let's fix the nylas_connections table structure
ALTER TABLE nylas_connections 
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Ensure the foreign key constraint exists properly
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nylas_connections_user_id_fkey'
    ) THEN
        ALTER TABLE nylas_connections DROP CONSTRAINT nylas_connections_user_id_fkey;
    END IF;
    
    -- Add the proper foreign key constraint
    ALTER TABLE nylas_connections 
    ADD CONSTRAINT nylas_connections_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Fix the nylas_sync_logs table foreign key constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'nylas_sync_logs_connection_id_fkey'
    ) THEN
        ALTER TABLE nylas_sync_logs DROP CONSTRAINT nylas_sync_logs_connection_id_fkey;
    END IF;
    
    -- Add the proper foreign key constraint using text type
    ALTER TABLE nylas_sync_logs 
    ADD CONSTRAINT nylas_sync_logs_connection_id_fkey 
    FOREIGN KEY (connection_id) REFERENCES nylas_connections(id) ON DELETE CASCADE;
END $$;

-- Drop all existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view their own connections" ON nylas_connections;
DROP POLICY IF EXISTS "Users can manage their own connections" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_connections_own" ON nylas_connections;

-- Create a comprehensive RLS policy for nylas_connections
CREATE POLICY "nylas_connections_user_access" ON nylas_connections
  FOR ALL USING (user_id = auth.uid());

-- Drop existing problematic policies on nylas_scheduler_configs
DROP POLICY IF EXISTS "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "scheduler_configs_own" ON nylas_scheduler_configs;

-- Fix nylas_scheduler_configs to use proper UUID foreign key
ALTER TABLE nylas_scheduler_configs 
ALTER COLUMN clinician_id TYPE uuid USING clinician_id::uuid;

-- Create proper RLS policy for scheduler configs
CREATE POLICY "scheduler_configs_user_access" ON nylas_scheduler_configs
  FOR ALL USING (clinician_id = auth.uid());

-- Fix external_calendar_mappings policies
DROP POLICY IF EXISTS "calendar_mappings_own" ON external_calendar_mappings;
DROP POLICY IF EXISTS "Users can manage their own mappings" ON external_calendar_mappings;

CREATE POLICY "calendar_mappings_user_access" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Fix sync logs policies
DROP POLICY IF EXISTS "sync_logs_own" ON nylas_sync_logs;
DROP POLICY IF EXISTS "Users can view their own sync logs" ON nylas_sync_logs;

CREATE POLICY "sync_logs_user_access" ON nylas_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Ensure all tables have RLS enabled
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_sync_logs ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT ALL ON nylas_connections TO authenticated;
GRANT ALL ON nylas_scheduler_configs TO authenticated;
GRANT ALL ON external_calendar_mappings TO authenticated;
GRANT SELECT ON nylas_sync_logs TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nylas_connections_user_id ON nylas_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_nylas_scheduler_configs_clinician_id ON nylas_scheduler_configs(clinician_id);
CREATE INDEX IF NOT EXISTS idx_external_calendar_mappings_connection_id ON external_calendar_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_nylas_sync_logs_connection_id ON nylas_sync_logs(connection_id);
