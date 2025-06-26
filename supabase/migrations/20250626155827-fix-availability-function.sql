
-- Drop and recreate the availability function with better error handling
DROP FUNCTION IF EXISTS public.get_clinician_availability_instances(uuid, date, date, text);

CREATE OR REPLACE FUNCTION public.get_clinician_availability_instances(
  p_clinician_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_user_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS TABLE (
  day_of_week TEXT,
  start_time TIME,
  end_time TIME,
  timezone TEXT,
  slot_number INTEGER,
  specific_date DATE,
  utc_start_time TIMESTAMPTZ,
  utc_end_time TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_date DATE;
  dow_map TEXT[] := ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  dow_index INTEGER;
  clinician_record RECORD;
BEGIN
  -- First check if clinician exists
  SELECT * INTO clinician_record FROM clinicians WHERE id = p_clinician_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Clinician not found: %', p_clinician_id;
    RETURN;
  END IF;
  
  -- Loop through each date in the range
  FOR current_date IN 
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date
  LOOP
    -- Get day of week (0=Sunday, 1=Monday, etc.)
    dow_index := EXTRACT(DOW FROM current_date);
    
    -- Check each availability slot for this day (Monday = slot 1)
    FOR slot_number IN 1..3 LOOP
      DECLARE
        slot_start_time TIME;
        slot_end_time TIME;
        slot_timezone TEXT;
        slot_day TEXT := dow_map[dow_index + 1];
      BEGIN
        -- Get availability data using CASE statements instead of dynamic SQL
        CASE slot_day
          WHEN 'monday' THEN
            CASE slot_number
              WHEN 1 THEN
                slot_start_time := clinician_record.clinician_availability_start_monday_1;
                slot_end_time := clinician_record.clinician_availability_end_monday_1;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_monday_1, 'America/Chicago');
              WHEN 2 THEN
                slot_start_time := clinician_record.clinician_availability_start_monday_2;
                slot_end_time := clinician_record.clinician_availability_end_monday_2;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_monday_2, 'America/Chicago');
              WHEN 3 THEN
                slot_start_time := clinician_record.clinician_availability_start_monday_3;
                slot_end_time := clinician_record.clinician_availability_end_monday_3;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_monday_3, 'America/Chicago');
            END CASE;
          WHEN 'tuesday' THEN
            CASE slot_number
              WHEN 1 THEN
                slot_start_time := clinician_record.clinician_availability_start_tuesday_1;
                slot_end_time := clinician_record.clinician_availability_end_tuesday_1;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_tuesday_1, 'America/Chicago');
              WHEN 2 THEN
                slot_start_time := clinician_record.clinician_availability_start_tuesday_2;
                slot_end_time := clinician_record.clinician_availability_end_tuesday_2;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_tuesday_2, 'America/Chicago');
              WHEN 3 THEN
                slot_start_time := clinician_record.clinician_availability_start_tuesday_3;
                slot_end_time := clinician_record.clinician_availability_end_tuesday_3;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_tuesday_3, 'America/Chicago');
            END CASE;
          WHEN 'wednesday' THEN
            CASE slot_number
              WHEN 1 THEN
                slot_start_time := clinician_record.clinician_availability_start_wednesday_1;
                slot_end_time := clinician_record.clinician_availability_end_wednesday_1;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_wednesday_1, 'America/Chicago');
              WHEN 2 THEN
                slot_start_time := clinician_record.clinician_availability_start_wednesday_2;
                slot_end_time := clinician_record.clinician_availability_end_wednesday_2;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_wednesday_2, 'America/Chicago');
              WHEN 3 THEN
                slot_start_time := clinician_record.clinician_availability_start_wednesday_3;
                slot_end_time := clinician_record.clinician_availability_end_wednesday_3;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_wednesday_3, 'America/Chicago');
            END CASE;
          WHEN 'thursday' THEN
            CASE slot_number
              WHEN 1 THEN
                slot_start_time := clinician_record.clinician_availability_start_thursday_1;
                slot_end_time := clinician_record.clinician_availability_end_thursday_1;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_thursday_1, 'America/Chicago');
              WHEN 2 THEN
                slot_start_time := clinician_record.clinician_availability_start_thursday_2;
                slot_end_time := clinician_record.clinician_availability_end_thursday_2;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_thursday_2, 'America/Chicago');
              WHEN 3 THEN
                slot_start_time := clinician_record.clinician_availability_start_thursday_3;
                slot_end_time := clinician_record.clinician_availability_end_thursday_3;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_thursday_3, 'America/Chicago');
            END CASE;
          WHEN 'friday' THEN
            CASE slot_number
              WHEN 1 THEN
                slot_start_time := clinician_record.clinician_availability_start_friday_1;
                slot_end_time := clinician_record.clinician_availability_end_friday_1;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_friday_1, 'America/Chicago');
              WHEN 2 THEN
                slot_start_time := clinician_record.clinician_availability_start_friday_2;
                slot_end_time := clinician_record.clinician_availability_end_friday_2;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_friday_2, 'America/Chicago');
              WHEN 3 THEN
                slot_start_time := clinician_record.clinician_availability_start_friday_3;
                slot_end_time := clinician_record.clinician_availability_end_friday_3;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_friday_3, 'America/Chicago');
            END CASE;
          WHEN 'saturday' THEN
            CASE slot_number
              WHEN 1 THEN
                slot_start_time := clinician_record.clinician_availability_start_saturday_1;
                slot_end_time := clinician_record.clinician_availability_end_saturday_1;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_saturday_1, 'America/Chicago');
              WHEN 2 THEN
                slot_start_time := clinician_record.clinician_availability_start_saturday_2;
                slot_end_time := clinician_record.clinician_availability_end_saturday_2;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_saturday_2, 'America/Chicago');
              WHEN 3 THEN
                slot_start_time := clinician_record.clinician_availability_start_saturday_3;
                slot_end_time := clinician_record.clinician_availability_end_saturday_3;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_saturday_3, 'America/Chicago');
            END CASE;
          WHEN 'sunday' THEN
            CASE slot_number
              WHEN 1 THEN
                slot_start_time := clinician_record.clinician_availability_start_sunday_1;
                slot_end_time := clinician_record.clinician_availability_end_sunday_1;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_sunday_1, 'America/Chicago');
              WHEN 2 THEN
                slot_start_time := clinician_record.clinician_availability_start_sunday_2;
                slot_end_time := clinician_record.clinician_availability_end_sunday_2;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_sunday_2, 'America/Chicago');
              WHEN 3 THEN
                slot_start_time := clinician_record.clinician_availability_start_sunday_3;
                slot_end_time := clinician_record.clinician_availability_end_sunday_3;
                slot_timezone := COALESCE(clinician_record.clinician_availability_timezone_sunday_3, 'America/Chicago');
            END CASE;
        END CASE;
        
        -- If we have valid availability data, return it
        IF slot_start_time IS NOT NULL AND slot_end_time IS NOT NULL THEN
          day_of_week := slot_day;
          start_time := slot_start_time;
          end_time := slot_end_time;
          timezone := slot_timezone;
          specific_date := current_date;
          
          -- Calculate UTC timestamps
          utc_start_time := ((current_date || ' ' || slot_start_time)::timestamp AT TIME ZONE slot_timezone)::timestamptz;
          utc_end_time := ((current_date || ' ' || slot_end_time)::timestamp AT TIME ZONE slot_timezone)::timestamptz;
          
          RETURN NEXT;
        END IF;
      END;
    END LOOP;
  END LOOP;
END;
$$;
