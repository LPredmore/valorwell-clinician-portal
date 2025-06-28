
-- Phase 1: Database Timezone Integrity Repair

-- 1.1 Check and fix the database trigger
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE trigger_name = 'sync_availability_timezones_trigger';

-- Drop and recreate the trigger with proper logic
DROP TRIGGER IF EXISTS sync_availability_timezones_trigger ON clinicians;
DROP FUNCTION IF EXISTS sync_clinician_availability_timezones();

-- Create the corrected function
CREATE OR REPLACE FUNCTION sync_clinician_availability_timezones()
RETURNS TRIGGER AS $$
BEGIN
  -- Use clinician_time_zone as the source of truth and sync all 21 availability timezone columns
  -- This ensures all availability timezones always match the main timezone
  
  -- Monday slots
  NEW.clinician_availability_timezone_monday_1 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_monday_2 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_monday_3 := NEW.clinician_time_zone;
  
  -- Tuesday slots
  NEW.clinician_availability_timezone_tuesday_1 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_tuesday_2 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_tuesday_3 := NEW.clinician_time_zone;
  
  -- Wednesday slots
  NEW.clinician_availability_timezone_wednesday_1 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_wednesday_2 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_wednesday_3 := NEW.clinician_time_zone;
  
  -- Thursday slots
  NEW.clinician_availability_timezone_thursday_1 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_thursday_2 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_thursday_3 := NEW.clinician_time_zone;
  
  -- Friday slots
  NEW.clinician_availability_timezone_friday_1 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_friday_2 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_friday_3 := NEW.clinician_time_zone;
  
  -- Saturday slots
  NEW.clinician_availability_timezone_saturday_1 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_saturday_2 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_saturday_3 := NEW.clinician_time_zone;
  
  -- Sunday slots
  NEW.clinician_availability_timezone_sunday_1 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_sunday_2 := NEW.clinician_time_zone;
  NEW.clinician_availability_timezone_sunday_3 := NEW.clinician_time_zone;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync availability timezones on insert or update
CREATE TRIGGER sync_availability_timezones_trigger
  BEFORE INSERT OR UPDATE ON clinicians
  FOR EACH ROW
  EXECUTE FUNCTION sync_clinician_availability_timezones();

-- 1.2 Data Correction - Fix existing timezone mismatches
UPDATE clinicians 
SET 
  clinician_availability_timezone_monday_1 = clinician_time_zone,
  clinician_availability_timezone_monday_2 = clinician_time_zone,
  clinician_availability_timezone_monday_3 = clinician_time_zone,
  clinician_availability_timezone_tuesday_1 = clinician_time_zone,
  clinician_availability_timezone_tuesday_2 = clinician_time_zone,
  clinician_availability_timezone_tuesday_3 = clinician_time_zone,
  clinician_availability_timezone_wednesday_1 = clinician_time_zone,
  clinician_availability_timezone_wednesday_2 = clinician_time_zone,
  clinician_availability_timezone_wednesday_3 = clinician_time_zone,
  clinician_availability_timezone_thursday_1 = clinician_time_zone,
  clinician_availability_timezone_thursday_2 = clinician_time_zone,
  clinician_availability_timezone_thursday_3 = clinician_time_zone,
  clinician_availability_timezone_friday_1 = clinician_time_zone,
  clinician_availability_timezone_friday_2 = clinician_time_zone,
  clinician_availability_timezone_friday_3 = clinician_time_zone,
  clinician_availability_timezone_saturday_1 = clinician_time_zone,
  clinician_availability_timezone_saturday_2 = clinician_time_zone,
  clinician_availability_timezone_saturday_3 = clinician_time_zone,
  clinician_availability_timezone_sunday_1 = clinician_time_zone,
  clinician_availability_timezone_sunday_2 = clinician_time_zone,
  clinician_availability_timezone_sunday_3 = clinician_time_zone
WHERE clinician_time_zone IS NOT NULL;

-- Phase 2: Appointment Timezone Storage Fix
-- 2.2 Backfill existing appointments with correct timezone data
UPDATE appointments 
SET appointment_timezone = c.clinician_time_zone
FROM clinicians c 
WHERE appointments.clinician_id = c.id 
AND appointments.appointment_timezone IS NULL
AND c.clinician_time_zone IS NOT NULL;

-- Add validation function to check timezone data integrity
CREATE OR REPLACE FUNCTION validate_timezone_integrity()
RETURNS TABLE(
  check_type text,
  status text,
  count integer,
  message text
) AS $$
BEGIN
  -- Check for null appointment timezones
  RETURN QUERY
  SELECT 
    'appointment_timezone_null'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    COUNT(*)::integer,
    CASE WHEN COUNT(*) = 0 
      THEN 'All appointments have timezone data'
      ELSE 'Some appointments missing timezone data'
    END::text
  FROM appointments 
  WHERE appointment_timezone IS NULL;
  
  -- Check for timezone sync mismatches
  RETURN QUERY
  SELECT 
    'availability_timezone_sync'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    COUNT(*)::integer,
    CASE WHEN COUNT(*) = 0 
      THEN 'All availability timezones synced'
      ELSE 'Some availability timezones out of sync'
    END::text
  FROM clinicians 
  WHERE clinician_time_zone IS NOT NULL
  AND (
    clinician_availability_timezone_monday_1 != clinician_time_zone OR
    clinician_availability_timezone_tuesday_1 != clinician_time_zone OR
    clinician_availability_timezone_wednesday_1 != clinician_time_zone OR
    clinician_availability_timezone_thursday_1 != clinician_time_zone OR
    clinician_availability_timezone_friday_1 != clinician_time_zone OR
    clinician_availability_timezone_saturday_1 != clinician_time_zone OR
    clinician_availability_timezone_sunday_1 != clinician_time_zone
  );
END;
$$ LANGUAGE plpgsql;

-- Run the validation check
SELECT * FROM validate_timezone_integrity();
