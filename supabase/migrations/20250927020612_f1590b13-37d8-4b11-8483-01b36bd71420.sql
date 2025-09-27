-- Phase 2: Add comprehensive RLS policies to clinical_documents table
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for clinical_documents (using current text type for now)
CREATE POLICY "Clients can view their own documents" 
ON public.clinical_documents 
FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Clinicians can view assigned client documents" 
ON public.clinical_documents 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = clinical_documents.client_id 
  AND clients.client_assigned_therapist = (auth.uid())::text
));

CREATE POLICY "Clinicians can insert documents for assigned clients" 
ON public.clinical_documents 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = clinical_documents.client_id 
  AND clients.client_assigned_therapist = (auth.uid())::text
));

CREATE POLICY "Admins can manage all clinical documents" 
ON public.clinical_documents 
FOR ALL 
USING (user_has_admin_privileges(auth.uid()));

-- Clean up invalid client assignments
UPDATE clients 
SET client_assigned_therapist = NULL 
WHERE client_assigned_therapist = '' OR client_assigned_therapist = 'null';