-- Migration: Advanced Scheduling Features
-- This migration adds support for advanced scheduling features that work with WebSocket-based real-time updates

-- Create a table for scheduling preferences
CREATE TABLE IF NOT EXISTS scheduling_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_confirm_threshold INTEGER DEFAULT 24, -- Hours before appointment to auto-confirm
  buffer_between_appointments INTEGER DEFAULT 15, -- Minutes of buffer between appointments
  default_appointment_duration INTEGER DEFAULT 60, -- Default appointment duration in minutes
  max_daily_appointments INTEGER DEFAULT 10, -- Maximum appointments per day
  working_hours JSONB DEFAULT '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}, "saturday": null, "sunday": null}',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  allow_concurrent_appointments BOOLEAN DEFAULT FALSE,
  enable_real_time_updates BOOLEAN DEFAULT TRUE,
  real_time_notification_preferences JSONB DEFAULT '{"appointment_created": true, "appointment_updated": true, "appointment_deleted": true, "synced_event_updated": true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scheduling_preferences_user_id ON scheduling_preferences(user_id);

-- Create a table for appointment templates
CREATE TABLE IF NOT EXISTS appointment_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- Duration in minutes
  color TEXT,
  default_status TEXT NOT NULL DEFAULT 'scheduled',
  default_type TEXT NOT NULL DEFAULT 'therapy_session',
  default_notes TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointment_templates_user_id ON appointment_templates(user_id);

-- Create a table for real-time update notifications
CREATE TABLE IF NOT EXISTS real_time_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_real_time_notifications_user_id ON real_time_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_real_time_notifications_is_read ON real_time_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_real_time_notifications_created_at ON real_time_notifications(created_at);

-- Add new columns to appointments table for advanced scheduling
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES appointment_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buffer_before INTEGER DEFAULT 0, -- Buffer time before appointment in minutes
  ADD COLUMN IF NOT EXISTS buffer_after INTEGER DEFAULT 0, -- Buffer time after appointment in minutes
  ADD COLUMN IF NOT EXISTS is_flexible BOOLEAN DEFAULT FALSE, -- Whether the appointment time is flexible
  ADD COLUMN IF NOT EXISTS flexibility_window JSONB, -- Time window for flexible appointments
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5, -- Priority level (1-10)
  ADD COLUMN IF NOT EXISTS last_real_time_update TIMESTAMPTZ, -- Timestamp of last real-time update
  ADD COLUMN IF NOT EXISTS real_time_update_source TEXT; -- Source of last real-time update

-- Create function to create a notification when an appointment is created, updated, or deleted
CREATE OR REPLACE FUNCTION create_appointment_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_type TEXT;
  notification_message TEXT;
  client_name TEXT;
BEGIN
  -- Determine notification type based on operation
  IF (TG_OP = 'INSERT') THEN
    notification_type := 'appointment_created';
  ELSIF (TG_OP = 'UPDATE') THEN
    notification_type := 'appointment_updated';
  ELSIF (TG_OP = 'DELETE') THEN
    notification_type := 'appointment_deleted';
  END IF;

  -- Get client name
  IF (TG_OP = 'DELETE') THEN
    -- For DELETE operations, we need to get the client name from a join
    SELECT c.client_preferred_name || ' ' || c.client_last_name INTO client_name
    FROM clients c
    WHERE c.id = OLD.client_id;
  ELSE
    -- For INSERT and UPDATE operations, we can get the client name from a join
    SELECT c.client_preferred_name || ' ' || c.client_last_name INTO client_name
    FROM clients c
    WHERE c.id = NEW.client_id;
  END IF;

  -- Default client name if not found
  IF client_name IS NULL THEN
    client_name := 'a client';
  END IF;

  -- Create notification message
  IF notification_type = 'appointment_created' THEN
    notification_message := 'New appointment created for ' || client_name;
  ELSIF notification_type = 'appointment_updated' THEN
    notification_message := 'Appointment updated for ' || client_name;
  ELSIF notification_type = 'appointment_deleted' THEN
    notification_message := 'Appointment cancelled for ' || client_name;
  END IF;

  -- Insert notification
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO real_time_notifications (
      user_id,
      type,
      entity_id,
      entity_type,
      message
    ) VALUES (
      OLD.clinician_id,
      notification_type,
      OLD.id,
      'appointment',
      notification_message
    );
  ELSE
    INSERT INTO real_time_notifications (
      user_id,
      type,
      entity_id,
      entity_type,
      message
    ) VALUES (
      NEW.clinician_id,
      notification_type,
      NEW.id,
      'appointment',
      notification_message
    );
  END IF;

  -- Return the appropriate record based on operation
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for appointment notifications
DROP TRIGGER IF EXISTS appointment_created_notification ON appointments;
CREATE TRIGGER appointment_created_notification
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION create_appointment_notification();

