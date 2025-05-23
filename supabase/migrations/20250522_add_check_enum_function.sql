
-- Create a function to check if an enum type exists
CREATE OR REPLACE FUNCTION check_enum_exists(enum_name text) 
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  enum_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_type 
    WHERE typname = enum_name
  ) INTO enum_exists;
  
  RETURN enum_exists;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_enum_exists(text) TO authenticated;

-- Log the creation of the function
INSERT INTO public.migration_logs (migration_name, description, details)
VALUES (
  '20250522_add_check_enum_function',
  'Added check_enum_exists function',
  jsonb_build_object('action', 'create_function')
);
