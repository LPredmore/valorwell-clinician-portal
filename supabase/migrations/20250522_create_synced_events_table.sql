-- Migration: Create Synced Events Table
-- This migration adds tables and functions for two-way calendar synchronization

-- Create calendar_connections table
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_type TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  calendar_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  last_synced_at TIMESTAMPTZ,
  conflict_strategy TEXT NOT NULL DEFAULT 'manual',
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional',
  sync_frequency TEXT NOT NULL DEFAULT 'hourly',
  sync_range JSONB NOT NULL DEFAULT '{"pastDays": 30, "futureDays": 90}',
  filter_tags TEXT[],
  filter_appointment_types TEXT[],
  auth_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, calendar_type, calendar_id)
);

-- Create synced_events table
CREATE TABLE IF NOT EXISTS synced_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  local_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  external_event_id TEXT NOT NULL,
  external_calendar_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT,
  status TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL,
  last_modified_at TIMESTAMPTZ NOT NULL,
  external_last_modified_at TIMESTAMPTZ NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(connection_id, external_event_id)
);

-- Create sync_conflicts table
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  synced_event_id UUID NOT NULL REFERENCES synced_events(id) ON DELETE CASCADE,
  local_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  external_event_id TEXT NOT NULL,
  conflict_type TEXT NOT NULL,
  local_data JSONB,
  external_data JSONB,
  resolution_strategy TEXT NOT NULL DEFAULT 'manual',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL,
  details JSONB,
  error TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_synced_events_connection_id ON synced_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_local_appointment_id ON synced_events(local_appointment_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_external_event_id ON synced_events(external_event_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_start_at ON synced_events(start_at);
CREATE INDEX IF NOT EXISTS idx_synced_events_end_at ON synced_events(end_at);
CREATE INDEX IF NOT EXISTS idx_synced_events_sync_status ON synced_events(sync_status);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_connection_id ON sync_conflicts(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_synced_event_id ON sync_conflicts(synced_event_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_resolved ON sync_conflicts(resolved);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_status ON calendar_connections(status);

CREATE INDEX IF NOT EXISTS idx_sync_logs_connection_id ON sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_timestamp ON sync_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_logs_event_type ON sync_logs(event_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_connections_updated_at
BEFORE UPDATE ON calendar_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_synced_events_updated_at
BEFORE UPDATE ON synced_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_conflicts_updated_at
BEFORE UPDATE ON sync_conflicts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to log sync events
CREATE OR REPLACE FUNCTION log_sync_event(
  p_connection_id UUID,
  p_event_type TEXT,
  p_details JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO sync_logs (connection_id, event_type, details, error)
  VALUES (p_connection_id, p_event_type, p_details, p_error)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to detect and record conflicts
CREATE OR REPLACE FUNCTION detect_sync_conflict(
  p_synced_event_id UUID,
  p_conflict_type TEXT,
  p_local_data JSONB,
  p_external_data JSONB
)
RETURNS UUID AS $$
DECLARE
  conflict_id UUID;
  connection_id UUID;
  local_appointment_id UUID;
  external_event_id TEXT;
  resolution_strategy TEXT;
BEGIN
  -- Get necessary data from synced event
  SELECT 
    se.connection_id, 
    se.local_appointment_id, 
    se.external_event_id,
    cc.conflict_strategy
  INTO 
    connection_id, 
    local_appointment_id, 
    external_event_id,
    resolution_strategy
  FROM 
    synced_events se
    JOIN calendar_connections cc ON se.connection_id = cc.id
  WHERE 
    se.id = p_synced_event_id;
  
  -- Create conflict record
  INSERT INTO sync_conflicts (
    connection_id,
    synced_event_id,
    local_appointment_id,
    external_event_id,
    conflict_type,
    local_data,
    external_data,
    resolution_strategy
  )
  VALUES (
    connection_id,
    p_synced_event_id,
    local_appointment_id,
    external_event_id,
    p_conflict_type,
    p_local_data,
    p_external_data,
    resolution_strategy
  )
  RETURNING id INTO conflict_id;
  
  -- Update synced event status
  UPDATE synced_events
  SET sync_status = 'conflict'
  WHERE id = p_synced_event_id;
  
  -- Log the conflict
  PERFORM log_sync_event(
    connection_id,
    'conflict_detected',
    jsonb_build_object(
      'conflict_id', conflict_id,
      'conflict_type', p_conflict_type,
      'synced_event_id', p_synced_event_id
    )
  );
  
  RETURN conflict_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to resolve conflicts
CREATE OR REPLACE FUNCTION resolve_sync_conflict(
  p_conflict_id UUID,
  p_resolution TEXT,
  p_resolved_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_record sync_conflicts;
  synced_event_id UUID;
  connection_id UUID;
BEGIN
  -- Get conflict record
  SELECT * INTO conflict_record FROM sync_conflicts WHERE id = p_conflict_id;
  
  IF conflict_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  synced_event_id := conflict_record.synced_event_id;
  connection_id := conflict_record.connection_id;
  
  -- Update conflict record
  UPDATE sync_conflicts
  SET 
    resolved = TRUE,
    resolved_at = NOW(),
    resolution_strategy = p_resolution
  WHERE id = p_conflict_id;
  
  -- Update synced event status
  UPDATE synced_events
  SET 
    sync_status = 'synced',
    last_synced_at = NOW()
  WHERE id = synced_event_id;
  
  -- Log the resolution
  PERFORM log_sync_event(
    connection_id,
    'conflict_resolved',
    jsonb_build_object(
      'conflict_id', p_conflict_id,
      'resolution', p_resolution,
      'synced_event_id', synced_event_id
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_connections
CREATE POLICY "Users can view their own calendar connections"
  ON calendar_connections
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own calendar connections"
  ON calendar_connections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar connections"
  ON calendar_connections
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar connections"
  ON calendar_connections
  FOR DELETE
  USING (user_id = auth.uid());

-- Policies for synced_events
CREATE POLICY "Users can view their own synced events"
  ON synced_events
  FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own synced events"
  ON synced_events
  FOR INSERT
  WITH CHECK (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own synced events"
  ON synced_events
  FOR UPDATE
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own synced events"
  ON synced_events
  FOR DELETE
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Policies for sync_conflicts
CREATE POLICY "Users can view their own sync conflicts"
  ON sync_conflicts
  FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );

-- Policies for sync_logs
CREATE POLICY "Users can view their own sync logs"
  ON sync_logs
  FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM calendar_connections WHERE user_id = auth.uid()
    )
  );