-- Add is_admin column to clinicians table to support dual roles
ALTER TABLE public.clinicians 
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Update the handle_new_user function to support clinician-admin dual roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
      'extracted_is_admin', v_is_admin
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
    -- For pure admin role, create admin record
    INSERT INTO public.admins (
      id,
      admin_email,
      admin_first_name,
      admin_last_name,
      admin_phone,
      admin_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      v_phone,
      'Active'
    );
    
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Admin record created successfully',
      jsonb_build_object(
        'user_id', NEW.id,
        'admin_email', NEW.email,
        'admin_first_name', v_first_name,
        'admin_last_name', v_last_name
      )
    );
    
  ELSIF v_role = 'clinician' THEN
    -- For clinician role, create clinician record with optional admin flag
    INSERT INTO public.clinicians (
      id,
      clinician_email,
      clinician_first_name,
      clinician_last_name,
      clinician_phone,
      clinician_status,
      is_admin
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      v_phone,
      'New'::clinician_status_enum,
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
        'is_admin', v_is_admin
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
$function$;

-- Create helper function to check if user has admin privileges (either pure admin or clinician-admin)
CREATE OR REPLACE FUNCTION public.user_has_admin_privileges(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_role text;
  is_clinician_admin boolean;
BEGIN
  -- Check if user is a pure admin
  SELECT auth.users.raw_user_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE auth.users.id = user_id;
  
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is a clinician with admin privileges
  SELECT clinicians.is_admin INTO is_clinician_admin
  FROM public.clinicians
  WHERE clinicians.id = user_id;
  
  RETURN COALESCE(is_clinician_admin, false);
END;
$function$;

-- Update RLS policies to use the new admin privileges function
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (user_has_admin_privileges(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all blocked time" ON public.blocked_time;
CREATE POLICY "Admins can view all blocked time" 
ON public.blocked_time 
FOR SELECT 
USING (user_has_admin_privileges(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
CREATE POLICY "Admins can view all clients" 
ON public.clients 
FOR SELECT 
USING (user_has_admin_privileges(auth.uid()));

-- Update admin table policies to include clinician-admins
DROP POLICY IF EXISTS "Admins can view admin records" ON public.admins;
CREATE POLICY "Admins can view admin records" 
ON public.admins 
FOR SELECT 
USING (user_has_admin_privileges(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert admin records" ON public.admins;
CREATE POLICY "Admins can insert admin records" 
ON public.admins 
FOR INSERT 
WITH CHECK (user_has_admin_privileges(auth.uid()));

DROP POLICY IF EXISTS "Admins can update admin records" ON public.admins;
CREATE POLICY "Admins can update admin records" 
ON public.admins 
FOR UPDATE 
USING (user_has_admin_privileges(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete admin records" ON public.admins;
CREATE POLICY "Admins can delete admin records" 
ON public.admins 
FOR DELETE 
USING (user_has_admin_privileges(auth.uid()));

-- Add policy for clinician-admins to manage clinician records
CREATE POLICY "Clinician-admins can view all clinicians" 
ON public.clinicians 
FOR SELECT 
USING (user_has_admin_privileges(auth.uid()));

CREATE POLICY "Clinician-admins can update clinicians" 
ON public.clinicians 
FOR UPDATE 
USING (user_has_admin_privileges(auth.uid()) OR auth.uid() = id);

CREATE POLICY "Clinician-admins can insert clinicians" 
ON public.clinicians 
FOR INSERT 
WITH CHECK (user_has_admin_privileges(auth.uid()));

CREATE POLICY "Clinician-admins can delete clinicians" 
ON public.clinicians 
FOR DELETE 
USING (user_has_admin_privileges(auth.uid()));

-- Update api_logs policy for admin access
DROP POLICY IF EXISTS "Admins can view all logs" ON public.api_logs;
CREATE POLICY "Admins can view all logs" 
ON public.api_logs 
FOR SELECT 
USING (user_has_admin_privileges(auth.uid()));