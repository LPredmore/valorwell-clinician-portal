
-- Fix the nylas_connections table to have proper UUID generation
ALTER TABLE nylas_connections 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure the user_id column is properly set up with foreign key reference
ALTER TABLE nylas_connections 
ADD CONSTRAINT fk_nylas_connections_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add RLS policies to ensure users can only see their own connections
ALTER TABLE nylas_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Nylas connections" 
  ON nylas_connections 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Nylas connections" 
  ON nylas_connections 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Nylas connections" 
  ON nylas_connections 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Nylas connections" 
  ON nylas_connections 
  FOR DELETE 
  USING (auth.uid() = user_id);
