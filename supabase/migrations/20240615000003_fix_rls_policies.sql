
-- Fix RLS policies for Nylas integration tables and related tables
-- This migration addresses 406 errors by ensuring proper RLS policy configuration

-- First, let's check and fix the clients table RLS policies
-- The error suggests the clients table query is failing with 406

-- Drop existing problematic policies on clients table if they exist
DROP POLICY IF EXISTS "Users can view their own client data" ON clients;
DROP POLICY IF EXISTS "Clinicians can view their assigned clients" ON clients;
DROP POLICY IF EXISTS "Users can manage their own client data" ON clients;

-- Create comprehensive RLS policies for clients table
-- Allow users to access their own client record
CREATE POLICY "Users can access their own client record" ON clients
  FOR ALL USING (id = auth.uid());

-- Allow clinicians to access clients assigned to them
CREATE POLICY "Clinicians can access assigned clients" ON clients
  FOR SELECT USING (
    client_assigned_therapist = auth.uid()::text
  );

-- For nylas_scheduler_configs, ensure the policy is working correctly
-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs;

-- Create a more robust policy for nylas_scheduler_configs
CREATE POLICY "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs
  FOR ALL USING (clinician_id = auth.uid());

-- Also ensure nylas_connections has proper policies
DROP POLICY IF EXISTS "Users can manage their own connections" ON nylas_connections;

CREATE POLICY "Users can manage their own connections" ON nylas_connections
  FOR ALL USING (user_id = auth.uid());

-- Ensure external_calendar_mappings has proper policies
DROP POLICY IF EXISTS "Users can manage their own mappings" ON external_calendar_mappings;

CREATE POLICY "Users can manage their own mappings" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Ensure calendar_sync_logs has proper policies
DROP POLICY IF EXISTS "Users can view their own sync logs" ON calendar_sync_logs;

CREATE POLICY "Users can view their own sync logs" ON calendar_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Add policy for clinicians table access since it's referenced in queries
-- This ensures the clinician record can be accessed properly
DROP POLICY IF EXISTS "Users can access their own clinician record" ON clinicians;

CREATE POLICY "Users can access their own clinician record" ON clinicians
  FOR SELECT USING (id = auth.uid());

-- Grant necessary permissions to authenticated users
GRANT SELECT ON clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON nylas_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON nylas_scheduler_configs TO authenticated;
GRANT SELECT ON external_calendar_mappings TO authenticated;
GRANT SELECT ON calendar_sync_logs TO authenticated;
GRANT SELECT ON clinicians TO authenticated;

-- Ensure all tables have RLS enabled (they should be, but double-check)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinicians ENABLE ROW LEVEL SECURITY;

-- Add some debugging: create a function to help debug auth context
CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS TABLE (
  current_user_id uuid,
  current_role text,
  is_authenticated boolean
) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.uid() IS NOT NULL as is_authenticated;
$$;

-- Grant execute permission on debug function
GRANT EXECUTE ON FUNCTION debug_auth_context() TO authenticated;

