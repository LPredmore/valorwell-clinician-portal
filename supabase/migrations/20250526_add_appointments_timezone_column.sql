
-- Add appointments_timezone column to store timezone information for appointments
-- This column will store IANA timezone identifiers (e.g., 'America/New_York', 'Europe/London')

ALTER TABLE appointments 
ADD COLUMN appointments_timezone text;

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN appointments.appointments_timezone IS 'IANA timezone identifier for the timezone in which the appointment was scheduled. Used to display appointment times correctly regardless of user location.';

-- Create an index on the timezone column for better query performance if needed
-- (Optional, but could be useful for timezone-based filtering in the future)
CREATE INDEX IF NOT EXISTS idx_appointments_timezone 
ON appointments(appointments_timezone);

-- Note: We're making this column nullable because:
-- 1. Existing appointments don't have timezone data
-- 2. The application code already has fallback logic to handle null values
-- 3. This allows for a smooth migration without breaking existing data

-- The application will:
-- - Use the saved timezone for appointments that have it
-- - Fall back to the user's current timezone for appointments without it
-- - Save the timezone for all new appointments going forward
