-- Migration: Real-time Calendar Updates
-- This migration adds functions and triggers for WebSocket-based real-time calendar updates

-- Create function to notify about appointment changes
CREATE OR REPLACE FUNCTION notify_appointment_changes()
RETURNS TRIGGER AS $$
DECLARE
  record_data JSONB;
  notification_type TEXT;
  notification_payload JSONB;
BEGIN
  -- Determine notification type based on operation
  IF (TG_OP = 'INSERT') THEN
    record_data = to_jsonb(NEW);
    notification_type = 'appointment_created';
  ELSIF (TG_OP = 'UPDATE') THEN
    record_data = to_jsonb(NEW);
    notification_type = 'appointment_updated';
  ELSIF (TG_OP = 'DELETE') THEN
    record_data = to_jsonb(OLD);
    notification_type = 'appointment_deleted';
  END IF;

  -- Create notification payload
  notification_payload = jsonb_build_object(
    'type', notification_type,
    'record', record_data,
    'timestamp', CURRENT_TIMESTAMP
  );

  -- Broadcast notification to the specific channel for this clinician
  -- This allows for targeted real-time updates
  IF (TG_OP = 'DELETE') THEN
    PERFORM pg_notify(
      'calendar_updates_' || OLD.clinician_id,
      notification_payload::TEXT
    );
  ELSE
    PERFORM pg_notify(
      'calendar_updates_' || NEW.clinician_id,
      notification_payload::TEXT
    );
  END IF;

  -- Also broadcast to a general channel for admin purposes
  PERFORM pg_notify(
    'calendar_updates',
    notification_payload::TEXT
  );

  -- Return the appropriate record based on operation
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to notify about synced event changes
CREATE OR REPLACE FUNCTION notify_synced_event_changes()
RETURNS TRIGGER AS $$
DECLARE
  record_data JSONB;
  notification_type TEXT;
  notification_payload JSONB;
  user_id UUID;
BEGIN
  -- Determine notification type based on operation
  IF (TG_OP = 'INSERT') THEN
    record_data = to_jsonb(NEW);
    notification_type = 'synced_event_created';
  ELSIF (TG_OP = 'UPDATE') THEN
    record_data = to_jsonb(NEW);
    notification_type = 'synced_event_updated';
  ELSIF (TG_OP = 'DELETE') THEN
    record_data = to_jsonb(OLD);
    notification_type = 'synced_event_deleted';
  END IF;

  -- Get the user_id from the calendar_connections table
  SELECT user_id INTO user_id
  FROM calendar_connections
  WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.connection_id ELSE NEW.connection_id END;

  -- Create notification payload
  notification_payload = jsonb_build_object(
    'type', notification_type,
    'record', record_data,
    'timestamp', CURRENT_TIMESTAMP
  );

  -- Broadcast notification to the specific channel for this user
  IF user_id IS NOT NULL THEN
    PERFORM pg_notify(
      'calendar_updates_' || user_id,
      notification_payload::TEXT
    );
  END IF;

  -- Also broadcast to a general channel for admin purposes
  PERFORM pg_notify(
    'synced_events_updates',
    notification_payload::TEXT
  );

  -- Return the appropriate record based on operation
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for appointments table
DROP TRIGGER IF EXISTS appointments_insert_trigger ON appointments;
CREATE TRIGGER appointments_insert_trigger
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_changes();

DROP TRIGGER IF EXISTS appointments_update_trigger ON appointments;
CREATE TRIGGER appointments_update_trigger
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_changes();

DROP TRIGGER IF EXISTS appointments_delete_trigger ON appointments;
CREATE TRIGGER appointments_delete_trigger
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_changes();

-- Create triggers for synced_events table
DROP TRIGGER IF EXISTS synced_events_insert_trigger ON synced_events;
CREATE TRIGGER synced_events_insert_trigger
  AFTER INSERT ON synced_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_synced_event_changes();

DROP TRIGGER IF EXISTS synced_events_update_trigger ON synced_events;
CREATE TRIGGER synced_events_update_trigger
  AFTER UPDATE ON synced_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_synced_event_changes();

