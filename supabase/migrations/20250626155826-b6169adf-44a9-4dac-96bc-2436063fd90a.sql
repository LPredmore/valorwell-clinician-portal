
-- First, let's add a function to help with timezone-aware availability queries
CREATE OR REPLACE FUNCTION get_clinician_availability_instances(
  p_clinician_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_user_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS TABLE (
  day_of_week TEXT,
  start_time TIME,
  end_time TIME,
  timezone TEXT,
  slot_number INTEGER,
  specific_date DATE,
  utc_start_time TIMESTAMPTZ,
  utc_end_time TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_date DATE;
  dow_map TEXT[] := ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  dow_index INTEGER;
  slot_num INTEGER;
BEGIN
  -- Loop through each date in the range
  FOR current_date IN 
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    -- Get day of week (0=Sunday, 1=Monday, etc.)
    dow_index := EXTRACT(DOW FROM current_date);
    
    -- Check each availability slot for this day
    FOR slot_num IN 1..3 LOOP
      -- Use dynamic SQL to check availability for each slot
      EXECUTE format('
        SELECT 
          $1,
          clinician_availability_start_%s_%s,
          clinician_availability_end_%s_%s,
          COALESCE(clinician_availability_timezone_%s_%s, ''America/Chicago''),
          $2,
          $3,
          (($3 || '' '' || clinician_availability_start_%s_%s)::timestamp AT TIME ZONE COALESCE(clinician_availability_timezone_%s_%s, ''America/Chicago''))::timestamptz,
          (($3 || '' '' || clinician_availability_end_%s_%s)::timestamp AT TIME ZONE COALESCE(clinician_availability_timezone_%s_%s, ''America/Chicago''))::timestamptz
        FROM clinicians 
        WHERE id = $4 
          AND clinician_availability_start_%s_%s IS NOT NULL 
          AND clinician_availability_end_%s_%s IS NOT NULL',
        dow_map[dow_index + 1], slot_num,
        dow_map[dow_index + 1], slot_num,
        dow_map[dow_index + 1], slot_num,
        dow_map[dow_index + 1], slot_num,
        dow_map[dow_index + 1], slot_num,
        dow_map[dow_index + 1], slot_num,
        dow_map[dow_index + 1], slot_num,
        dow_map[dow_index + 1], slot_num,
        dow_map[dow_index + 1], slot_num
      )
      INTO day_of_week, start_time, end_time, timezone, slot_number, specific_date, utc_start_time, utc_end_time
      USING dow_map[dow_index + 1], slot_num, current_date, p_clinician_id;
      
      IF start_time IS NOT NULL THEN
        RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Add an index to improve availability queries performance
CREATE INDEX IF NOT EXISTS idx_clinicians_availability_lookup 
ON clinicians USING btree (id) 
WHERE (
  clinician_availability_start_monday_1 IS NOT NULL OR
  clinician_availability_start_tuesday_1 IS NOT NULL OR
  clinician_availability_start_wednesday_1 IS NOT NULL OR
  clinician_availability_start_thursday_1 IS NOT NULL OR
  clinician_availability_start_friday_1 IS NOT NULL OR
  clinician_availability_start_saturday_1 IS NOT NULL OR
  clinician_availability_start_sunday_1 IS NOT NULL
);

-- Create a table to track sync status between our availability and Nylas
CREATE TABLE IF NOT EXISTS availability_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  slot_number INTEGER NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  nylas_event_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'conflict')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinician_id, day_of_week, slot_number)
);

-- Add RLS policies for the sync status table
ALTER TABLE availability_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can manage their own availability sync status"
ON availability_sync_status
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clinicians 
    WHERE clinicians.id = availability_sync_status.clinician_id 
    AND clinicians.id = auth.uid()
  )
);

-- Update trigger for sync status
CREATE OR REPLACE FUNCTION update_availability_sync_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER availability_sync_status_updated_at
  BEFORE UPDATE ON availability_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_sync_status_timestamp();
