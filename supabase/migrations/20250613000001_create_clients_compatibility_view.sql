-- Create a compatibility view for clients table
-- This view maps 'id' to 'client_id' for backward compatibility

-- Drop the view if it already exists
DROP VIEW IF EXISTS clients_compatibility;

-- Create the view
CREATE VIEW clients_compatibility AS
SELECT 
  id as client_id,
  *
FROM clients;

-- Grant necessary permissions
GRANT SELECT ON clients_compatibility TO authenticated;

-- Add a comment to explain the purpose of this view
COMMENT ON VIEW clients_compatibility IS 'Compatibility view that maps id to client_id for backward compatibility';