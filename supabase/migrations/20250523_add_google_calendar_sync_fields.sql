
-- Migration to add Google Calendar sync fields to appointments and clinicians tables

DO $$
BEGIN
    -- Add google_calendar_event_id to appointments table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'google_calendar_event_id') THEN
        ALTER TABLE appointments ADD COLUMN google_calendar_event_id text;
    END IF;
    
    -- Add last_synced_at to appointments table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointments' AND column_name = 'last_synced_at') THEN
        ALTER TABLE appointments ADD COLUMN last_synced_at timestamp with time zone;
    END IF;
    
    -- Add last_google_sync to clinicians table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'clinicians' AND column_name = 'last_google_sync') THEN
        ALTER TABLE clinicians ADD COLUMN last_google_sync timestamp with time zone;
    END IF;

    -- Comment on the appointments table to document the change
    COMMENT ON TABLE appointments IS 'Added Google Calendar sync fields on 2025-05-23';
END
$$;
