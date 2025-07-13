-- Update appointment status constraint to match user requirements
-- Step 1: Drop the existing constraint first
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Step 2: Update existing data
UPDATE public.appointments 
SET status = 'documented' 
WHERE status = 'completed';

UPDATE public.appointments 
SET status = 'cancelled' 
WHERE status = 'blocked';

-- Step 3: Add the new constraint with correct enum values
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status::text = ANY(ARRAY['scheduled'::text, 'documented'::text, 'cancelled'::text, 'no_show'::text]));

-- Update the comment to reflect the new constraint
COMMENT ON CONSTRAINT appointments_status_check ON public.appointments IS 'Ensures appointment status only allows: scheduled, documented, cancelled, no_show';

-- Log this migration
INSERT INTO public.migration_logs (migration_name, description, details)
VALUES (
    '20250713_update_appointment_status_enum_fixed',
    'Updated appointment status constraint to use documented instead of completed',
    jsonb_build_object(
        'action', 'update_constraint',
        'table_name', 'appointments',
        'column_name', 'status',
        'old_values', jsonb_build_array('scheduled', 'completed', 'cancelled', 'no_show', 'blocked'),
        'new_values', jsonb_build_array('scheduled', 'documented', 'cancelled', 'no_show'),
        'data_migration', 'converted completed->documented, blocked->cancelled'
    )
);