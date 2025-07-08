
-- Phase 1: Add UTC timestamp columns for availability storage
-- This migration creates the foundation for proper UTC storage of all calendar events

-- Add UTC timestamp columns for availability (21 slots total: 7 days × 3 slots each)
ALTER TABLE clinicians 
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_monday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_monday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_monday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_monday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_monday_3 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_monday_3 TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_tuesday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_tuesday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_tuesday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_tuesday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_tuesday_3 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_tuesday_3 TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_wednesday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_wednesday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_wednesday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_wednesday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_wednesday_3 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_wednesday_3 TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_thursday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_thursday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_thursday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_thursday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_thursday_3 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_thursday_3 TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_friday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_friday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_friday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_friday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_friday_3 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_friday_3 TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_saturday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_saturday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_saturday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_saturday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_saturday_3 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_saturday_3 TIMESTAMPTZ,

ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_sunday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_sunday_1 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_sunday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_sunday_2 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_start_utc_sunday_3 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinician_availability_end_utc_sunday_3 TIMESTAMPTZ;

-- Migrate existing time-only availability data to UTC timestamps
-- This converts the current time slots to proper UTC timestamps using each clinician's timezone
DO $$
DECLARE
    clinician_record RECORD;
    day_names TEXT[] := ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    day_name TEXT;
    slot_num INTEGER;
    start_time TIME;
    end_time TIME;
    clinician_tz TEXT;
    base_date DATE := '2024-01-01'; -- Use a reference Monday for conversion
    start_utc TIMESTAMPTZ;
    end_utc TIMESTAMPTZ;
    start_col TEXT;
    end_col TEXT;
    start_utc_col TEXT;
    end_utc_col TEXT;
BEGIN
    -- Loop through each clinician
    FOR clinician_record IN 
        SELECT id, clinician_time_zone FROM clinicians 
        WHERE clinician_time_zone IS NOT NULL
    LOOP
        clinician_tz := clinician_record.clinician_time_zone;
        
        -- Loop through each day and slot
        FOREACH day_name IN ARRAY day_names
        LOOP
            FOR slot_num IN 1..3
            LOOP
                -- Build column names
                start_col := 'clinician_availability_start_' || day_name || '_' || slot_num;
                end_col := 'clinician_availability_end_' || day_name || '_' || slot_num;
                start_utc_col := 'clinician_availability_start_utc_' || day_name || '_' || slot_num;
                end_utc_col := 'clinician_availability_end_utc_' || day_name || '_' || slot_num;
                
                -- Get the existing time values
                EXECUTE format('SELECT %I, %I FROM clinicians WHERE id = $1', start_col, end_col)
                INTO start_time, end_time
                USING clinician_record.id;
                
                -- Convert to UTC if both times exist
                IF start_time IS NOT NULL AND end_time IS NOT NULL THEN
                    -- Calculate the date offset for the day of week
                    -- base_date (2024-01-01) is a Monday, so calculate offset
                    CASE day_name
                        WHEN 'monday' THEN base_date := '2024-01-01';
                        WHEN 'tuesday' THEN base_date := '2024-01-02';
                        WHEN 'wednesday' THEN base_date := '2024-01-03';
                        WHEN 'thursday' THEN base_date := '2024-01-04';
                        WHEN 'friday' THEN base_date := '2024-01-05';
                        WHEN 'saturday' THEN base_date := '2024-01-06';
                        WHEN 'sunday' THEN base_date := '2024-01-07';
                    END CASE;
                    
                    -- Convert to UTC timestamps
                    start_utc := (base_date || ' ' || start_time)::TIMESTAMP AT TIME ZONE clinician_tz;
                    end_utc := (base_date || ' ' || end_time)::TIMESTAMP AT TIME ZONE clinician_tz;
                    
                    -- Update the UTC columns
                    EXECUTE format('UPDATE clinicians SET %I = $1, %I = $2 WHERE id = $3', 
                                   start_utc_col, end_utc_col)
                    USING start_utc, end_utc, clinician_record.id;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Remove the hardcoded timezone column from blocked_time since we'll use clinician's timezone
ALTER TABLE blocked_time DROP COLUMN IF EXISTS timezone;

-- Add index for performance on UTC availability queries
CREATE INDEX IF NOT EXISTS idx_clinicians_availability_utc ON clinicians USING btree (
    clinician_availability_start_utc_monday_1,
    clinician_availability_start_utc_tuesday_1,
    clinician_availability_start_utc_wednesday_1,
    clinician_availability_start_utc_thursday_1,
    clinician_availability_start_utc_friday_1,
    clinician_availability_start_utc_saturday_1,
    clinician_availability_start_utc_sunday_1
);