DROP TRIGGER IF EXISTS appointment_updated_notification ON appointments;
CREATE TRIGGER appointment_updated_notification
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION create_appointment_notification();

DROP TRIGGER IF EXISTS appointment_deleted_notification ON appointments;
CREATE TRIGGER appointment_deleted_notification
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION create_appointment_notification();

-- Create function to update last_real_time_update when an appointment is updated
CREATE OR REPLACE FUNCTION update_appointment_real_time_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_real_time_update := NOW();
  NEW.real_time_update_source := current_setting('request.jwt.claims', true)::json->>'sub';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating real-time timestamp
DROP TRIGGER IF EXISTS update_appointment_real_time_timestamp_trigger ON appointments;
CREATE TRIGGER update_appointment_real_time_timestamp_trigger
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_real_time_timestamp();

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all notifications as read
    UPDATE real_time_notifications
    SET 
      is_read = TRUE,
      updated_at = NOW()
    WHERE 
      user_id = p_user_id AND
      is_read = FALSE;
  ELSE
    -- Mark specific notifications as read
    UPDATE real_time_notifications
    SET 
      is_read = TRUE,
      updated_at = NOW()
    WHERE 
      user_id = p_user_id AND
      id = ANY(p_notification_ids) AND
      is_read = FALSE;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  notification_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO notification_count
  FROM real_time_notifications
  WHERE 
    user_id = p_user_id AND
    is_read = FALSE;
    
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE scheduling_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduling_preferences
CREATE POLICY "Users can view their own scheduling preferences"
  ON scheduling_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own scheduling preferences"
  ON scheduling_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own scheduling preferences"
  ON scheduling_preferences
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create policies for appointment_templates
CREATE POLICY "Users can view their own appointment templates"
  ON appointment_templates
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own appointment templates"
  ON appointment_templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own appointment templates"
  ON appointment_templates
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own appointment templates"
  ON appointment_templates
  FOR DELETE
  USING (user_id = auth.uid());

-- Create policies for real_time_notifications
CREATE POLICY "Users can view their own real-time notifications"
  ON real_time_notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own real-time notifications"
  ON real_time_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Insert default scheduling preferences for existing users
INSERT INTO scheduling_preferences (user_id, timezone)
SELECT id, COALESCE(raw_user_meta_data->>'timezone', 'America/Chicago')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM scheduling_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Create default appointment templates for existing users
INSERT INTO appointment_templates (
  user_id,
  name,
  description,
  duration,
  color,
  default_type,
  is_default
)
SELECT 
  id,
  'Standard Session',
  'Standard 50-minute therapy session',
  50,
  '#4CAF50',
  'therapy_session',
  TRUE
FROM auth.users
WHERE id IN (
  SELECT id FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'clinician'
)
AND id NOT IN (
  SELECT user_id FROM appointment_templates
  WHERE name = 'Standard Session'
)
ON CONFLICT DO NOTHING;

-- Add a note in the migration_logs table
INSERT INTO migration_logs (migration_name, details, status)
VALUES (
  '20250525_advanced_scheduling_features',
  jsonb_build_object(
    'description', 'Added advanced scheduling features for WebSocket-based real-time calendar updates',
    'tables_created', ARRAY['scheduling_preferences', 'appointment_templates', 'real_time_notifications'],
    'columns_added', ARRAY['appointments.template_id', 'appointments.buffer_before', 'appointments.buffer_after', 'appointments.is_flexible', 'appointments.flexibility_window', 'appointments.priority', 'appointments.last_real_time_update', 'appointments.real_time_update_source'],
    'functions_created', ARRAY['create_appointment_notification', 'update_appointment_real_time_timestamp', 'mark_notifications_as_read', 'get_unread_notification_count']
  ),
  'completed'
);