DROP TRIGGER IF EXISTS synced_events_delete_trigger ON synced_events;
CREATE TRIGGER synced_events_delete_trigger
  AFTER DELETE ON synced_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_synced_event_changes();

-- Create function to log WebSocket connections
CREATE OR REPLACE FUNCTION log_websocket_connection(
  p_user_id UUID,
  p_connection_id TEXT,
  p_status TEXT,
  p_client_info JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO websocket_connections (
    user_id,
    connection_id,
    status,
    client_info,
    connected_at
  ) VALUES (
    p_user_id,
    p_connection_id,
    p_status,
    p_client_info,
    CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to update WebSocket connection status
CREATE OR REPLACE FUNCTION update_websocket_connection_status(
  p_connection_id TEXT,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE websocket_connections
  SET 
    status = p_status,
    updated_at = CURRENT_TIMESTAMP,
    disconnected_at = CASE WHEN p_status = 'disconnected' THEN CURRENT_TIMESTAMP ELSE NULL END
  WHERE connection_id = p_connection_id;
END;
$$ LANGUAGE plpgsql;

-- Create websocket_connections table to track active connections
CREATE TABLE IF NOT EXISTS websocket_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  client_info JSONB,
  connected_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  UNIQUE(connection_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_websocket_connections_user_id ON websocket_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_websocket_connections_status ON websocket_connections(status);

-- Enable RLS on websocket_connections
ALTER TABLE websocket_connections ENABLE ROW LEVEL SECURITY;

-- Create policy for websocket_connections
CREATE POLICY "Users can view their own websocket connections"
  ON websocket_connections
  FOR SELECT
  USING (user_id = auth.uid());

-- Create policy for admins to view all websocket connections
CREATE POLICY "Admins can view all websocket connections"
  ON websocket_connections
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create function to clean up stale websocket connections
CREATE OR REPLACE FUNCTION cleanup_stale_websocket_connections()
RETURNS VOID AS $$
BEGIN
  -- Mark connections as disconnected if they've been inactive for more than 1 hour
  UPDATE websocket_connections
  SET 
    status = 'disconnected',
    disconnected_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    status = 'connected' AND
    updated_at < (CURRENT_TIMESTAMP - INTERVAL '1 hour');
    
  -- Delete connections that have been disconnected for more than 7 days
  DELETE FROM websocket_connections
  WHERE 
    status = 'disconnected' AND
    disconnected_at < (CURRENT_TIMESTAMP - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up stale connections
-- This requires pg_cron extension to be enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Schedule job to run every hour
    PERFORM cron.schedule(
      'cleanup-stale-websocket-connections',
      '0 * * * *',
      'SELECT cleanup_stale_websocket_connections()'
    );
  END IF;
END $$;

-- Create function to get active websocket connections for a user
CREATE OR REPLACE FUNCTION get_active_websocket_connections(p_user_id UUID)
RETURNS TABLE (
  connection_id TEXT,
  connected_at TIMESTAMPTZ,
  client_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wc.connection_id,
    wc.connected_at,
    wc.client_info
  FROM 
    websocket_connections wc
  WHERE 
    wc.user_id = p_user_id AND
    wc.status = 'connected'
  ORDER BY 
    wc.connected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to broadcast a message to all active connections for a user
CREATE OR REPLACE FUNCTION broadcast_to_user(
  p_user_id UUID,
  p_message JSONB
)
RETURNS INTEGER AS $$
DECLARE
  connection_count INTEGER := 0;
  connection_record RECORD;
BEGIN
  FOR connection_record IN
    SELECT connection_id
    FROM websocket_connections
    WHERE user_id = p_user_id AND status = 'connected'
  LOOP
    PERFORM pg_notify(
      'user_' || connection_record.connection_id,
      p_message::TEXT
    );
    connection_count := connection_count + 1;
  END LOOP;
  
  RETURN connection_count;
END;
$$ LANGUAGE plpgsql;