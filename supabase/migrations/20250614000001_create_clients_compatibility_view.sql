-- Migration: Create clients compatibility view
-- Description: Creates a view to bridge the schema mismatch between 'id' and 'client_id'
-- Date: 2025-06-14

-- Create a compatibility view that maps between different column naming conventions
CREATE OR REPLACE VIEW clients_compatibility_view AS
SELECT
  id,
  id AS client_id,
  first_name AS client_first_name,
  last_name AS client_last_name,
  preferred_name AS client_preferred_name,
  email AS client_email,
  phone AS client_phone,
  status AS client_status,
  date_of_birth AS client_date_of_birth,
  age AS client_age,
  gender AS client_gender,
  address AS client_address,
  city AS client_city,
  state AS client_state,
  zipcode AS client_zipcode
FROM
  clients;

-- Grant appropriate permissions to the view
GRANT SELECT ON clients_compatibility_view TO authenticated;
GRANT SELECT ON clients_compatibility_view TO service_role;

-- Add comment to the view for documentation
COMMENT ON VIEW clients_compatibility_view IS 'Compatibility view that provides both id and client_id fields to support legacy code and new schema conventions';