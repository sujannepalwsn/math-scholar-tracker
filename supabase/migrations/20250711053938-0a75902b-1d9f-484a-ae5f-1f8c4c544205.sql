
-- First, clean up any existing problematic data and schema
DELETE FROM auth.users WHERE email IN ('sujan1nepal@gmail.com', 'sujan01nepal@gmail.com');

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_update() CASCADE;

-- Drop the profiles table to recreate it properly
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop and recreate the user_role enum to ensure it's properly recognized
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'student', 'parent', 'co_teacher');

-- Create profiles table with proper constraints
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    phone TEXT,
    avatar_url TEXT,
    grade TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create function to handle new user registration with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone, grade)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'grade'
    );
    RETURN new;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't block user creation
        RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        email = new.email,
        full_name = COALESCE(new.raw_user_meta_data->>'full_name', old.raw_user_meta_data->>'full_name', full_name),
        role = COALESCE((new.raw_user_meta_data->>'role')::user_role, (old.raw_user_meta_data->>'role')::user_role, role),
        phone = COALESCE(new.raw_user_meta_data->>'phone', old.raw_user_meta_data->>'phone', phone),
        grade = COALESCE(new.raw_user_meta_data->>'grade', old.raw_user_meta_data->>'grade', grade),
        updated_at = now()
    WHERE id = new.id;
    RETURN new;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't block user updates
        RAISE WARNING 'Failed to update profile for user %: %', new.id, SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Create admin user with correct email and ensure profile is created
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    role
) VALUES (
    gen_random_uuid(),
    'sujan01nepal@gmail.com',
    crypt('precioussn', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Admin User", "role": "admin"}'::jsonb,
    'authenticated'
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt('precioussn', gen_salt('bf')),
    raw_user_meta_data = '{"full_name": "Admin User", "role": "admin"}'::jsonb,
    updated_at = now();

-- Ensure admin profile is created correctly
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role
) 
SELECT 
    id,
    'sujan01nepal@gmail.com',
    'Admin User',
    'admin'::user_role
FROM auth.users 
WHERE email = 'sujan01nepal@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin'::user_role,
    full_name = 'Admin User',
    updated_at = now();
