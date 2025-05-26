
-- Create function to sync all availability timezone columns with main clinician_time_zone
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

-- One-time update to sync all existing records
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

-- Add comment for documentation
COMMENT ON FUNCTION sync_clinician_availability_timezones() IS 
'Automatically synchronizes all 21 clinician availability timezone columns with the main clinician_time_zone field to ensure consistency';

COMMENT ON TRIGGER sync_availability_timezones_trigger ON clinicians IS 
'Ensures all availability timezone columns always match the main clinician_time_zone field';
