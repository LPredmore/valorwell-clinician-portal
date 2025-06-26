
-- Final comprehensive fix for Nylas RLS policies
-- This migration ensures all policies work correctly for the Nylas integration

-- First, let's disable RLS temporarily to clean up
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinicians DISABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own client data" ON clients;
DROP POLICY IF EXISTS "Clinicians can view their assigned clients" ON clients;
DROP POLICY IF EXISTS "Users can manage their own client data" ON clients;
DROP POLICY IF EXISTS "Users can access their own client record" ON clients;
DROP POLICY IF EXISTS "Clinicians can access assigned clients" ON clients;
DROP POLICY IF EXISTS "clients_own_record" ON clients;
DROP POLICY IF EXISTS "clients_assigned_clinician" ON clients;
DROP POLICY IF EXISTS "clients_user_access" ON clients;
DROP POLICY IF EXISTS "clients_therapist_access" ON clients;

DROP POLICY IF EXISTS "Users can access their own clinician record" ON clinicians;
DROP POLICY IF EXISTS "clinicians_own_record" ON clinicians;
DROP POLICY IF EXISTS "clinicians_user_access" ON clinicians;

DROP POLICY IF EXISTS "Users can manage their own connections" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_connections_own" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_connections_user_access" ON nylas_connections;

DROP POLICY IF EXISTS "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "scheduler_configs_own" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "nylas_scheduler_configs_user_access" ON nylas_scheduler_configs;

DROP POLICY IF EXISTS "Users can manage their own mappings" ON external_calendar_mappings;
DROP POLICY IF EXISTS "calendar_mappings_own" ON external_calendar_mappings;
DROP POLICY IF EXISTS "external_calendar_mappings_user_access" ON external_calendar_mappings;

DROP POLICY IF EXISTS "Users can view their own sync logs" ON calendar_sync_logs;
DROP POLICY IF EXISTS "sync_logs_own" ON calendar_sync_logs;
DROP POLICY IF EXISTS "calendar_sync_logs_user_access" ON calendar_sync_logs;

-- Grant all permissions to authenticated users first
GRANT ALL ON clients TO authenticated;
GRANT ALL ON clinicians TO authenticated;
GRANT ALL ON nylas_connections TO authenticated;
GRANT ALL ON nylas_scheduler_configs TO authenticated;
GRANT ALL ON external_calendar_mappings TO authenticated;
GRANT ALL ON calendar_sync_logs TO authenticated;

-- Re-enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies

-- Clients table policies
CREATE POLICY "clients_access" ON clients
  FOR ALL USING (
    auth.uid() = id OR 
    auth.uid()::text = client_assigned_therapist
  );

-- Clinicians table policies  
CREATE POLICY "clinicians_access" ON clinicians
  FOR ALL USING (auth.uid() = id);

-- Nylas connections policies
CREATE POLICY "nylas_connections_access" ON nylas_connections
  FOR ALL USING (auth.uid() = user_id);

-- Nylas scheduler configs policies
CREATE POLICY "nylas_scheduler_configs_access" ON nylas_scheduler_configs
  FOR ALL USING (auth.uid() = clinician_id);

-- External calendar mappings policies
CREATE POLICY "external_calendar_mappings_access" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Calendar sync logs policies
CREATE POLICY "calendar_sync_logs_access" ON calendar_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_therapist ON clients(client_assigned_therapist);
CREATE INDEX IF NOT EXISTS idx_nylas_connections_user ON nylas_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_nylas_scheduler_configs_clinician ON nylas_scheduler_configs(clinician_id);
CREATE INDEX IF NOT EXISTS idx_external_calendar_mappings_connection ON external_calendar_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_connection ON calendar_sync_logs(connection_id);

-- Ensure sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
