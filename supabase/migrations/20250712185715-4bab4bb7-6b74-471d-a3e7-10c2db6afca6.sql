-- Create storage policy to allow anonymous uploads to Clinical Documents bucket
CREATE POLICY "Allow anon upload to clinical documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'Clinical Documents' AND auth.role() = 'anon');

-- Also ensure authenticated users can upload (if they need to)
CREATE POLICY "Allow authenticated upload to clinical documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'Clinical Documents' AND auth.role() = 'authenticated');