-- Add client_name and date_of_session columns to appointments table
ALTER TABLE public.appointments 
ADD COLUMN client_name TEXT,
ADD COLUMN date_of_session DATE;