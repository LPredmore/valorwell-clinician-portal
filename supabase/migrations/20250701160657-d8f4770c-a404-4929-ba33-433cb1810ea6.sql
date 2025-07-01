
-- Create dedicated blocked_time table for clean separation from appointments
CREATE TABLE public.blocked_time (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id    uuid              NOT NULL REFERENCES public.clinicians(id) ON DELETE CASCADE,
  start_at        timestamptz       NOT NULL,
  end_at          timestamptz       NOT NULL,
  label           text              NOT NULL DEFAULT 'Blocked Time',
  notes           text              NULL,
  timezone        text              NOT NULL DEFAULT 'America/New_York',
  created_at      timestamptz       NOT NULL DEFAULT now(),
  updated_at      timestamptz       NOT NULL DEFAULT now()
);

-- Add RLS policies for blocked_time table
ALTER TABLE public.blocked_time ENABLE ROW LEVEL SECURITY;

-- Clinicians can manage their own blocked time
CREATE POLICY "Clinicians can manage their own blocked time" 
  ON public.blocked_time 
  FOR ALL 
  USING (auth.uid() = clinician_id);

-- Admins can view all blocked time
CREATE POLICY "Admins can view all blocked time" 
  ON public.blocked_time 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admin_email = ((auth.jwt())::json ->> 'email')
  ));

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_blocked_time_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blocked_time_updated_at_trigger
  BEFORE UPDATE ON public.blocked_time
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blocked_time_updated_at();

-- Add validation trigger to prevent overlapping blocked time slots
CREATE OR REPLACE FUNCTION public.validate_blocked_time_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping blocked time slots for the same clinician
  IF EXISTS (
    SELECT 1 FROM public.blocked_time
    WHERE clinician_id = NEW.clinician_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.start_at < end_at AND NEW.end_at > start_at)
      )
  ) THEN
    RAISE EXCEPTION 'Overlapping blocked time slot detected for this clinician. Please choose a different time.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_blocked_time_overlap_trigger
  BEFORE INSERT OR UPDATE ON public.blocked_time
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_blocked_time_overlap();

-- Add helpful indexes
CREATE INDEX idx_blocked_time_clinician_id ON public.blocked_time(clinician_id);
CREATE INDEX idx_blocked_time_start_at ON public.blocked_time(start_at);
CREATE INDEX idx_blocked_time_end_at ON public.blocked_time(end_at);
CREATE INDEX idx_blocked_time_clinician_timerange ON public.blocked_time(clinician_id, start_at, end_at);
