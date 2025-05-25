-- Migration for Advanced Scheduling Features
-- This migration adds support for recurring appointments, appointment templates, and conflict handling

-- Create recurring_exceptions table
CREATE TABLE IF NOT EXISTS recurring_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recurring_group_id TEXT NOT NULL,
  exception_date DATE NOT NULL,
  reason TEXT,
  is_rescheduled BOOLEAN DEFAULT FALSE,
  rescheduled_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appointment_templates table
CREATE TABLE IF NOT EXISTS appointment_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  duration INTEGER NOT NULL,
  notes TEXT,
  category TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE,
  default_location TEXT,
  default_video_enabled BOOLEAN DEFAULT FALSE,
  default_reminder_minutes INTEGER[],
  default_billing_code TEXT,
  default_diagnosis_codes TEXT[],
  default_recurring_pattern JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster template lookups
CREATE INDEX IF NOT EXISTS idx_appointment_templates_clinician_id ON appointment_templates(clinician_id);
CREATE INDEX IF NOT EXISTS idx_appointment_templates_category ON appointment_templates(category);
CREATE INDEX IF NOT EXISTS idx_appointment_templates_is_favorite ON appointment_templates(is_favorite);

-- Add index for faster recurring exception lookups
CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_group_id ON recurring_exceptions(recurring_group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_date ON recurring_exceptions(exception_date);

-- Add template_id column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES appointment_templates(id) ON DELETE SET NULL;

-- Add conflict_status column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS conflict_status TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS conflict_resolution TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS conflict_with_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

-- Create function to check for appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  conflicting_appointment_id UUID;
BEGIN
  -- Check for conflicts with other appointments
  SELECT id INTO conflicting_appointment_id
  FROM appointments
  WHERE 
    clinician_id = NEW.clinician_id AND
    id != NEW.id AND
    status NOT IN ('cancelled', 'no_show') AND
    (
      (NEW.start_at, NEW.end_at) OVERLAPS (start_at, end_at)
    )
  LIMIT 1;
  
  -- If there's a conflict, update the conflict status
  IF conflicting_appointment_id IS NOT NULL THEN
    NEW.conflict_status := 'detected';
    NEW.conflict_with_id := conflicting_appointment_id;
  ELSE
    NEW.conflict_status := NULL;
    NEW.conflict_with_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for conflicts on insert or update
DROP TRIGGER IF EXISTS appointment_conflict_check ON appointments;
CREATE TRIGGER appointment_conflict_check
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION check_appointment_conflicts();

-- Create function to generate recurring appointments
CREATE OR REPLACE FUNCTION generate_recurring_appointments(
  base_appointment_id UUID,
  pattern JSONB,
  count INTEGER DEFAULT 10
)
RETURNS SETOF UUID AS $$
DECLARE
  base_appointment appointments;
  new_appointment_id UUID;
  current_date TIMESTAMPTZ;
  interval_value TEXT;
  frequency TEXT;
  interval_num INTEGER;
  end_date DATE;
  end_occurrences INTEGER;
  days_of_week INTEGER[];
  day_of_month INTEGER;
  week_of_month INTEGER;
  day_of_week_month INTEGER;
  month_of_year INTEGER;
  recurring_group_id TEXT;
  i INTEGER;
BEGIN
  -- Get the base appointment
  SELECT * INTO base_appointment FROM appointments WHERE id = base_appointment_id;
  
  -- If no appointment found, return empty
  IF base_appointment IS NULL THEN
    RETURN;
  END IF;
  
  -- Parse the recurring pattern
  frequency := pattern->>'frequency';
  interval_num := (pattern->>'interval')::INTEGER;
  
  -- Generate a recurring group ID if not already set
  IF base_appointment.recurring_group_id IS NULL THEN
    recurring_group_id := 'recurring-' || base_appointment_id::TEXT || '-' || extract(epoch from now())::TEXT;
    
    -- Update the base appointment with the recurring group ID
    UPDATE appointments 
    SET 
      recurring_group_id = recurring_group_id,
      appointment_recurring = pattern
    WHERE id = base_appointment_id;
  ELSE
    recurring_group_id := base_appointment.recurring_group_id;
  END IF;
  
  -- Set the current date to the start of the base appointment
  current_date := base_appointment.start_at;
  
  -- Calculate the duration in minutes
  DECLARE duration INTERVAL;
  BEGIN
    duration := base_appointment.end_at - base_appointment.start_at;
  END;
  
  -- Generate the recurring appointments
  FOR i IN 1..count LOOP
    -- Skip the first occurrence since it's the base appointment
    IF i > 1 THEN
      -- Calculate the next date based on frequency and interval
      IF frequency = 'daily' THEN
        current_date := current_date + (interval_num || ' days')::INTERVAL;
      ELSIF frequency = 'weekly' THEN
        current_date := current_date + (interval_num || ' weeks')::INTERVAL;
      ELSIF frequency = 'monthly' THEN
        current_date := current_date + (interval_num || ' months')::INTERVAL;
      ELSIF frequency = 'yearly' THEN
        current_date := current_date + (interval_num || ' years')::INTERVAL;
      END IF;
      
      -- Insert the new appointment
      INSERT INTO appointments (
        client_id,
        clinician_id,
        start_at,
        end_at,
        type,
        status,
        notes,
        appointment_recurring,
        recurring_group_id,
        template_id
      ) VALUES (
        base_appointment.client_id,
        base_appointment.clinician_id,
        current_date,
        current_date + duration,
        base_appointment.type,
        base_appointment.status,
        base_appointment.notes,
        base_appointment.appointment_recurring,
        recurring_group_id,
        base_appointment.template_id
      ) RETURNING id INTO new_appointment_id;
      
      -- Return the new appointment ID
      RETURN NEXT new_appointment_id;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create function to apply a template to an appointment
CREATE OR REPLACE FUNCTION apply_appointment_template(
  appointment_id UUID,
  template_id UUID
)
RETURNS VOID AS $$
DECLARE
  template appointment_templates;
BEGIN
  -- Get the template
  SELECT * INTO template FROM appointment_templates WHERE id = template_id;
  
  -- If no template found, return
  IF template IS NULL THEN
    RETURN;
  END IF;
  
  -- Update the appointment with the template values
  UPDATE appointments
  SET
    type = template.type,
    notes = COALESCE(notes, template.notes),
    template_id = template.id,
    appointment_recurring = template.default_recurring_pattern
  WHERE id = appointment_id;
  
  -- If the template has a recurring pattern, update the end time based on duration
  IF template.default_recurring_pattern IS NOT NULL THEN
    UPDATE appointments
    SET
      end_at = start_at + (template.duration || ' minutes')::INTERVAL
    WHERE id = appointment_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for the new tables
ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_templates ENABLE ROW LEVEL SECURITY;

-- Policy for recurring_exceptions
CREATE POLICY "Clinicians can view their own recurring exceptions"
  ON recurring_exceptions
  FOR SELECT
  USING (
    recurring_group_id IN (
      SELECT recurring_group_id FROM appointments WHERE clinician_id = auth.uid()
    )
  );

CREATE POLICY "Clinicians can insert their own recurring exceptions"
  ON recurring_exceptions
  FOR INSERT
  WITH CHECK (
    recurring_group_id IN (
      SELECT recurring_group_id FROM appointments WHERE clinician_id = auth.uid()
    )
  );

CREATE POLICY "Clinicians can update their own recurring exceptions"
  ON recurring_exceptions
  FOR UPDATE
  USING (
    recurring_group_id IN (
      SELECT recurring_group_id FROM appointments WHERE clinician_id = auth.uid()
    )
  );

CREATE POLICY "Clinicians can delete their own recurring exceptions"
  ON recurring_exceptions
  FOR DELETE
  USING (
    recurring_group_id IN (
      SELECT recurring_group_id FROM appointments WHERE clinician_id = auth.uid()
    )
  );

-- Policy for appointment_templates
CREATE POLICY "Clinicians can view their own templates"
  ON appointment_templates
  FOR SELECT
  USING (clinician_id = auth.uid());

CREATE POLICY "Clinicians can insert their own templates"
  ON appointment_templates
  FOR INSERT
  WITH CHECK (clinician_id = auth.uid());

CREATE POLICY "Clinicians can update their own templates"
  ON appointment_templates
  FOR UPDATE
  USING (clinician_id = auth.uid());

CREATE POLICY "Clinicians can delete their own templates"
  ON appointment_templates
  FOR DELETE
  USING (clinician_id = auth.uid());