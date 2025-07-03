
-- Fix external_calendar_mappings table schema to match what the edge functions expect
ALTER TABLE external_calendar_mappings 
ADD COLUMN IF NOT EXISTS sync_direction text DEFAULT 'outbound',
ADD COLUMN IF NOT EXISTS last_sync_hash text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update the table to use text for connection_id to match nylas_connections.id
ALTER TABLE external_calendar_mappings 
ALTER COLUMN connection_id TYPE text;

-- Add updated_at trigger for external_calendar_mappings
CREATE OR REPLACE FUNCTION update_external_calendar_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_external_calendar_mappings_updated_at_trigger ON external_calendar_mappings;
CREATE TRIGGER update_external_calendar_mappings_updated_at_trigger
  BEFORE UPDATE ON external_calendar_mappings
  FOR EACH ROW EXECUTE FUNCTION update_external_calendar_mappings_updated_at();

-- Ensure nylas_sync_logs uses text for connection_id to match nylas_connections.id
ALTER TABLE nylas_sync_logs 
ALTER COLUMN connection_id TYPE text;

-- Add missing columns to nylas_sync_logs if they don't exist
ALTER TABLE nylas_sync_logs 
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES appointments(id),
ADD COLUMN IF NOT EXISTS external_event_id text,
ADD COLUMN IF NOT EXISTS operation text,
ADD COLUMN IF NOT EXISTS sync_data jsonb;

-- Update calendar_sync_logs to match the expected schema
ALTER TABLE calendar_sync_logs 
ALTER COLUMN connection_id TYPE text;
