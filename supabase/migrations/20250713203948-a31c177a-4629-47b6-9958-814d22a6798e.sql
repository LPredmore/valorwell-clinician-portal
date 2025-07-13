-- Add client_email, clinician_email, and clinician_name columns to appointments table
ALTER TABLE public.appointments 
ADD COLUMN client_email TEXT,
ADD COLUMN clinician_email TEXT,
ADD COLUMN clinician_name TEXT;