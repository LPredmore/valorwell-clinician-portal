-- Update the get_filtered_clinical_documents function to handle both 'session_note' and 'Session Note' formats
DROP FUNCTION IF EXISTS public.get_filtered_clinical_documents(uuid);

CREATE OR REPLACE FUNCTION public.get_filtered_clinical_documents(p_client_id uuid)
 RETURNS TABLE(id uuid, client_id uuid, document_title text, document_type text, document_date date, file_path text, created_at timestamp with time zone, created_by uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    -- For session notes, keep all of them - handle both naming formats
    SELECT 
      cd.id,
      cd.client_id,
      cd.document_title,
      -- Normalize document type to consistent format
      CASE 
        WHEN LOWER(cd.document_type) = 'session_note' THEN 'Session Note'
        ELSE cd.document_type
      END as document_type,
      cd.document_date,
      cd.file_path,
      cd.created_at,
      cd.created_by
    FROM clinical_documents cd
    WHERE cd.client_id = p_client_id 
      AND (LOWER(cd.document_type) = 'session_note' OR LOWER(cd.document_type) = 'session note')
  )
  -- Combine both result sets
  SELECT * FROM deduplicated_treatment_plans
  UNION ALL
  SELECT * FROM session_notes
  ORDER BY document_date DESC, created_at DESC;
END;
$function$;