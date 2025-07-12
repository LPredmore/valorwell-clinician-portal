-- Create storage policy to allow anonymous uploads to clinical documents bucket
CREATE POLICY "Allow anon upload to clinical documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'clinical_documents' AND auth.role() = 'anon');

-- Also ensure authenticated users can upload (if they need to)
CREATE POLICY "Allow authenticated upload to clinical documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'clinical_documents' AND auth.role() = 'authenticated');