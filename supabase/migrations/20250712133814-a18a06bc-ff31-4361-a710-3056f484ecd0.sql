-- Drop existing overly permissive RLS policies
DROP POLICY IF EXISTS "Clinicians can create client documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "Clinicians can view client documents" ON public.clinical_documents;

-- Create proper RLS policies for clinical_documents table

-- Policy for SELECT: Allow clients to view their own documents OR clinicians to view assigned clients' documents
CREATE POLICY "Users can view accessible clinical documents" 
ON public.clinical_documents 
FOR SELECT 
USING (
  -- User is the client themselves
  auth.uid() = client_id 
  OR 
  -- User is a clinician assigned to this client
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = clinical_documents.client_id 
    AND clients.client_assigned_therapist = auth.uid()::text
  )
  OR
  -- User is an admin
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.id = auth.uid()
  )
);

-- Policy for INSERT: Allow clinicians and admins to create documents
CREATE POLICY "Clinicians can create clinical documents" 
ON public.clinical_documents 
FOR INSERT 
WITH CHECK (
  -- User is a clinician (exists in clinicians table)
  EXISTS (
    SELECT 1 FROM public.clinicians 
    WHERE clinicians.id = auth.uid()
  )
  OR
  -- User is an admin
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.id = auth.uid()
  )
);

-- Policy for UPDATE: Allow document creators and admins to update documents
CREATE POLICY "Document creators can update clinical documents" 
ON public.clinical_documents 
FOR UPDATE 
USING (
  -- User created the document
  created_by = auth.uid()
  OR
  -- User is an admin
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.id = auth.uid()
  )
);

-- Policy for DELETE: Allow admins to delete documents
CREATE POLICY "Admins can delete clinical documents" 
ON public.clinical_documents 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.id = auth.uid()
  )
);