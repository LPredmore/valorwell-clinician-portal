
-- Add enum constraint to appointments table status column
-- This ensures only valid appointment status values are allowed

-- First, create the enum type for appointment status
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM (
        'scheduled',
        'completed', 
        'cancelled',
        'no_show',
        'blocked'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the appointments table to use the enum constraint
-- First, ensure all existing records have valid status values
UPDATE public.appointments 
SET status = 'scheduled' 
WHERE status NOT IN ('scheduled', 'completed', 'cancelled', 'no_show', 'blocked');

-- Add the enum constraint to the status column
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status::text = ANY(ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text, 'blocked'::text]));

-- Add comment to document the constraint
COMMENT ON CONSTRAINT appointments_status_check ON public.appointments IS 'Ensures appointment status only allows: scheduled, completed, cancelled, no_show, blocked';

-- Log this migration
INSERT INTO public.migration_logs (migration_name, description, details)
VALUES (
    '20250605_add_appointment_status_enum',
    'Added enum constraint to appointments table status column',
    jsonb_build_object(
        'action', 'add_constraint',
        'table_name', 'appointments',
        'column_name', 'status',
        'allowed_values', jsonb_build_array('scheduled', 'completed', 'cancelled', 'no_show', 'blocked'),
        'constraint_type', 'check_constraint'
    )
);
