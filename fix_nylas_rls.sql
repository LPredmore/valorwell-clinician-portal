-- This script fixes RLS policies for Nylas integration tables
-- Run this if you find issues with the RLS policies

-- First, disable RLS temporarily to clean up
ALTER TABLE nylas_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can manage their own connections" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_connections_own" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_connections_user_access" ON nylas_connections;
DROP POLICY IF EXISTS "nylas_connections_access" ON nylas_connections;

DROP POLICY IF EXISTS "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "scheduler_configs_own" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "nylas_scheduler_configs_user_access" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "nylas_scheduler_configs_access" ON nylas_scheduler_configs;

DROP POLICY IF EXISTS "Users can manage their own mappings" ON external_calendar_mappings;
DROP POLICY IF EXISTS "calendar_mappings_own" ON external_calendar_mappings;
DROP POLICY IF EXISTS "external_calendar_mappings_user_access" ON external_calendar_mappings;
DROP POLICY IF EXISTS "external_calendar_mappings_access" ON external_calendar_mappings;

DROP POLICY IF EXISTS "Users can view their own sync logs" ON calendar_sync_logs;
DROP POLICY IF EXISTS "sync_logs_own" ON calendar_sync_logs;
DROP POLICY IF EXISTS "calendar_sync_logs_user_access" ON calendar_sync_logs;
DROP POLICY IF EXISTS "calendar_sync_logs_access" ON calendar_sync_logs;

-- Grant all permissions to authenticated users
GRANT ALL ON nylas_connections TO authenticated;
GRANT ALL ON nylas_scheduler_configs TO authenticated;
GRANT ALL ON external_calendar_mappings TO authenticated;
GRANT ALL ON calendar_sync_logs TO authenticated;

-- Re-enable RLS
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies

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

-- Ensure sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';