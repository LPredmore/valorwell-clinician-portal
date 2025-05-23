-- Migration to remove Google Calendar integration

DO $$
BEGIN
    -- Drop synced_events table
    DROP TABLE IF EXISTS synced_events;
    
    -- Remove google_calendar_event_id from appointments table
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'google_calendar_event_id') THEN
        ALTER TABLE appointments DROP COLUMN google_calendar_event_id;
    END IF;
    
    -- Remove last_synced_at from appointments table
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'appointments' AND column_name = 'last_synced_at') THEN
        ALTER TABLE appointments DROP COLUMN last_synced_at;
    END IF;
    
    -- Remove last_google_sync from clinicians table
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'clinicians' AND column_name = 'last_google_sync') THEN
        ALTER TABLE clinicians DROP COLUMN last_google_sync;
    END IF;

    -- Comment on the appointments table to document the change
    COMMENT ON TABLE appointments IS 'Removed Google Calendar sync fields on 2025-05-23';
END
$$;