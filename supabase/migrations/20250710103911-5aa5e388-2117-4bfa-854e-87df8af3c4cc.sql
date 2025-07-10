-- Create function to fetch filtered clinical documents with treatment plan deduplication
CREATE OR REPLACE FUNCTION public.get_filtered_clinical_documents(p_client_id UUID)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  document_title TEXT,
  document_type TEXT,
  document_date DATE,
  file_path TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH deduplicated_treatment_plans AS (
    -- For treatment plans, only keep the newest one per document_date
    SELECT DISTINCT ON (cd.document_date) 
      cd.id,
      cd.client_id,
      cd.document_title,
      cd.document_type,
      cd.document_date,
      cd.file_path,
      cd.created_at,
      cd.created_by
    FROM clinical_documents cd
    WHERE cd.client_id = p_client_id 
      AND LOWER(cd.document_type) = 'treatment plan'
    ORDER BY cd.document_date DESC, cd.created_at DESC
  ),
  session_notes AS (
    -- For session notes, keep all of them
    SELECT 
      cd.id,
      cd.client_id,
      cd.document_title,
      cd.document_type,
      cd.document_date,
      cd.file_path,
      cd.created_at,
      cd.created_by
    FROM clinical_documents cd
    WHERE cd.client_id = p_client_id 
      AND LOWER(cd.document_type) = 'session_note'
  )
  -- Combine both result sets
  SELECT * FROM deduplicated_treatment_plans
  UNION ALL
  SELECT * FROM session_notes
  ORDER BY document_date DESC, created_at DESC;
END;
$$;