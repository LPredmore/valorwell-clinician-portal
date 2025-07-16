-- Create the Lucas Predmore admin account using the service role
-- First check if user already exists, if not create them
DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Try to get existing user
    SELECT id INTO user_id FROM auth.users WHERE email = 'info@valorwell.org';
    
    -- If user doesn't exist, create them
    IF user_id IS NULL THEN
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
        ) RETURNING id INTO user_id;
        
        RAISE NOTICE 'Created new user with ID: %', user_id;
    ELSE
        -- Update existing user metadata
        UPDATE auth.users 
        SET raw_user_meta_data = '{"first_name": "Lucas", "last_name": "Predmore", "preferred_name": "Lucas", "role": "clinician", "is_admin": true}'::jsonb,
            updated_at = now()
        WHERE id = user_id;
        
        RAISE NOTICE 'Updated existing user with ID: %', user_id;
    END IF;
    
    -- Now create or update the clinician record
    INSERT INTO public.clinicians (
        id,
        clinician_email,
        clinician_first_name,
        clinician_last_name,
        clinician_status,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'info@valorwell.org',
        'Lucas',
        'Predmore', 
        'Active'::clinician_status_enum,
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        is_admin = true,
        clinician_status = 'Active'::clinician_status_enum,
        clinician_first_name = 'Lucas',
        clinician_last_name = 'Predmore',
        clinician_email = 'info@valorwell.org',
        updated_at = now();
        
    RAISE NOTICE 'Clinician record created/updated for user ID: %', user_id;
END $$;