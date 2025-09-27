-- Phase 3: Recreate all RLS policies with proper UUID comparisons

-- Recreate policies for clients table
CREATE POLICY "clients_access" 
ON public.clients 
FOR ALL 
USING (
  (auth.uid() = id) OR 
  (auth.uid() = client_assigned_therapist)
);

CREATE POLICY "clinicians_assigned_clients" 
ON public.clients 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND 
  (client_assigned_therapist = auth.uid())
);

-- Recreate policies for client_history table
CREATE POLICY "Clinicians can view assigned client history" 
ON public.client_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = client_history.client_id 
    AND clients.client_assigned_therapist = auth.uid()
  )
);

-- Recreate policies for client_history related tables
CREATE POLICY "Users can view spouse info for accessible history" 
ON public.client_history_current_spouse 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_history 
    WHERE client_history.id = client_history_current_spouse.history_id 
    AND (
      client_history.client_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = client_history.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view family info for accessible history" 
ON public.client_history_family 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_history 
    WHERE client_history.id = client_history_family.history_id 
    AND (
      client_history.client_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = client_history.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view household info for accessible history" 
ON public.client_history_household 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_history 
    WHERE client_history.id = client_history_household.history_id 
    AND (
      client_history.client_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = client_history.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view medication info for accessible history" 
ON public.client_history_medications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_history 
    WHERE client_history.id = client_history_medications.history_id 
    AND (
      client_history.client_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = client_history.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view past spouses info for accessible history" 
ON public.client_history_spouses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_history 
    WHERE client_history.id = client_history_spouses.history_id 
    AND (
      client_history.client_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = client_history.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view treatment info for accessible history" 
ON public.client_history_treatments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_history 
    WHERE client_history.id = client_history_treatments.history_id 
    AND (
      client_history.client_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = client_history.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )
  )
);

-- Recreate policies for clinical_documents table
CREATE POLICY "Clinicians can insert documents for assigned clients" 
ON public.clinical_documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = clinical_documents.client_id 
    AND clients.client_assigned_therapist = auth.uid()
  )
);

CREATE POLICY "Clinicians can view assigned client documents" 
ON public.clinical_documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = clinical_documents.client_id 
    AND clients.client_assigned_therapist = auth.uid()
  )
);

-- Recreate policies for eligibility_audit table (if it exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'eligibility_audit' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "Users can view eligibility audit for accessible clients" 
    ON public.eligibility_audit 
    FOR SELECT 
    USING (
      (auth.uid() = client_id) 
      OR EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = eligibility_audit.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      ) 
      OR user_has_admin_role(auth.uid())
    )';
  END IF;
END $$;

-- Recreate policies for session_notes table (if it exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'session_notes' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "Clinicians can view session notes" 
    ON public.session_notes 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = session_notes.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )';
  END IF;
END $$;

-- Recreate policies for treatment_plans table (if it exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'treatment_plans' AND schemaname = 'public') THEN
    EXECUTE 'CREATE POLICY "Clinicians can create treatment plans" 
    ON public.treatment_plans 
    FOR INSERT 
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = treatment_plans.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )';
    
    EXECUTE 'CREATE POLICY "Clinicians can update treatment plans" 
    ON public.treatment_plans 
    FOR UPDATE 
    USING (
      EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = treatment_plans.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )';
    
    EXECUTE 'CREATE POLICY "Clinicians can view treatment plans" 
    ON public.treatment_plans 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = treatment_plans.client_id 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )';
  END IF;
END $$;

-- Recreate policy for storage.objects (if applicable)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'objects' AND schemaname = 'storage') THEN
    EXECUTE 'CREATE POLICY "Clinicians can view all clinical documents" 
    ON storage.objects 
    FOR SELECT 
    USING (
      (bucket_id = ''clinical_documents'') 
      AND EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id::text = (storage.foldername(objects.name))[1] 
        AND clients.client_assigned_therapist = auth.uid()
      )
    )';
  END IF;
END $$;