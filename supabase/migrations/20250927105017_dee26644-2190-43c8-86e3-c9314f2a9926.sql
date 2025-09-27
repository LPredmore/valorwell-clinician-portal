-- Phase 2: Schema changes - Convert column from TEXT to UUID
-- Clean up any invalid UUID values first
UPDATE public.clients 
SET client_assigned_therapist = NULL 
WHERE client_assigned_therapist IS NOT NULL 
AND client_assigned_therapist !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Convert column from TEXT to UUID
ALTER TABLE public.clients 
ALTER COLUMN client_assigned_therapist TYPE UUID 
USING client_assigned_therapist::UUID;

-- Add foreign key constraint to ensure data integrity
ALTER TABLE public.clients 
ADD CONSTRAINT fk_client_assigned_therapist 
FOREIGN KEY (client_assigned_therapist) 
REFERENCES public.clinicians(id) 
ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_assigned_therapist 
ON public.clients(client_assigned_therapist) 
WHERE client_assigned_therapist IS NOT NULL;