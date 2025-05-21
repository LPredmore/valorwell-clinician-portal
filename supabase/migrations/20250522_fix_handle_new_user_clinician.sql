
-- This migration adds better error handling to the handle_new_user trigger function
-- specifically focusing on the clinician creation path and ensuring idempotent behavior

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a table for dedicated user creation logs (separate from general migration_logs)
CREATE TABLE IF NOT EXISTS public.user_creation_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS user_creation_logs_user_id_idx ON public.user_creation_logs (user_id);
CREATE INDEX IF NOT EXISTS user_creation_logs_email_idx ON public.user_creation_logs (email);
CREATE INDEX IF NOT EXISTS user_creation_logs_status_idx ON public.user_creation_logs (status);

-- Create the improved handle_new_user function with proper error handling and idempotency
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_role text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_state text;
  v_temp_password text;
  v_professional_name text;
  v_email text;
  v_error_details jsonb;
  v_existing_record boolean;
  v_result text;
BEGIN
  -- Normalize the email: remove dots for gmail and handle +alias
  v_email := NEW.email;
  
  -- Record original details for logging
  v_error_details := jsonb_build_object(
    'user_id', NEW.id,
    'original_email', NEW.email,
    'normalized_email', v_email,
    'raw_metadata', NEW.raw_user_meta_data
  );
  
  -- Extract the role from user metadata with fallback to 'client' if missing
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  -- Extract other common fields with null handling
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_state := NEW.raw_user_meta_data->>'state';
  v_temp_password := NEW.raw_user_meta_data->>'temp_password';
  
  -- Professional name handling for clinicians (critical for displaying in UI)
  v_professional_name := COALESCE(
    NEW.raw_user_meta_data->>'professional_name',
    CASE WHEN v_first_name IS NOT NULL OR v_last_name IS NOT NULL
      THEN TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''))
      ELSE 
        CASE 
          -- Special handling for organizational emails
          WHEN v_email LIKE 'info@%' OR v_email LIKE 'contact@%' OR v_email LIKE 'support@%'
          THEN SPLIT_PART(v_email, '@', 2) || ' Provider'
          ELSE COALESCE(v_first_name, 'Provider')
        END
    END
  );
  
  -- Add role details to our logging object
  v_error_details := v_error_details || jsonb_build_object(
    'role', v_role,
    'professional_name', v_professional_name
  );
  
  -- If role is missing or invalid, set it to 'client' and update user metadata
  IF v_role IS NULL OR v_role NOT IN ('admin', 'clinician', 'client') THEN
    -- Log the issue
    INSERT INTO public.user_creation_logs (
      user_id,
      email,
      role,
      action,
      status,
      details
    ) VALUES (
      NEW.id,
      v_email,
      'unknown',
      'role_correction',
      'corrected',
      jsonb_build_object(
        'provided_role', v_role,
        'assigned_role', 'client'
      )
    );
    
    -- Set default role to client
    v_role := 'client';
    
    -- Update user metadata to include the role
    UPDATE auth.users
    SET raw_user_meta_data =
      CASE
        WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', 'client')
        ELSE raw_user_meta_data || jsonb_build_object('role', 'client')
      END
    WHERE id = NEW.id;
  END IF;
  
  -- Handle role-specific logic
  IF v_role = 'admin' THEN
    -- First check if an admin record already exists (idempotent)
    SELECT EXISTS (
      SELECT 1 FROM public.admins WHERE id = NEW.id
    ) INTO v_existing_record;
    
    IF v_existing_record THEN
      -- Log that we skipped creating a duplicate record
      INSERT INTO public.user_creation_logs (
        user_id,
        email,
        role,
        action,
        status,
        details
      ) VALUES (
        NEW.id,
        v_email,
        'admin',
        'check_existing',
        'skipped_existing',
        v_error_details
      );
    ELSE
      -- For admin role, insert into admins table
      BEGIN
        INSERT INTO public.admins (
          id,
          admin_email,
          admin_first_name,
          admin_last_name,
          admin_phone
        )
        VALUES (
          NEW.id,
          v_email,
          v_first_name,
          v_last_name,
          v_phone
        );
        
        -- Log successful creation
        INSERT INTO public.user_creation_logs (
          user_id,
          email,
          role,
          action,
          status,
          details
        ) VALUES (
          NEW.id,
          v_email,
          'admin',
          'create_record',
          'success',
          v_error_details
        );
        
      EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the trigger
        v_error_details := v_error_details || jsonb_build_object(
          'error', SQLERRM,
          'error_detail', SQLSTATE
        );
        
        INSERT INTO public.user_creation_logs (
          user_id,
          email,
          role,
          action,
          status,
          details
        ) VALUES (
          NEW.id,
          v_email,
          'admin',
          'create_record',
          'error',
          v_error_details
        );
        
        -- Also log to the general migration_logs for backward compatibility
        INSERT INTO public.migration_logs (
          migration_name,
          description,
          details
        ) VALUES (
          'handle_new_user_trigger',
          'Error inserting admin record',
          v_error_details
        );
        
        -- Propagate error to clients through raw_app_meta_data
        UPDATE auth.users
        SET raw_app_meta_data = 
          CASE
            WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('creation_error', v_error_details)
            ELSE raw_app_meta_data || jsonb_build_object('creation_error', v_error_details)
          END
        WHERE id = NEW.id;
      END;
    END IF;
    
  ELSIF v_role = 'clinician' THEN
    -- First check if a clinician record already exists (idempotent)
    SELECT EXISTS (
      SELECT 1 FROM public.clinicians WHERE id = NEW.id
    ) INTO v_existing_record;
    
    IF v_existing_record THEN
      -- Log that we skipped creating a duplicate record
      INSERT INTO public.user_creation_logs (
        user_id,
        email,
        role,
        action,
        status,
        details
      ) VALUES (
        NEW.id,
        v_email,
        'clinician',
        'check_existing',
        'skipped_existing',
        v_error_details
      );
    ELSE
      -- For clinician role, insert into clinicians table with error handling
      BEGIN
        INSERT INTO public.clinicians (
          id,
          clinician_email,
          clinician_first_name,
          clinician_last_name,
          clinician_phone,
          clinician_professional_name,
          clinician_status,
          clinician_time_zone,
          clinician_timezone
        )
        VALUES (
          NEW.id,
          v_email,
          v_first_name,
          v_last_name,
          v_phone,
          v_professional_name,
          'New',
          'America/Chicago',
          ARRAY['America/Chicago']
        );
        
        -- Log successful creation
        INSERT INTO public.user_creation_logs (
          user_id,
          email,
          role,
          action,
          status,
          details
        ) VALUES (
          NEW.id,
          v_email,
          'clinician',
          'create_record',
          'success',
          v_error_details || jsonb_build_object('professional_name', v_professional_name)
        );
        
      EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the trigger
        v_error_details := v_error_details || jsonb_build_object(
          'error', SQLERRM,
          'error_detail', SQLSTATE
        );
        
        INSERT INTO public.user_creation_logs (
          user_id,
          email,
          role,
          action,
          status,
          details
        ) VALUES (
          NEW.id,
          v_email,
          'clinician',
          'create_record',
          'error',
          v_error_details
        );
        
        -- Also log to the general migration_logs for backward compatibility
        INSERT INTO public.migration_logs (
          migration_name,
          description,
          details
        ) VALUES (
          'handle_new_user_trigger',
          'Error inserting clinician record',
          v_error_details
        );
        
        -- Propagate error to clients through raw_app_meta_data
        UPDATE auth.users
        SET raw_app_meta_data = 
          CASE
            WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('creation_error', v_error_details)
            ELSE raw_app_meta_data || jsonb_build_object('creation_error', v_error_details)
          END
        WHERE id = NEW.id;
      END;
    END IF;
    
  ELSIF v_role = 'client' THEN
    -- First check if a client record already exists (idempotent)
    SELECT EXISTS (
      SELECT 1 FROM public.clients WHERE id = NEW.id
    ) INTO v_existing_record;
    
    IF v_existing_record THEN
      -- Log that we skipped creating a duplicate record
      INSERT INTO public.user_creation_logs (
        user_id,
        email,
        role,
        action,
        status,
        details
      ) VALUES (
        NEW.id,
        v_email,
        'client',
        'check_existing',
        'skipped_existing',
        v_error_details
      );
    ELSE
      -- For client role, insert into clients table with error handling
      BEGIN
        INSERT INTO public.clients (
          id,
          client_email,
          client_first_name,
          client_last_name,
          client_phone,
          role,
          client_state,
          client_status,
          client_temppassword
        )
        VALUES (
          NEW.id,
          v_email,
          v_first_name,
          v_last_name,
          v_phone,
          'client'::app_role,
          v_state,
          'New',
          v_temp_password
        );
        
        -- Log successful creation
        INSERT INTO public.user_creation_logs (
          user_id,
          email,
          role,
          action,
          status,
          details
        ) VALUES (
          NEW.id,
          v_email,
          'client',
          'create_record',
          'success',
          v_error_details
        );
        
      EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the trigger
        v_error_details := v_error_details || jsonb_build_object(
          'error', SQLERRM,
          'error_detail', SQLSTATE
        );
        
        INSERT INTO public.user_creation_logs (
          user_id,
          email,
          role,
          action,
          status,
          details
        ) VALUES (
          NEW.id,
          v_email,
          'client',
          'create_record',
          'error',
          v_error_details
        );
        
        -- Also log to the general migration_logs for backward compatibility
        INSERT INTO public.migration_logs (
          migration_name,
          description,
          details
        ) VALUES (
          'handle_new_user_trigger',
          'Error inserting client record',
          v_error_details
        );
        
        -- Propagate error to clients through raw_app_meta_data
        UPDATE auth.users
        SET raw_app_meta_data = 
          CASE
            WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('creation_error', v_error_details)
            ELSE raw_app_meta_data || jsonb_build_object('creation_error', v_error_details)
          END
        WHERE id = NEW.id;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create a repair function to manually insert missing user records
