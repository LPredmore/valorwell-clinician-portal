-- Update ALL clinicians to display calendar from midnight to midnight
-- This ensures every clinician gets a full 24-hour calendar view

UPDATE public.clinicians 
SET 
  clinician_calendar_start_time = '00:00:00',
  clinician_calendar_end_time = '23:59:00',
  updated_at = now()
WHERE 
  clinician_calendar_start_time != '00:00:00' 
  OR clinician_calendar_end_time != '23:59:00'
  OR clinician_calendar_start_time IS NULL 
  OR clinician_calendar_end_time IS NULL;

-- Log the update for verification
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % clinician records to midnight-to-midnight calendar display', updated_count;
END $$;