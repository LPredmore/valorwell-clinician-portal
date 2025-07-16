-- Create the Lucas Predmore admin account directly
-- First, let's insert the auth user record using admin privileges
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_confirm_token,
  recovery_token
) VALUES (
  gen_random_uuid(),
  'info@valorwell.org',
  crypt('$V@l0rw3ll', gen_salt('bf')),
  now(),
  '{"first_name": "Lucas", "last_name": "Predmore", "preferred_name": "Lucas", "role": "clinician", "is_admin": true}'::jsonb,
  now(),
  now(),
  '',
  '',
  ''
) 
ON CONFLICT (email) DO UPDATE SET
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now()
RETURNING id;

-- Now create the clinician record using the user ID
INSERT INTO public.clinicians (
  id,
  clinician_email,
  clinician_first_name,
  clinician_last_name,
  clinician_status,
  is_admin,
  created_at,
  updated_at
) 
SELECT 
  id,
  'info@valorwell.org',
  'Lucas',
  'Predmore', 
  'Active'::clinician_status_enum,
  true,
  now(),
  now()
FROM auth.users 
WHERE email = 'info@valorwell.org'
ON CONFLICT (id) DO UPDATE SET
  is_admin = true,
  clinician_status = 'Active'::clinician_status_enum,
  updated_at = now();