-- Add calendar display time settings to clinicians table
ALTER TABLE public.clinicians 
ADD COLUMN clinician_calendar_start_time time without time zone DEFAULT '08:00:00',
ADD COLUMN clinician_calendar_end_time time without time zone DEFAULT '21:00:00';