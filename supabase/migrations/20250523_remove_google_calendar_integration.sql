-- Migration: Remove Google Calendar Integration
-- This migration removes the Google Calendar integration in favor of the new WebSocket-based real-time updates

-- First, drop any existing Google Calendar specific functions
DROP FUNCTION IF EXISTS sync_google_calendar() CASCADE;
DROP FUNCTION IF EXISTS process_google_calendar_webhook() CASCADE;
DROP FUNCTION IF EXISTS handle_google_calendar_auth() CASCADE;
DROP FUNCTION IF EXISTS refresh_google_calendar_token() CASCADE;

-- Remove Google Calendar specific columns from calendar_connections table
-- We're keeping the table itself for other calendar integrations
ALTER TABLE IF EXISTS calendar_connections
  DROP COLUMN IF EXISTS google_refresh_token,
  DROP COLUMN IF EXISTS google_access_token,
  DROP COLUMN IF EXISTS google_token_expiry,
  DROP COLUMN IF EXISTS google_calendar_id,
  DROP COLUMN IF EXISTS google_resource_id,
  DROP COLUMN IF EXISTS google_sync_token,
  DROP COLUMN IF EXISTS google_webhook_id;

-- Update calendar_type enum to remove Google option
-- We can't directly modify enum types in PostgreSQL, so we need to create a new one
-- and update the column to use it
DO $$
BEGIN
  -- Create a new enum type without the Google option
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'calendar_type_enum'
  ) THEN
    -- Create a temporary type
    CREATE TYPE calendar_type_enum_new AS ENUM ('outlook', 'apple', 'generic_ical');
    
    -- Update existing records to use 'generic_ical' instead of 'google'
    UPDATE calendar_connections
    SET calendar_type = 'generic_ical'
    WHERE calendar_type = 'google';
    
    -- Alter the column to use the new type
    ALTER TABLE calendar_connections
      ALTER COLUMN calendar_type TYPE calendar_type_enum_new
      USING calendar_type::text::calendar_type_enum_new;
    
    -- Drop the old type
    DROP TYPE calendar_type_enum;
    
    -- Rename the new type to the original name
    ALTER TYPE calendar_type_enum_new RENAME TO calendar_type_enum;
  END IF;
END$$;

-- Drop Google Calendar webhook table if it exists
DROP TABLE IF EXISTS google_calendar_webhooks;

-- Drop Google Calendar sync logs if they exist
DELETE FROM sync_logs WHERE event_type LIKE 'google_%';

-- Update any existing documentation or comments
COMMENT ON TABLE calendar_connections IS 'Calendar connections for external calendar services (excluding Google Calendar which has been deprecated in favor of WebSocket-based real-time updates)';

-- Add a note in the migration_logs table
INSERT INTO migration_logs (migration_name, details, status)
VALUES (
  '20250523_remove_google_calendar_integration',
  jsonb_build_object(
    'description', 'Removed Google Calendar integration in favor of WebSocket-based real-time updates',
    'tables_modified', ARRAY['calendar_connections'],
    'tables_dropped', ARRAY['google_calendar_webhooks'],
    'functions_dropped', ARRAY['sync_google_calendar', 'process_google_calendar_webhook', 'handle_google_calendar_auth', 'refresh_google_calendar_token']
  ),
  'completed'
);

-- Add notification for users who were using Google Calendar integration
INSERT INTO user_notifications (
  user_id,
  notification_type,
  title,
  message,
  priority,
  action_url,
  expires_at
)
SELECT 
  user_id,
  'system_update',
  'Google Calendar Integration Deprecated',
  'The Google Calendar integration has been replaced with our new real-time calendar updates system. Your calendar will now update instantly without the need for Google Calendar synchronization.',
  'medium',
  '/calendar',
  NOW() + INTERVAL '30 days'
FROM calendar_connections
WHERE calendar_type = 'generic_ical' -- These were converted from 'google' above
AND last_synced_at > NOW() - INTERVAL '90 days'; -- Only notify active users