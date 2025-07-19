-- Fix the handle_new_user trigger by removing the problematic timezone sync trigger

-- Drop the problematic timezone sync trigger on clinicians table
DROP TRIGGER IF EXISTS sync_clinician_availability_timezones_trigger ON public.clinicians;

-- The handle_new_user function should work without the timezone sync trigger
-- Users can be created successfully now