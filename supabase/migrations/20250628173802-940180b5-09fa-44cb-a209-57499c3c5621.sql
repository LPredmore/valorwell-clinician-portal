
-- Verify the trigger exists and is active
SELECT trigger_name, event_manipulation, action_statement, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'sync_availability_timezones_trigger';

-- Test the trigger functionality with a sample update
-- First, let's see current state of a clinician
SELECT id, clinician_time_zone, 
       clinician_availability_timezone_monday_1,
       clinician_availability_timezone_friday_1
FROM clinicians 
LIMIT 1;
