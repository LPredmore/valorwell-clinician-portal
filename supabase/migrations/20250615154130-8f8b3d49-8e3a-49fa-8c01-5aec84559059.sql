
-- Relax the timezone constraint on the appointments table to allow any IANA timezone string.
-- This is necessary to support clinicians and clients in various timezones.
ALTER TABLE public.appointments
ALTER COLUMN appointment_timezone TYPE TEXT;
