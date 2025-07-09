
-- Remove appointment_timezone column and associated index
-- This field is no longer needed as appointments are stored in UTC 
-- and displayed using the clinician's current timezone

-- Drop the index first
DROP INDEX IF EXISTS idx_appointment_timezone;

-- Drop the appointment_timezone column
ALTER TABLE appointments 
DROP COLUMN IF EXISTS appointment_timezone;

-- Add comment documenting the change
COMMENT ON TABLE appointments IS 'Appointments table - all times stored in UTC, displayed using clinician current timezone';
