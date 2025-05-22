
-- Create table for storing synced events from Google Calendar
CREATE TABLE IF NOT EXISTS synced_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinician_id UUID NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    google_calendar_event_id TEXT NOT NULL,
    original_title TEXT NOT NULL,
    original_description TEXT,
    display_title TEXT NOT NULL DEFAULT 'Personal Block',
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_synced_events_clinician_id ON synced_events(clinician_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_google_id ON synced_events(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_date_range ON synced_events(start_at, end_at);

-- Add RLS policies
ALTER TABLE synced_events ENABLE ROW LEVEL SECURITY;

-- Clinicians can view and manage only their own synced events
CREATE POLICY synced_events_policy_clinicians ON synced_events
    USING (clinician_id = auth.uid() OR clinician_id IN (
        SELECT id FROM clinicians WHERE auth_user_id = auth.uid()
    ));

-- Allow clinicians and admins to manage synced events
CREATE POLICY synced_events_policy_admin ON synced_events
    USING (EXISTS (
        SELECT 1 FROM clinicians c
        WHERE c.id = clinician_id AND c.practice_id IN (
            SELECT practice_id FROM clinicians
            WHERE auth_user_id = auth.uid() AND is_admin = TRUE
        )
    ));

-- Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_synced_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER synced_events_updated_at_trigger
BEFORE UPDATE ON synced_events
FOR EACH ROW
EXECUTE FUNCTION update_synced_events_updated_at();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON synced_events TO authenticated;