CREATE OR REPLACE FUNCTION public.repair_missing_user_record(
  p_user_id uuid,
  p_role text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record auth.users;
  v_role text;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_professional_name text;
  v_phone text;
  v_result jsonb;
  v_exists boolean;
BEGIN
  -- Get the user record from auth.users
  SELECT * INTO v_user_record FROM auth.users WHERE id = p_user_id;
  
  IF v_user_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found in auth.users');
  END IF;
  
  -- Extract data
  v_email := v_user_record.email;
  v_role := COALESCE(p_role, v_user_record.raw_user_meta_data->>'role', 'client');
  v_first_name := v_user_record.raw_user_meta_data->>'first_name';
  v_last_name := v_user_record.raw_user_meta_data->>'last_name';
  v_phone := v_user_record.raw_user_meta_data->>'phone';
  
  -- Professional name handling for clinicians
  v_professional_name := COALESCE(
    v_user_record.raw_user_meta_data->>'professional_name',
    CASE WHEN v_first_name IS NOT NULL OR v_last_name IS NOT NULL
      THEN TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''))
      ELSE 
        CASE 
          -- Special handling for organizational emails
          WHEN v_email LIKE 'info@%' OR v_email LIKE 'contact@%' OR v_email LIKE 'support@%'
          THEN SPLIT_PART(v_email, '@', 2) || ' Provider'
          ELSE COALESCE(v_first_name, 'Provider')
        END
    END
  );
  
  -- Record original details for logging
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'email', v_email,
    'role', v_role,
    'requested_role', p_role
  );
  
  -- Handle role-specific logic
  IF v_role = 'admin' THEN
    -- Check if record exists
    SELECT EXISTS (SELECT 1 FROM public.admins WHERE id = p_user_id) INTO v_exists;
    
    IF v_exists THEN
      RETURN v_result || jsonb_build_object('success', true, 'message', 'Admin record already exists', 'action', 'none');
    END IF;
    
    -- Create admin record
    INSERT INTO public.admins (
      id,
      admin_email,
      admin_first_name,
      admin_last_name,
      admin_phone
    )
    VALUES (
      p_user_id,
      v_email,
      v_first_name,
      v_last_name,
      v_phone
    );
    
    -- Log repair
    INSERT INTO public.user_creation_logs (
      user_id,
      email,
      role,
      action,
      status,
      details
    ) VALUES (
      p_user_id,
      v_email,
      'admin',
      'repair_record',
      'success',
      v_result
    );
    
    RETURN v_result || jsonb_build_object('success', true, 'message', 'Admin record created', 'action', 'created');
    
  ELSIF v_role = 'clinician' THEN
    -- Check if record exists
    SELECT EXISTS (SELECT 1 FROM public.clinicians WHERE id = p_user_id) INTO v_exists;
    
    IF v_exists THEN
      RETURN v_result || jsonb_build_object('success', true, 'message', 'Clinician record already exists', 'action', 'none');
    END IF;
    
    -- Create clinician record
    INSERT INTO public.clinicians (
      id,
      clinician_email,
      clinician_first_name,
      clinician_last_name,
      clinician_phone,
      clinician_professional_name,
      clinician_status,
      clinician_time_zone,
      clinician_timezone
    )
    VALUES (
      p_user_id,
      v_email,
      v_first_name,
      v_last_name,
      v_phone,
      v_professional_name,
      'New',
      'America/Chicago',
      ARRAY['America/Chicago']
    );
    
    -- Log repair
    INSERT INTO public.user_creation_logs (
      user_id,
      email,
      role,
      action,
      status,
      details
    ) VALUES (
      p_user_id,
      v_email,
      'clinician',
      'repair_record',
      'success',
      v_result || jsonb_build_object('professional_name', v_professional_name)
    );
    
    RETURN v_result || jsonb_build_object('success', true, 'message', 'Clinician record created', 'action', 'created');
    
  ELSIF v_role = 'client' THEN
    -- Check if record exists
    SELECT EXISTS (SELECT 1 FROM public.clients WHERE id = p_user_id) INTO v_exists;
    
    IF v_exists THEN
      RETURN v_result || jsonb_build_object('success', true, 'message', 'Client record already exists', 'action', 'none');
    END IF;
    
    -- Create client record
    INSERT INTO public.clients (
      id,
      client_email,
      client_first_name,
      client_last_name,
      client_phone,
      role,
      client_status
    )
    VALUES (
      p_user_id,
      v_email,
      v_first_name,
      v_last_name,
      v_phone,
      'client'::app_role,
      'New'
    );
    
    -- Log repair
    INSERT INTO public.user_creation_logs (
      user_id,
      email,
      role,
      action,
      status,
      details
    ) VALUES (
      p_user_id,
      v_email,
      'client',
      'repair_record',
      'success',
      v_result
    );
    
    RETURN v_result || jsonb_build_object('success', true, 'message', 'Client record created', 'action', 'created');
  ELSE
    RETURN v_result || jsonb_build_object('success', false, 'message', 'Invalid role: ' || v_role);
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN v_result || jsonb_build_object(
    'success', false, 
    'message', 'Error: ' || SQLERRM,
    'error_detail', SQLSTATE
  );
END;
$$;

-- Repair the specific account mentioned in the issue
DO $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT public.repair_missing_user_record('fba185bb-53cb-4be9-88b6-3d379255f667', 'clinician') INTO v_result;
  
  -- Log the repair result
  INSERT INTO public.migration_logs (migration_name, description, details)
  VALUES (
    '20250522_fix_handle_new_user_clinician',
    'Attempted repair of specific clinician account',
    v_result
  );
END;
$$;

-- Log the creation of the new trigger
INSERT INTO public.migration_logs (migration_name, description, details)
VALUES (
  '20250522_fix_handle_new_user_clinician',
  'Updated handle_new_user function with improved error handling and idempotent behavior',
  jsonb_build_object('action', 'update_trigger')
);
