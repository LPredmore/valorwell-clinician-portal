-- Fix the handle_new_user trigger function to remove admins table reference
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_role text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_state text;
  v_temp_password text;
  v_preferred_name text;
  v_client_status text;
  v_metadata jsonb;
  v_step text;
  v_is_admin boolean;
BEGIN
  -- Log the start of the trigger
  INSERT INTO public.migration_logs (
    migration_name,
    description,
    details
  ) VALUES (
    'handle_new_user_trigger',
    'Starting user creation process',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'raw_metadata', NEW.raw_user_meta_data
    )
  );
  
  -- Step 1: Extract metadata
  v_step := 'extracting_metadata';
  v_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Extract fields with detailed logging
  v_role := COALESCE(v_metadata->>'role', 'client');
  v_first_name := v_metadata->>'first_name';
  v_last_name := v_metadata->>'last_name';
  v_preferred_name := v_metadata->>'preferred_name';
  v_phone := v_metadata->>'phone';
  v_state := v_metadata->>'state';
  v_temp_password := v_metadata->>'temp_password';
  v_client_status := COALESCE(v_metadata->>'client_status', 'New');
  v_is_admin := COALESCE((v_metadata->>'is_admin')::boolean, false);
  
  -- Log extracted values
  INSERT INTO public.migration_logs (
    migration_name,
    description,
    details
  ) VALUES (
    'handle_new_user_trigger',
    'Extracted user metadata',
    jsonb_build_object(
      'user_id', NEW.id,
      'extracted_role', v_role,
      'extracted_first_name', v_first_name,
      'extracted_last_name', v_last_name,
      'extracted_preferred_name', v_preferred_name,
      'extracted_phone', v_phone,
      'extracted_state', v_state,
      'extracted_client_status', v_client_status,
      'extracted_is_admin', v_is_admin,
      'extracted_temp_password', CASE WHEN v_temp_password IS NOT NULL THEN '[REDACTED]' ELSE NULL END
    )
  );
  
  -- Step 2: Validate and set role
  v_step := 'validating_role';
  IF v_role IS NULL OR v_role NOT IN ('admin', 'clinician', 'client') THEN
    v_role := 'client';
    
    -- Update user metadata to include the corrected role
    UPDATE auth.users
    SET raw_user_meta_data = v_metadata || jsonb_build_object('role', 'client')
    WHERE id = NEW.id;
    
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Corrected invalid role to client',
      jsonb_build_object('user_id', NEW.id, 'original_role', v_metadata->>'role')
    );
  END IF;
  
  -- Step 3: Create role-specific records
  v_step := 'creating_role_record';
  
  IF v_role = 'admin' THEN
    -- For admin role, create clinician record with is_admin = true
    INSERT INTO public.clinicians (
      id,
      clinician_email,
      clinician_first_name,
      clinician_last_name,
      clinician_phone,
      clinician_temppassword,
      is_admin
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      v_phone,
      v_temp_password,
      true
    );
    
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Admin record created successfully as clinician',
      jsonb_build_object(
        'user_id', NEW.id,
        'clinician_email', NEW.email,
        'clinician_first_name', v_first_name,
        'clinician_last_name', v_last_name,
        'is_admin', true,
        'note', 'Admin created as clinician with is_admin=true'
      )
    );
    
  ELSIF v_role = 'clinician' THEN
    -- For clinician role, create clinician record with temp password
    INSERT INTO public.clinicians (
      id,
      clinician_email,
      clinician_first_name,
      clinician_last_name,
      clinician_phone,
      clinician_temppassword,
      is_admin
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      v_phone,
      v_temp_password,
      v_is_admin
    );
    
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Clinician record created successfully',
      jsonb_build_object(
        'user_id', NEW.id,
        'clinician_email', NEW.email,
        'clinician_first_name', v_first_name,
        'clinician_last_name', v_last_name,
        'is_admin', v_is_admin,
        'temp_password_stored', v_temp_password IS NOT NULL,
        'note', 'clinician_status set by column default'
      )
    );
    
  ELSIF v_role = 'client' THEN
    -- Insert into clients table with explicit type casting
    INSERT INTO public.clients (
      id,
      client_email,
      client_first_name,
      client_last_name,
      client_preferred_name,
      client_phone,
      role,
      client_state,
      client_status,
      client_temppassword
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      v_preferred_name,
      v_phone,
      'client'::public.app_role,
      v_state,
      v_client_status,
      v_temp_password
    );
    
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Client record created successfully',
      jsonb_build_object(
        'user_id', NEW.id,
        'client_email', NEW.email,
        'client_first_name', v_first_name,
        'client_last_name', v_last_name,
        'client_preferred_name', v_preferred_name,
        'client_phone', v_phone,
        'client_state', v_state,
        'client_status', v_client_status
      )
    );
  END IF;
  
  -- Final success log
  INSERT INTO public.migration_logs (
    migration_name,
    description,
    details
  ) VALUES (
    'handle_new_user_trigger',
    'User creation completed successfully',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'role', v_role,
      'is_admin', v_is_admin,
      'step_completed', 'all_steps'
    )
  );
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error with full context
  INSERT INTO public.migration_logs (
    migration_name,
    description,
    details
  ) VALUES (
    'handle_new_user_trigger',
    'ERROR in user creation process',
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'error_step', v_step,
      'error_message', SQLERRM,
      'error_detail', SQLSTATE,
      'extracted_data', jsonb_build_object(
        'role', v_role,
        'first_name', v_first_name,
        'last_name', v_last_name,
        'phone', v_phone,
        'state', v_state,
        'is_admin', v_is_admin
      )
    )
  );
  
  -- Re-raise the error so signup fails if there's a problem
  RAISE;
END;
$$;