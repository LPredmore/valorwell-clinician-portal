
-- Enable RLS on clients table if not already enabled
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "clients_own_record" ON clients;
DROP POLICY IF EXISTS "clients_assigned_clinician" ON clients;

-- Create policy for clients to see their own record
CREATE POLICY "clients_own_record" ON clients
  FOR ALL USING (id = auth.uid());

-- Create policy for clinicians to see their assigned clients
CREATE POLICY "clinicians_assigned_clients" ON clients
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    client_assigned_therapist = auth.uid()::text
  );

-- Grant necessary permissions
GRANT SELECT ON clients TO authenticated;
