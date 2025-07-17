-- Enhanced logging for email sync triggers and audit trail

-- Update the sync trigger function to include more detailed logging
CREATE OR REPLACE FUNCTION sync_clinician_email_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_exists BOOLEAN;
  current_auth_email TEXT;
BEGIN
  -- Check if user exists in auth.users and get current email
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.id), 
         (SELECT email FROM auth.users WHERE id = NEW.id LIMIT 1)
  INTO auth_user_exists, current_auth_email;
  
  -- Log the trigger activation with enhanced details
  INSERT INTO public.migration_logs (
    migration_name,
    description,
    details
  ) VALUES (
    'email_sync_trigger',
    'Clinician email update trigger activated',
    jsonb_build_object(
      'clinician_id', NEW.id,
      'old_clinician_email', OLD.clinician_email,
      'new_clinician_email', NEW.clinician_email,
      'current_auth_email', current_auth_email,
      'auth_user_exists', auth_user_exists,
      'email_changed', (OLD.clinician_email IS DISTINCT FROM NEW.clinician_email),
      'trigger_source', 'clinicians_table_update',
      'triggered_at', now(),
      'session_user', session_user,
      'current_user', current_user
    )
  );
  
  -- Only proceed if auth user exists and email actually changed
  IF auth_user_exists AND (OLD.clinician_email IS DISTINCT FROM NEW.clinician_email) THEN
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'email_sync_trigger',
      'Email sync conditions met - would update auth.users',
      jsonb_build_object(
        'clinician_id', NEW.id,
        'old_email', OLD.clinician_email,
        'new_email', NEW.clinician_email,
        'current_auth_email', current_auth_email,
        'note', 'Direct auth.users update bypassed - use edge function',
        'triggered_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Enhanced auth to clinician sync trigger function
CREATE OR REPLACE FUNCTION sync_auth_email_to_clinician()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_clinician_email TEXT;
  clinician_exists BOOLEAN;
BEGIN
  -- Get current clinician email
  SELECT clinician_email, EXISTS(SELECT 1 FROM public.clinicians WHERE id = NEW.id)
  INTO current_clinician_email, clinician_exists
  FROM public.clinicians 
  WHERE id = NEW.id 
  LIMIT 1;
  
  -- Log the trigger activation
  INSERT INTO public.migration_logs (
    migration_name,
    description,
    details
  ) VALUES (
    'auth_to_clinician_sync_trigger',
    'Auth user email update trigger activated',
    jsonb_build_object(
      'user_id', NEW.id,
      'old_auth_email', OLD.email,
      'new_auth_email', NEW.email,
      'current_clinician_email', current_clinician_email,
      'clinician_exists', clinician_exists,
      'email_changed', (OLD.email IS DISTINCT FROM NEW.email),
      'trigger_source', 'auth_users_update',
      'triggered_at', now()
    )
  );
  
  -- Update clinician email when auth user email changes (if clinician exists)
  IF clinician_exists AND (OLD.email IS DISTINCT FROM NEW.email) THEN
    UPDATE public.clinicians 
    SET 
      clinician_email = NEW.email,
      updated_at = now()
    WHERE id = NEW.id;
    
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'auth_to_clinician_sync_trigger',
      'Clinician email updated from auth trigger',
      jsonb_build_object(
        'user_id', NEW.id,
        'old_clinician_email', current_clinician_email,
        'new_clinician_email', NEW.email,
        'updated_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a comprehensive email sync audit function
CREATE OR REPLACE FUNCTION audit_email_sync_status()
RETURNS TABLE(
  clinician_id uuid,
  auth_email text,
  clinician_email text,
  sync_status text,
  last_auth_update timestamp with time zone,
  last_clinician_update timestamp with time zone,
  mismatch_duration interval
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as clinician_id,
    CAST(u.email AS text) as auth_email,
    c.clinician_email,
    CASE 
      WHEN CAST(u.email AS text) = c.clinician_email THEN 'SYNCED'
      WHEN CAST(u.email AS text) IS NULL THEN 'AUTH_MISSING'
      WHEN c.clinician_email IS NULL THEN 'CLINICIAN_EMAIL_MISSING'
      ELSE 'MISMATCH'
    END as sync_status,
    u.updated_at as last_auth_update,
    c.updated_at as last_clinician_update,
    CASE 
      WHEN CAST(u.email AS text) != c.clinician_email THEN 
        GREATEST(u.updated_at, c.updated_at) - LEAST(u.updated_at, c.updated_at)
      ELSE NULL
    END as mismatch_duration
  FROM public.clinicians c
  FULL OUTER JOIN auth.users u ON c.id = u.id
  ORDER BY 
    CASE 
      WHEN CAST(u.email AS text) = c.clinician_email THEN 1
      ELSE 0
    END,
    c.updated_at DESC;
END;
$$;

-- Create a function to log email update operations
CREATE OR REPLACE FUNCTION log_email_update_operation(
  operation_type text,
  clinician_id uuid,
  old_email text,
  new_email text,
  source_component text,
  correlation_id text DEFAULT NULL,
  additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.migration_logs (
    migration_name,
    description,
    details
  ) VALUES (
    'email_update_operation',
    operation_type,
    jsonb_build_object(
      'clinician_id', clinician_id,
      'old_email', old_email,
      'new_email', new_email,
      'source_component', source_component,
      'correlation_id', correlation_id,
      'timestamp', now(),
      'session_user', session_user,
      'current_user', current_user
    ) || additional_data
  );
END;
$$;