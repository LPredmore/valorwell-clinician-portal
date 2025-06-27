
-- Enable RLS on clinicians table if not already enabled
ALTER TABLE clinicians ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "clinicians_own_record" ON clinicians;
DROP POLICY IF EXISTS "admins_all_clinicians" ON clinicians;

-- Create policy for clinicians to see and update their own record
CREATE POLICY "clinicians_own_record" ON clinicians
  FOR ALL USING (id = auth.uid());

-- Create policy for admins to see all clinicians
CREATE POLICY "admins_all_clinicians" ON clinicians
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, UPDATE ON clinicians TO authenticated;
