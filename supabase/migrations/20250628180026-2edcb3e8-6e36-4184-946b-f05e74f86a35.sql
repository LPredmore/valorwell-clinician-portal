
-- First, check how many appointments have NULL timezone
SELECT COUNT(*) as null_timezone_count FROM appointments WHERE appointment_timezone IS NULL;

-- Update all NULL timezone appointments with clinician's timezone
UPDATE appointments 
SET appointment_timezone = c.clinician_time_zone
FROM clinicians c 
WHERE appointments.clinician_id = c.id 
AND appointments.appointment_timezone IS NULL;

-- Verify fix worked
SELECT COUNT(*) as remaining_null_count FROM appointments WHERE appointment_timezone IS NULL;

-- Also check sample of updated appointments
SELECT id, clinician_id, appointment_timezone, start_at, end_at 
FROM appointments 
WHERE appointment_timezone IS NOT NULL 
LIMIT 5;
