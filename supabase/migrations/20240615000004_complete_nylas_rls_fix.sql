
-- Complete RLS fix for Nylas integration
-- This migration ensures all policies are properly configured

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view their own client data" ON clients;
DROP POLICY IF EXISTS "Clinicians can view their assigned clients" ON clients;
DROP POLICY IF EXISTS "Users can manage their own client data" ON clients;
DROP POLICY IF EXISTS "Users can access their own client record" ON clients;
DROP POLICY IF EXISTS "Clinicians can access assigned clients" ON clients;
DROP POLICY IF EXISTS "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "Users can manage their own connections" ON nylas_connections;
DROP POLICY IF EXISTS "Users can manage their own mappings" ON external_calendar_mappings;
DROP POLICY IF EXISTS "Users can view their own sync logs" ON calendar_sync_logs;
DROP POLICY IF EXISTS "Users can access their own clinician record" ON clinicians;

-- Ensure RLS is enabled on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for clients table
CREATE POLICY "clients_own_record" ON clients
  FOR ALL USING (id = auth.uid());

CREATE POLICY "clients_assigned_clinician" ON clients
  FOR SELECT USING (client_assigned_therapist = auth.uid()::text);

-- Create policies for clinicians table
CREATE POLICY "clinicians_own_record" ON clinicians
  FOR ALL USING (id = auth.uid());

-- Create policies for nylas_connections table
CREATE POLICY "nylas_connections_own" ON nylas_connections
  FOR ALL USING (user_id = auth.uid());

-- Create policies for nylas_scheduler_configs table
CREATE POLICY "scheduler_configs_own" ON nylas_scheduler_configs
  FOR ALL USING (clinician_id = auth.uid());

-- Create policies for external_calendar_mappings table
CREATE POLICY "calendar_mappings_own" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Create policies for calendar_sync_logs table
CREATE POLICY "sync_logs_own" ON calendar_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON clients TO authenticated;
GRANT ALL ON clinicians TO authenticated;
GRANT ALL ON nylas_connections TO authenticated;
GRANT ALL ON nylas_scheduler_configs TO authenticated;
GRANT ALL ON external_calendar_mappings TO authenticated;
GRANT ALL ON calendar_sync_logs TO authenticated;
