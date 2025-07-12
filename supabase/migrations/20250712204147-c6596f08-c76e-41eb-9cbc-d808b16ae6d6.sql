-- Phase 1: Database Cleanup - Remove invalid session note entries
-- Delete all clinical_documents records with invalid file paths

DELETE FROM public.clinical_documents 
WHERE file_path LIKE 'pending-pdf-generation-%'
   OR file_path LIKE 'pdf-generation-failed-%'
   OR file_path LIKE 'pdf-generation-error-%'
   OR file_path LIKE 'no-content-for-pdf-%'
   OR file_path LIKE 'temp/%'
   OR file_path = 'placeholder-path'
   OR file_path = '';

-- Phase 2: Improve filtering logic - Update the get_filtered_clinical_documents function
-- to only return documents with valid file paths
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
      -- Only include documents with valid file paths
      AND cd.file_path IS NOT NULL
      AND cd.file_path != ''
      AND cd.file_path NOT LIKE 'pending-pdf-generation-%'
      AND cd.file_path NOT LIKE 'pdf-generation-failed-%'
      AND cd.file_path NOT LIKE 'pdf-generation-error-%'
      AND cd.file_path NOT LIKE 'no-content-for-pdf-%'
      AND cd.file_path NOT LIKE 'temp/%'
      AND cd.file_path != 'placeholder-path'
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
      -- Only include documents with valid file paths
      AND cd.file_path IS NOT NULL
      AND cd.file_path != ''
      AND cd.file_path NOT LIKE 'pending-pdf-generation-%'
      AND cd.file_path NOT LIKE 'pdf-generation-failed-%'
      AND cd.file_path NOT LIKE 'pdf-generation-error-%'
      AND cd.file_path NOT LIKE 'no-content-for-pdf-%'
      AND cd.file_path NOT LIKE 'temp/%'
      AND cd.file_path != 'placeholder-path'
  ),
  other_documents AS (
    -- For other document types (PHQ9, PCL5, etc.)
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
      AND LOWER(cd.document_type) NOT IN ('treatment plan', 'session_note', 'session note')
      -- Only include documents with valid file paths
      AND cd.file_path IS NOT NULL
      AND cd.file_path != ''
      AND cd.file_path NOT LIKE 'pending-pdf-generation-%'
      AND cd.file_path NOT LIKE 'pdf-generation-failed-%'
      AND cd.file_path NOT LIKE 'pdf-generation-error-%'
      AND cd.file_path NOT LIKE 'no-content-for-pdf-%'
      AND cd.file_path NOT LIKE 'temp/%'
      AND cd.file_path != 'placeholder-path'
  )
  -- Combine all result sets
  SELECT * FROM deduplicated_treatment_plans
  UNION ALL
  SELECT * FROM session_notes
  UNION ALL
  SELECT * FROM other_documents
  ORDER BY document_date DESC, created_at DESC;
END;
$function$;