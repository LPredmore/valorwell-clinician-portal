-- Remove UTC timestamp columns for availability storage
-- This migration removes the redundant UTC availability columns and reverts to TIME-based storage

-- Drop the UTC timestamp columns for availability (21 slots total: 7 days × 3 slots each)
ALTER TABLE clinicians 
DROP COLUMN IF EXISTS clinician_availability_start_utc_monday_1,
DROP COLUMN IF EXISTS clinician_availability_end_utc_monday_1,
DROP COLUMN IF EXISTS clinician_availability_start_utc_monday_2,
DROP COLUMN IF EXISTS clinician_availability_end_utc_monday_2,
DROP COLUMN IF EXISTS clinician_availability_start_utc_monday_3,
DROP COLUMN IF EXISTS clinician_availability_end_utc_monday_3,

DROP COLUMN IF EXISTS clinician_availability_start_utc_tuesday_1,
DROP COLUMN IF EXISTS clinician_availability_end_utc_tuesday_1,
DROP COLUMN IF EXISTS clinician_availability_start_utc_tuesday_2,
DROP COLUMN IF EXISTS clinician_availability_end_utc_tuesday_2,
DROP COLUMN IF EXISTS clinician_availability_start_utc_tuesday_3,
DROP COLUMN IF EXISTS clinician_availability_end_utc_tuesday_3,

DROP COLUMN IF EXISTS clinician_availability_start_utc_wednesday_1,
DROP COLUMN IF EXISTS clinician_availability_end_utc_wednesday_1,
DROP COLUMN IF EXISTS clinician_availability_start_utc_wednesday_2,
DROP COLUMN IF EXISTS clinician_availability_end_utc_wednesday_2,
DROP COLUMN IF EXISTS clinician_availability_start_utc_wednesday_3,
DROP COLUMN IF EXISTS clinician_availability_end_utc_wednesday_3,

DROP COLUMN IF EXISTS clinician_availability_start_utc_thursday_1,
DROP COLUMN IF EXISTS clinician_availability_end_utc_thursday_1,
DROP COLUMN IF EXISTS clinician_availability_start_utc_thursday_2,
DROP COLUMN IF EXISTS clinician_availability_end_utc_thursday_2,
DROP COLUMN IF EXISTS clinician_availability_start_utc_thursday_3,
DROP COLUMN IF EXISTS clinician_availability_end_utc_thursday_3,

DROP COLUMN IF EXISTS clinician_availability_start_utc_friday_1,
DROP COLUMN IF EXISTS clinician_availability_end_utc_friday_1,
DROP COLUMN IF EXISTS clinician_availability_start_utc_friday_2,
DROP COLUMN IF EXISTS clinician_availability_end_utc_friday_2,
DROP COLUMN IF EXISTS clinician_availability_start_utc_friday_3,
DROP COLUMN IF EXISTS clinician_availability_end_utc_friday_3,

DROP COLUMN IF EXISTS clinician_availability_start_utc_saturday_1,
DROP COLUMN IF EXISTS clinician_availability_end_utc_saturday_1,
DROP COLUMN IF EXISTS clinician_availability_start_utc_saturday_2,
DROP COLUMN IF EXISTS clinician_availability_end_utc_saturday_2,
DROP COLUMN IF EXISTS clinician_availability_start_utc_saturday_3,
DROP COLUMN IF EXISTS clinician_availability_end_utc_saturday_3,

DROP COLUMN IF EXISTS clinician_availability_start_utc_sunday_1,
DROP COLUMN IF EXISTS clinician_availability_end_utc_sunday_1,
DROP COLUMN IF EXISTS clinician_availability_start_utc_sunday_2,
DROP COLUMN IF EXISTS clinician_availability_end_utc_sunday_2,
DROP COLUMN IF EXISTS clinician_availability_start_utc_sunday_3,
DROP COLUMN IF EXISTS clinician_availability_end_utc_sunday_3;

-- Drop the related index for UTC availability queries
DROP INDEX IF EXISTS idx_clinicians_availability_utc;