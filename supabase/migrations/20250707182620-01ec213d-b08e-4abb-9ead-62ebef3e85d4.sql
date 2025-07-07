-- Check if Clinical Documents bucket exists and create it with proper naming
-- First, let's check what buckets exist
SELECT id, name, public FROM storage.buckets;