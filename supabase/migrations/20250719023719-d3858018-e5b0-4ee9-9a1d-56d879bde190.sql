-- Fix the clinician creation issue by removing problematic timezone sync trigger and function

-- Drop the problematic timezone sync trigger if it exists
DROP TRIGGER IF EXISTS sync_availability_timezones_trigger ON public.clinicians;

-- Drop the problematic timezone sync function if it exists  
DROP FUNCTION IF EXISTS public.sync_clinician_availability_timezones();

-- Verify the handle_new_user trigger is still working properly
-- (This trigger should remain active to create clinician records)

-- Add a comment to document this fix
COMMENT ON TABLE public.clinicians IS 'Clinicians table - timezone sync trigger removed to fix user creation issues';