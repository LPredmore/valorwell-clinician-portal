
-- Ensure Nylas integration tables are created and properly configured
-- This migration ensures all Nylas tables exist with proper constraints and indexes

-- Create table for storing Nylas calendar connections
CREATE TABLE IF NOT EXISTS nylas_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'google', 'outlook', 'icloud', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  calendar_ids TEXT[], -- Array of connected calendar IDs
  sync_preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email, provider)
);

-- Create table for tracking sync operations
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES nylas_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'inbound', 'outbound'
  operation TEXT NOT NULL, -- 'create', 'update', 'delete'
  appointment_id UUID REFERENCES appointments(id),
  external_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  sync_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for mapping internal appointments to external calendar events
CREATE TABLE IF NOT EXISTS external_calendar_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES nylas_connections(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  external_calendar_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, connection_id)
);

-- Create table for storing Nylas Scheduler configurations
CREATE TABLE IF NOT EXISTS nylas_scheduler_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinician_id UUID NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own connections" ON nylas_connections;
DROP POLICY IF EXISTS "Users can view their own sync logs" ON calendar_sync_logs;
DROP POLICY IF EXISTS "Users can manage their own mappings" ON external_calendar_mappings;
DROP POLICY IF EXISTS "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs;

-- Create RLS policies
CREATE POLICY "Users can manage their own connections" ON nylas_connections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sync logs" ON calendar_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own mappings" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Clinicians can manage their own scheduler configs" ON nylas_scheduler_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clinicians 
      WHERE id = clinician_id AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nylas_connections_user_id ON nylas_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_nylas_connections_active ON nylas_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_connection_id ON calendar_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_appointment_id ON calendar_sync_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_external_calendar_mappings_appointment_id ON external_calendar_mappings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_external_calendar_mappings_connection_id ON external_calendar_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_nylas_scheduler_configs_clinician_id ON nylas_scheduler_configs(clinician_id);
CREATE INDEX IF NOT EXISTS idx_nylas_scheduler_configs_scheduler_id ON nylas_scheduler_configs(scheduler_id);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at timestamp
DROP TRIGGER IF EXISTS update_nylas_connections_updated_at ON nylas_connections;
CREATE TRIGGER update_nylas_connections_updated_at 
  BEFORE UPDATE ON nylas_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nylas_scheduler_configs_updated_at ON nylas_scheduler_configs;
CREATE TRIGGER update_nylas_scheduler_configs_updated_at 
  BEFORE UPDATE ON nylas_scheduler_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
