
-- Complete Nylas infrastructure setup
-- This migration ensures all required tables, policies, and permissions are properly configured

-- First, ensure we have a clean slate by dropping existing tables if they exist
DROP TABLE IF EXISTS calendar_sync_logs CASCADE;
DROP TABLE IF EXISTS external_calendar_mappings CASCADE;
DROP TABLE IF EXISTS nylas_scheduler_configs CASCADE;
DROP TABLE IF EXISTS nylas_connections CASCADE;

-- Create nylas_connections table with proper structure
CREATE TABLE nylas_connections (
  id TEXT PRIMARY KEY, -- Nylas grant_id as primary key
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_ids TEXT[] DEFAULT '{}',
  connector_id TEXT,
  grant_status TEXT DEFAULT 'valid',
  scopes TEXT[] DEFAULT '{}',
  sync_preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email, provider)
);

-- Create nylas_scheduler_configs table
CREATE TABLE nylas_scheduler_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduler_id TEXT NOT NULL,
  public_url TEXT,
  config_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinician_id, scheduler_id)
);

-- Create external_calendar_mappings table
CREATE TABLE external_calendar_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES nylas_connections(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  external_calendar_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, connection_id)
);

-- Create calendar_sync_logs table
CREATE TABLE calendar_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES nylas_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('inbound', 'outbound')),
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  appointment_id UUID REFERENCES appointments(id),
  external_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  sync_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE nylas_scheduler_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create simple, effective RLS policies
CREATE POLICY "nylas_connections_user_policy" ON nylas_connections
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "nylas_scheduler_configs_user_policy" ON nylas_scheduler_configs
  FOR ALL USING (clinician_id = auth.uid());

CREATE POLICY "external_calendar_mappings_user_policy" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_sync_logs_user_policy" ON calendar_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT ALL ON nylas_connections TO authenticated;
GRANT ALL ON nylas_scheduler_configs TO authenticated;
GRANT ALL ON external_calendar_mappings TO authenticated;
GRANT SELECT ON calendar_sync_logs TO authenticated;

-- Create indexes for performance
CREATE INDEX idx_nylas_connections_user_id ON nylas_connections(user_id);
CREATE INDEX idx_nylas_connections_is_active ON nylas_connections(is_active);
CREATE INDEX idx_nylas_scheduler_configs_clinician_id ON nylas_scheduler_configs(clinician_id);
CREATE INDEX idx_external_calendar_mappings_connection_id ON external_calendar_mappings(connection_id);
CREATE INDEX idx_external_calendar_mappings_appointment_id ON external_calendar_mappings(appointment_id);
CREATE INDEX idx_calendar_sync_logs_connection_id ON calendar_sync_logs(connection_id);
CREATE INDEX idx_calendar_sync_logs_status ON calendar_sync_logs(status);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nylas_connections_updated_at BEFORE UPDATE ON nylas_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nylas_scheduler_configs_updated_at BEFORE UPDATE ON nylas_scheduler_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
