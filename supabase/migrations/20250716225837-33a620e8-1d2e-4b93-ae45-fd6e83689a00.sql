-- Email synchronization triggers for clinicians
-- This ensures auth.users.email and clinicians.clinician_email stay in sync

-- Function to sync email from auth.users to clinicians
CREATE OR REPLACE FUNCTION sync_auth_email_to_clinician()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update clinician email when auth user email changes
  UPDATE public.clinicians 
  SET 
    clinician_email = NEW.email,
    updated_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Function to sync email from clinicians to auth.users (for admin operations)
CREATE OR REPLACE FUNCTION sync_clinician_email_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_exists BOOLEAN;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = NEW.id
  ) INTO auth_user_exists;
  
  -- Only update if auth user exists and email actually changed
  IF auth_user_exists AND (OLD.clinician_email IS DISTINCT FROM NEW.clinician_email) THEN
    -- Note: This would require admin privileges to update auth.users directly
    -- In practice, email updates should go through the edge function
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'email_sync_trigger',
      'Email sync triggered from clinicians table',
      jsonb_build_object(
        'clinician_id', NEW.id,
        'old_email', OLD.clinician_email,
        'new_email', NEW.clinician_email,
        'triggered_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS sync_auth_email_to_clinician_trigger ON auth.users;
CREATE TRIGGER sync_auth_email_to_clinician_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_email_to_clinician();

DROP TRIGGER IF EXISTS sync_clinician_email_to_auth_trigger ON public.clinicians;
CREATE TRIGGER sync_clinician_email_to_auth_trigger
  AFTER UPDATE OF clinician_email ON public.clinicians
  FOR EACH ROW
  EXECUTE FUNCTION sync_clinician_email_to_auth();

-- Add constraint to prevent email mismatches (advisory only, since we can't easily join across schemas in constraints)
-- Instead, we'll create a function to validate email consistency
CREATE OR REPLACE FUNCTION validate_clinician_email_consistency()
RETURNS TABLE(clinician_id uuid, auth_email text, clinician_email text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    u.email as auth_email,
    c.clinician_email,
    CASE 
      WHEN u.email = c.clinician_email THEN 'SYNCED'
      ELSE 'MISMATCH'
    END as status
  FROM public.clinicians c
  JOIN auth.users u ON c.id = u.id
  WHERE u.email != c.clinician_email OR u.email IS NULL OR c.clinician_email IS NULL;
END;
$$;