-- Create synced_events table for Google Calendar integration
CREATE TABLE IF NOT EXISTS synced_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinician_id UUID REFERENCES clinicians(id) NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  google_calendar_event_id TEXT,
  original_title TEXT,
  original_description TEXT,
  display_title TEXT DEFAULT 'Personal Block',
  is_busy BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_synced_events_clinician_id ON synced_events(clinician_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_google_id ON synced_events(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_date_range ON synced_events(start_at, end_at);

-- Add RLS policies
ALTER TABLE synced_events ENABLE ROW LEVEL SECURITY;

-- Policy for clinicians to see their own synced events
CREATE POLICY synced_events_clinician_select ON synced_events
  FOR SELECT USING (auth.uid()::text = clinician_id::text);

-- Policy for clinicians to insert their own synced events
CREATE POLICY synced_events_clinician_insert ON synced_events
  FOR INSERT WITH CHECK (auth.uid()::text = clinician_id::text);

-- Policy for clinicians to update their own synced events
CREATE POLICY synced_events_clinician_update ON synced_events
  FOR UPDATE USING (auth.uid()::text = clinician_id::text);

-- Policy for clinicians to delete their own synced events
CREATE POLICY synced_events_clinician_delete ON synced_events
  FOR DELETE USING (auth.uid()::text = clinician_id::text);