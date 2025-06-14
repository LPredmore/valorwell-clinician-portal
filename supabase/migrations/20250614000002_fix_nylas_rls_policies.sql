-- 20250614000002_fix_nylas_rls_policies.sql
-- Comprehensive RLS policy fixes for Nylas integration

-- First, disable RLS temporarily to ensure clean policy application
ALTER TABLE nylas_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinicians DISABLE ROW LEVEL SECURITY;

-- Drop all existing Nylas-related policies to start fresh
DROP POLICY IF EXISTS "nylas_connections_access" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_scheduler_configs_access" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "external_calendar_mappings_access" ON external_calendar_mappings;
DROP POLICY IF EXISTS "calendar_sync_logs_access" ON calendar_sync_logs;
DROP POLICY IF EXISTS "clients_access" ON clients;
DROP POLICY IF EXISTS "clinicians_access" ON clinicians;

-- Create comprehensive RLS policies with proper error handling and permissions

-- 1. Nylas connections policies - ensure users can only access their own connections
CREATE POLICY "nylas_connections_access" ON nylas_connections
  FOR ALL USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- 2. Nylas scheduler configs policies - ensure clinicians can only access their own configs
CREATE POLICY "nylas_scheduler_configs_access" ON nylas_scheduler_configs
  FOR ALL USING (
    auth.uid() = clinician_id
  )
  WITH CHECK (
    auth.uid() = clinician_id
  );

-- 3. External calendar mappings policies - ensure users can only access mappings for their connections
CREATE POLICY "external_calendar_mappings_access" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- 4. Calendar sync logs policies - ensure users can only access logs for their connections
CREATE POLICY "calendar_sync_logs_access" ON calendar_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- 5. Clients table policies - ensure proper access control
CREATE POLICY "clients_access" ON clients
  FOR ALL USING (
    -- Client can access their own record
    auth.uid() = id 
    OR 
    -- Clinician can access clients assigned to them
    auth.uid()::text = client_assigned_therapist
    OR
    -- Admin role can access all clients
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND user_metadata->>'role' = 'admin'
    )
  );

-- 6. Clinicians table policies - ensure proper access control
CREATE POLICY "clinicians_access" ON clinicians
  FOR ALL USING (
    -- Clinician can access their own record
    auth.uid() = id
    OR
    -- Admin role can access all clinicians
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND user_metadata->>'role' = 'admin'
    )
  );

-- Create additional policies for specific operations where needed

-- Allow clients to view clinician details (read-only)
CREATE POLICY "clients_view_clinicians" ON clinicians
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.client_assigned_therapist = clinicians.id::text
      AND clients.id = auth.uid()
    )
  );

-- Re-enable RLS on all tables
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinicians ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON nylas_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON nylas_scheduler_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON external_calendar_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON clinicians TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nylas_connections_user_id ON nylas_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_nylas_scheduler_configs_clinician_id ON nylas_scheduler_configs(clinician_id);
CREATE INDEX IF NOT EXISTS idx_external_calendar_mappings_connection_id ON external_calendar_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_connection_id ON calendar_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_therapist ON clients(client_assigned_therapist);

-- Create a function to verify RLS policies are working correctly
CREATE OR REPLACE FUNCTION verify_nylas_rls_policies()
RETURNS TABLE (
  table_name text,
  policy_name text,
  is_enabled boolean,
  policy_roles text[]
) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    schemaname || '.' || tablename as table_name,
    policyname as policy_name,
    (permissive = 't') as is_enabled,
    roles as policy_roles
  FROM
    pg_policies
  WHERE
    schemaname = 'public' AND
    (tablename LIKE '%nylas%' OR tablename IN ('clients', 'clinicians', 'external_calendar_mappings', 'calendar_sync_logs'))
  ORDER BY
    tablename, policyname;
$$;

-- Grant execute permission on verification function
GRANT EXECUTE ON FUNCTION verify_nylas_rls_policies() TO authenticated;

-- Refresh schema cache to ensure policies take effect immediately
NOTIFY pgrst, 'reload schema';