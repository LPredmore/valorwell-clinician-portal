
-- This migration adds better error handling to the handle_new_user trigger function
-- specifically focusing on the clinician creation path

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the improved handle_new_user function with proper error handling
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
  v_error_details jsonb;
BEGIN
  -- Extract the role from user metadata with fallback to 'client' if missing
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  -- Extract other common fields with null handling
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_state := NEW.raw_user_meta_data->>'state';
  v_temp_password := NEW.raw_user_meta_data->>'temp_password';
  v_professional_name := COALESCE(
    NEW.raw_user_meta_data->>'professional_name',
    CASE WHEN v_first_name IS NOT NULL OR v_last_name IS NOT NULL
      THEN TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''))
      ELSE 'Dr. ' || COALESCE(v_first_name, NEW.email)
    END
  );
  
  -- If role is missing or invalid, set it to 'client' and update user metadata
  IF v_role IS NULL OR v_role NOT IN ('admin', 'clinician', 'client') THEN
    -- Log the issue
    INSERT INTO public.migration_logs (
      migration_name,
      description,
      details
    ) VALUES (
      'handle_new_user_trigger',
      'User created with missing or invalid role, defaulting to client',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'provided_role', v_role,
        'assigned_role', 'client',
        'raw_metadata', NEW.raw_user_meta_data
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
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'phone'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the trigger
      v_error_details := jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'error', SQLERRM,
        'error_detail', SQLSTATE,
        'role', 'admin'
      );
      
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
    
    -- Log successful admin creation
    INSERT INTO public.migration_logs (
      migration_name, 
      description, 
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Admin user created successfully',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email
      )
    );
    
  ELSIF v_role = 'clinician' THEN
    -- For clinician role, insert into clinicians table with error handling
    BEGIN
      INSERT INTO public.clinicians (
        id,
        clinician_email,
        clinician_first_name,
        clinician_last_name,
        clinician_phone,
        clinician_professional_name,
        clinician_status
      )
      VALUES (
        NEW.id,
        NEW.email,
        v_first_name,
        v_last_name,
        v_phone,
        v_professional_name,
        'New'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the trigger
      v_error_details := jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'error', SQLERRM,
        'error_detail', SQLSTATE,
        'role', 'clinician'
      );
      
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
      
      RETURN NEW;
    END;
    
    -- Log successful clinician creation
    INSERT INTO public.migration_logs (
      migration_name, 
      description, 
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Clinician user created successfully',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email
      )
    );
    
  ELSIF v_role = 'client' THEN
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
        NEW.email,
        v_first_name,
        v_last_name,
        v_phone,
        'client'::app_role,
        v_state,
        'New',
        v_temp_password
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the trigger
      v_error_details := jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'error', SQLERRM,
        'error_detail', SQLSTATE,
        'role', 'client'
      );
      
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
    
    -- Log successful client creation
    INSERT INTO public.migration_logs (
      migration_name, 
      description, 
      details
    ) VALUES (
      'handle_new_user_trigger',
      'Client user created successfully',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Log the creation of the new trigger
INSERT INTO public.migration_logs (migration_name, description, details)
VALUES (
  '20250522_fix_handle_new_user_clinician',
  'Updated handle_new_user function with improved error handling and clinician professional name',
  jsonb_build_object('action', 'update_trigger')
);
