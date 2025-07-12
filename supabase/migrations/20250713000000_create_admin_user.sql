-- Delete any existing admin users to avoid conflicts
DELETE FROM auth.users WHERE email IN ('sujan1nepal@gmail.com', 'sujan01nepal@gmail.com', 'admin@test.com', 'test@admin.com');
DELETE FROM public.profiles WHERE email IN ('sujan1nepal@gmail.com', 'sujan01nepal@gmail.com', 'admin@test.com', 'test@admin.com');

-- Create the admin user with the correct credentials
DO $$
DECLARE
    admin_id UUID;
BEGIN
    admin_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        role,
        aud
    ) VALUES (
        admin_id,
        'sujan1nepal@gmail.com',
        crypt('precioussn', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"full_name": "Admin User", "role": "admin"}'::jsonb,
        'authenticated',
        'authenticated'
    );

    -- Insert into profiles
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role
    ) VALUES (
        admin_id,
        'sujan1nepal@gmail.com',
        'Admin User',
        'admin'::user_role
    );
END $$;
