-- Migration to standardize clinician timezone column
BEGIN;

-- Rename clinician_timezone to clinician_time_zone
ALTER TABLE clinicians RENAME COLUMN clinician_timezone TO clinician_time_zone;

-- Convert array values to text (take first element if array)
UPDATE clinicians 
SET clinician_time_zone = (
  CASE 
    WHEN jsonb_typeof(clinician_time_zone::jsonb) = 'array' THEN 
      (clinician_time_zone::jsonb->>0)::text
    ELSE 
      clinician_time_zone::text
  END
);

-- Set default value to match application code
ALTER TABLE clinicians 
ALTER COLUMN clinician_time_zone 
SET DEFAULT 'America/Chicago';

-- Add comment explaining the column
COMMENT ON COLUMN clinicians.clinician_time_zone IS 
'Standardized timezone for clinician (text format). Previously stored as array in clinician_timezone column.';

COMMIT;