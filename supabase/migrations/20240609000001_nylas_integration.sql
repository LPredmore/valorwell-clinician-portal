
-- Create table for storing Nylas calendar connections
CREATE TABLE nylas_connections (
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
CREATE TABLE calendar_sync_logs (
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
CREATE TABLE external_calendar_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES nylas_connections(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  external_calendar_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, connection_id)
);

-- Add RLS policies
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_calendar_mappings ENABLE ROW LEVEL SECURITY;

-- Policies for nylas_connections
CREATE POLICY "Users can manage their own connections" ON nylas_connections
  FOR ALL USING (auth.uid() = user_id);

-- Policies for calendar_sync_logs
CREATE POLICY "Users can view their own sync logs" ON calendar_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Policies for external_calendar_mappings
CREATE POLICY "Users can manage their own mappings" ON external_calendar_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nylas_connections 
      WHERE id = connection_id AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_nylas_connections_user_id ON nylas_connections(user_id);
CREATE INDEX idx_calendar_sync_logs_connection_id ON calendar_sync_logs(connection_id);
CREATE INDEX idx_external_calendar_mappings_appointment_id ON external_calendar_mappings(appointment_id);
CREATE INDEX idx_external_calendar_mappings_connection_id ON external_calendar_mappings(connection_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nylas_connections_updated_at 
  BEFORE UPDATE ON nylas_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
