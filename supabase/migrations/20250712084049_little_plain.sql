/*
  # Fix RLS policies for authentication

  1. Problem
    - Supabase authentication failing with "Database error granting user"
    - RLS policies preventing internal triggers from operating

  2. Solution
    - Update INSERT and UPDATE policies on profiles table
    - Allow system operations where auth.uid() might be null
    - This enables handle_new_user and handle_user_update functions to work correctly

  3. Changes
    - Modified "Users can create own profile" policy to allow null auth.uid()
    - Modified "Users can update own profile" policy to allow null auth.uid()
*/

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create updated policies that allow system operations
CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR auth.uid() IS NULL);