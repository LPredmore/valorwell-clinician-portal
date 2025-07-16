-- Temporarily disable the trigger to create the admin account manually
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Create the user
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'info@valorwell.org',
    crypt('$V@l0rw3ll', gen_salt('bf')),
    now(),
    '{"first_name": "Lucas", "last_name": "Predmore", "preferred_name": "Lucas", "role": "clinician", "is_admin": true}'::jsonb,
    now(),
    now()
)
ON CONFLICT (email) DO UPDATE SET
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

-- Create the clinician record manually
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
    'Active',
    true,
    now(),
    now()
FROM auth.users 
WHERE email = 'info@valorwell.org'
ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    clinician_status = 'Active',
    clinician_first_name = 'Lucas',
    clinician_last_name = 'Predmore',
    clinician_email = 'info@valorwell.org',
    updated_at = now();

-- Re-enable the trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;