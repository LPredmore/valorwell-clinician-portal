-- Remove all references to admins table and update RLS policies to use clinicians.is_admin

-- Drop all RLS policies that reference admins table
DROP POLICY IF EXISTS "Admins can view all claims" ON public.claims;
DROP POLICY IF EXISTS "Admins can manage all claims" ON public.claims;
DROP POLICY IF EXISTS "Admin users can manage admin records" ON public.admins;
DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admins;
DROP POLICY IF EXISTS "Users can update their own admin profile" ON public.admins;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.clinicians;
DROP POLICY IF EXISTS "Admins can delete clinical documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.api_logs;
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.automated_batch_schedules;
DROP POLICY IF EXISTS "Admins can manage all batch logs" ON public.batch_logs;
DROP POLICY IF EXISTS "Admins can manage all batch claims" ON public.batch_claims;
DROP POLICY IF EXISTS "Admins can view performance metrics" ON public.batch_performance_metrics;
DROP POLICY IF EXISTS "Admins can manage audit trail" ON public.claim_status_audit_trail;
DROP POLICY IF EXISTS "Admins can view all blocked time" ON public.blocked_time;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;

-- Create updated RLS policies using clinicians.is_admin
CREATE POLICY "Admins can view all claims" ON public.claims
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clinicians 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can manage all claims" ON public.claims
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clinicians 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can manage all users" ON public.clinicians
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinicians 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete clinical documents" ON public.clinical_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view all logs" ON public.api_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage schedules" ON public.automated_batch_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all batch logs" ON public.batch_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage all batch claims" ON public.batch_claims
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view performance metrics" ON public.batch_performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage audit trail" ON public.claim_status_audit_trail
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view all blocked time" ON public.blocked_time
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view all appointments" ON public.appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view all clients" ON public.clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clinicians
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Update database functions to use clinicians.is_admin instead of admins table
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

-- Finally, drop the admins table
DROP TABLE IF EXISTS public.admins CASCADE;