-- Fix the validate_clinician_email_consistency function to handle type differences
DROP FUNCTION IF EXISTS public.validate_clinician_email_consistency();

CREATE OR REPLACE FUNCTION public.validate_clinician_email_consistency()
RETURNS TABLE(clinician_id uuid, auth_email text, clinician_email text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    CAST(u.email AS text) as auth_email,
    c.clinician_email,
    CASE 
      WHEN CAST(u.email AS text) = c.clinician_email THEN 'SYNCED'
      ELSE 'MISMATCH'
    END as status
  FROM public.clinicians c
  JOIN auth.users u ON c.id = u.id
  WHERE CAST(u.email AS text) != c.clinician_email OR u.email IS NULL OR c.clinician_email IS NULL;
END;
$$;