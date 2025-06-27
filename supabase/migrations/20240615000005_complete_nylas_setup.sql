
-- Complete Nylas infrastructure setup migration
-- This migration ensures all tables, policies, and permissions are correctly configured

-- Drop any existing problematic policies first
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
DROP POLICY IF EXISTS "clients_own_record" ON clients;
DROP POLICY IF EXISTS "clients_assigned_clinician" ON clients;
DROP POLICY IF EXISTS "clinicians_own_record" ON clinicians;
DROP POLICY IF EXISTS "nylas_connections_own" ON nylas_connections;
DROP POLICY IF EXISTS "scheduler_configs_own" ON nylas_scheduler_configs;
DROP POLICY IF EXISTS "calendar_mappings_own" ON external_calendar_mappings;
DROP POLICY IF EXISTS "sync_logs_own" ON calendar_sync_logs;

-- Create Nylas tables if they don't exist
CREATE TABLE IF NOT EXISTS nylas_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  calendar_ids TEXT[],
  sync_preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email, provider)
);

CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES nylas_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  operation TEXT NOT NULL,
  appointment_id UUID,
  external_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sync_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_calendar_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID,
  connection_id UUID NOT NULL REFERENCES nylas_connections(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  external_calendar_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, connection_id)
);

CREATE TABLE IF NOT EXISTS nylas_scheduler_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinician_id UUID NOT NULL,
  scheduler_id TEXT NOT NULL,
  public_url TEXT,
  config_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinician_id, scheduler_id)
);

-- Enable RLS on all tables
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinicians ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies
CREATE POLICY "nylas_connections_user_access" ON nylas_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "calendar_sync_logs_user_access" ON calendar_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "external_calendar_mappings_user_access" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "nylas_scheduler_configs_user_access" ON nylas_scheduler_configs
  FOR ALL USING (clinician_id = auth.uid());

CREATE POLICY "clients_user_access" ON clients
  FOR ALL USING (id = auth.uid());

CREATE POLICY "clients_therapist_access" ON clients
  FOR SELECT USING (client_assigned_therapist = auth.uid()::text);

CREATE POLICY "clinicians_user_access" ON clinicians
  FOR ALL USING (id = auth.uid());

-- Grant necessary permissions
GRANT ALL ON nylas_connections TO authenticated;
GRANT ALL ON calendar_sync_logs TO authenticated;
GRANT ALL ON external_calendar_mappings TO authenticated;
GRANT ALL ON nylas_scheduler_configs TO authenticated;
GRANT ALL ON clients TO authenticated;
GRANT ALL ON clinicians TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nylas_connections_user_id ON nylas_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_connection_id ON calendar_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_external_calendar_mappings_appointment_id ON external_calendar_mappings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_external_calendar_mappings_connection_id ON external_calendar_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_nylas_scheduler_configs_clinician_id ON nylas_scheduler_configs(clinician_id);

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_nylas_connections_updated_at ON nylas_connections;
CREATE TRIGGER update_nylas_connections_updated_at 
  BEFORE UPDATE ON nylas_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nylas_scheduler_configs_updated_at ON nylas_scheduler_configs;
CREATE TRIGGER update_nylas_scheduler_configs_updated_at 
  BEFORE UPDATE ON nylas_scheduler_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
