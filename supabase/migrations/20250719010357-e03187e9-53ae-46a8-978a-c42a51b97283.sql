-- Step 1: Update database functions to use clinicians.is_admin instead of admins table
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
  -- Check if user is a pure admin (from metadata)
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

CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  user_role text;
  is_clinician_admin boolean;
BEGIN
  -- Check if user is a pure admin (from metadata)
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

-- Step 2: Drop admins table if it exists (this will cascade and drop related policies)
DROP TABLE IF EXISTS public.admins CASCADE;