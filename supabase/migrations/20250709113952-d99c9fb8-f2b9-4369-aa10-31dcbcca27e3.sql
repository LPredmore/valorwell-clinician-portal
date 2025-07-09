-- Update clinician calendar end time to support 24-hour display (midnight to midnight)
UPDATE clinicians 
SET clinician_calendar_end_time = '23:59:00'::time 
WHERE clinician_calendar_end_time = '15:00:00'::time;