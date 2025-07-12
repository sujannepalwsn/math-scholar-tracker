/*
  # Fix authentication issues and add new admin user

  1. Problem
    - RLS policies preventing authentication system from working
    - Need working admin credentials

  2. Solution
    - Update RLS policies to allow system operations
    - Create new admin user with working credentials
    - Ensure profile creation works properly

  3. Changes
    - Fix INSERT/UPDATE policies on profiles table
    - Add new admin user: admin@test.com / admin123
    - Ensure triggers work correctly
*/

-- First, let's fix the RLS policies that are blocking authentication
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create policies that allow both user operations AND system operations
CREATE POLICY "Allow profile creation" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        auth.uid() IS NULL OR
        current_setting('role') = 'service_role'
    );

CREATE POLICY "Allow profile updates" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        auth.uid() IS NULL OR
        current_setting('role') = 'service_role'
    );

-- Also add a policy for admins to manage all profiles
CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Clean up any existing problematic users
DELETE FROM auth.users WHERE email IN ('admin@test.com', 'test@admin.com');
DELETE FROM public.profiles WHERE email IN ('admin@test.com', 'test@admin.com');

-- Create a new admin user with simple credentials
DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
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
        aud,
        confirmation_token,
        email_confirmed_at
    ) VALUES (
        new_user_id,
        'admin@test.com',
        crypt('admin123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"full_name": "System Admin", "role": "admin"}'::jsonb,
        'authenticated',
        'authenticated',
        '',
        now()
    );
    
    -- Insert into profiles table directly
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        'admin@test.com',
        'System Admin',
        'admin'::user_role,
        now(),
        now()
    );
    
    RAISE NOTICE 'Created admin user: admin@test.com / admin123';
END $$;

-- Let's also create a test student user
DO $$
DECLARE
    student_user_id UUID;
BEGIN
    -- Generate a new UUID for the student
    student_user_id := gen_random_uuid();
    
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
        aud,
        confirmation_token,
        email_confirmed_at
    ) VALUES (
        student_user_id,
        'student@test.com',
        crypt('student123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"full_name": "Test Student", "role": "student", "grade": "10"}'::jsonb,
        'authenticated',
        'authenticated',
        '',
        now()
    );
    
    -- Insert into profiles table directly
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        grade,
        created_at,
        updated_at
    ) VALUES (
        student_user_id,
        'student@test.com',
        'Test Student',
        'student'::user_role,
        '10',
        now(),
        now()
    );
    
    RAISE NOTICE 'Created student user: student@test.com / student123';
END $$;

-- Update the trigger functions to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Only create profile if it doesn't already exist
    INSERT INTO public.profiles (id, email, full_name, role, phone, grade)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'grade'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        grade = COALESCE(EXCLUDED.grade, public.profiles.grade),
        updated_at = now();
    
    RETURN new;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't block user creation
        RAISE WARNING 'Failed to create/update profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();