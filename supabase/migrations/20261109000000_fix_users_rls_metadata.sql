-- Migration to ensure users can read and update their own metadata (e.g., active_academic_year)
-- This migration hardens the RLS policies on the users table and fixes 403 Forbidden errors.

BEGIN;

-- 1. Ensure private lookup exists and is isolation
CREATE SCHEMA IF NOT EXISTS security;
CREATE OR REPLACE VIEW security.users_private_lookup AS SELECT id, role, center_id, student_id, teacher_id FROM public.users;
REVOKE ALL ON security.users_private_lookup FROM public, anon, authenticated;
GRANT SELECT ON security.users_private_lookup TO postgres, service_role;

-- 2. Security Definer Helper Functions (using public. schema for compatibility)
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS TEXT AS $$ SELECT role FROM security.users_private_lookup WHERE id = auth.uid(); $$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION public.get_user_center_id() RETURNS UUID AS $$ SELECT center_id FROM security.users_private_lookup WHERE id = auth.uid(); $$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. Hardened Policies for Users table
-- DROP existing policies first to prevent conflicts
DROP POLICY IF EXISTS "User self view users" ON public.users;
DROP POLICY IF EXISTS "User self update users" ON public.users;
DROP POLICY IF EXISTS "Allow users to view their own record" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own record" ON public.users;
DROP POLICY IF EXISTS "Center Admin manage users" ON public.users;

-- Re-apply policies with corrected logic
CREATE POLICY "User self view users" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "User self update users" ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = public.get_user_role() AND
  (center_id IS NOT DISTINCT FROM public.get_user_center_id())
);

CREATE POLICY "Center Admin manage users" ON public.users
FOR ALL TO authenticated
USING (public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id);

COMMIT;
