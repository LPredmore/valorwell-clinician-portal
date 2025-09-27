-- Drop remaining policies that reference client_assigned_therapist

-- Drop policies from session_notes table
DROP POLICY IF EXISTS "Clinicians can view session notes" ON public.session_notes;

-- Drop policies from treatment_plans table
DROP POLICY IF EXISTS "Clinicians can create treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Clinicians can update treatment plans" ON public.treatment_plans;
DROP POLICY IF EXISTS "Clinicians can view treatment plans" ON public.treatment_plans;

-- Drop policies from storage.objects table
DROP POLICY IF EXISTS "Clinicians can view all clinical documents" ON storage.objects;