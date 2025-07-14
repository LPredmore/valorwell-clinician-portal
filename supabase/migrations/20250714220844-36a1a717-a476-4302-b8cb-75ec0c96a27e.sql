-- Update Client History document path to match actual storage filename
UPDATE clinical_documents 
SET file_path = 'fa5d2150-b8be-4c7a-be58-ee78599c7126/client_history_c5ac881b-7e2d-4edd-95ac-a9a9929a09c9_1752418090791.pdf'
WHERE id = 'c5ac881b-7e2d-4edd-95ac-a9a9929a09c9' 
  AND document_type = 'client_history' 
  AND client_id = 'fa5d2150-b8be-4c7a-be58-ee78599c7126';