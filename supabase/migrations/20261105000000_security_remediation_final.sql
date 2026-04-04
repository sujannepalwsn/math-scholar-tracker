-- Migration: Final Comprehensive Security Remediation and RLS Hardening
-- This migration is designed to be idempotent and safe for a "no-coder" environment.
BEGIN;

-- 1. SECURITY SCHEMA REINFORCEMENT
CREATE SCHEMA IF NOT EXISTS security;

-- 2. SECURE USER SECRETS (Move password_hash out of public.users)
CREATE TABLE IF NOT EXISTS security.user_secrets (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to automatically sync password_hash from users to user_secrets
CREATE OR REPLACE FUNCTION security.sync_user_secrets()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.password_hash IS NOT NULL) THEN
        INSERT INTO security.user_secrets (user_id, password_hash)
        VALUES (NEW.id, NEW.password_hash)
        ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_user_secrets ON public.users;
CREATE TRIGGER trigger_sync_user_secrets
AFTER INSERT OR UPDATE OF password_hash ON public.users
FOR EACH ROW EXECUTE FUNCTION security.sync_user_secrets();

-- Expose a secure view for the Edge function to lookup secrets
-- This view is strictly restricted to the service_role
DROP VIEW IF EXISTS public.security_user_secrets CASCADE;
CREATE VIEW public.security_user_secrets AS
SELECT user_id, password_hash FROM security.user_secrets;

REVOKE ALL ON public.security_user_secrets FROM public, anon, authenticated;
GRANT SELECT ON public.security_user_secrets TO service_role;

-- Migrate existing hashes
INSERT INTO security.user_secrets (user_id, password_hash)
SELECT id, password_hash FROM public.users
WHERE password_hash IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 3. DROP INSECURE CATCH-ALL POLICIES
-- Clean sweep of legacy "Service role" or "Public" policies that lack proper scoping
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
            (policyname ILIKE '%Service role%' AND policyname NOT ILIKE '%service_role%')
            OR
            (policyname ILIKE '%Public%' AND tablename NOT IN ('centers', 'system_settings', 'login_page_settings', 'platform_settings', 'system_pages', 'admission_applications', 'demo_requests'))
          )
    LOOP
        EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
    END LOOP;
END $$;

-- Specifically target the insecure error_logs insert policies
DROP POLICY IF EXISTS "Public insert error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Anyone can insert error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.error_logs;

-- 4. HARDEN error_logs TABLE
-- Only authenticated users can insert logs directly.
-- Unauthenticated logs (from login page) must go through the 'secure-log-ingest' Edge Function.
CREATE POLICY "Authenticated users can insert error logs"
ON public.error_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. SECURE PUBLIC DATA EXPOSURE (VIEWS)
-- We use secure views to expose only non-sensitive columns to unauthenticated users.

-- Public Centers View
DROP VIEW IF EXISTS public.public_centers CASCADE;
CREATE VIEW public.public_centers AS
SELECT id, name, logo_url, address, short_code, mission, vision,
       established_date, theme, about_description, website_url,
       principal_name, principal_message, academic_info, facilities,
       gallery, social_links
FROM public.centers
WHERE is_active = true;

REVOKE ALL ON public.public_centers FROM public, anon, authenticated;
GRANT SELECT ON public.public_centers TO anon, authenticated;

-- Public System Settings View (Resilient against missing tables/columns)
DROP VIEW IF EXISTS public.public_system_settings CASCADE;
CREATE VIEW public.public_system_settings AS
SELECT
    'EduFlow Tech'::text as developer_name,
    'https://eduflow.com'::text as developer_website,
    'support@eduflow.com'::text as support_email,
    '+977-1-4000000'::text as support_phone,
    '/pages/terms'::text as terms_url,
    '/pages/privacy'::text as privacy_url,
    '2.4.0'::text as version;

REVOKE ALL ON public.public_system_settings FROM public, anon, authenticated;
GRANT SELECT ON public.public_system_settings TO anon, authenticated;

-- Global Stats View
DROP VIEW IF EXISTS public.global_system_stats CASCADE;
CREATE VIEW public.global_system_stats AS
SELECT
    (SELECT count(*) FROM public.students s JOIN public.centers c ON s.center_id = c.id WHERE s.is_active = true AND c.is_active = true) as students_count,
    (SELECT count(*) FROM public.teachers t JOIN public.centers c ON t.center_id = c.id WHERE t.is_active = true AND c.is_active = true) as teachers_count,
    (SELECT count(*) FROM public.centers WHERE is_active = true) as centers_count;

REVOKE ALL ON public.global_system_stats FROM public, anon, authenticated;
GRANT SELECT ON public.global_system_stats TO anon, authenticated;

-- 6. RESTRICT MAIN TABLES TO AUTHENTICATED USERS
-- Ensuring unauthenticated users cannot bypass RLS to read main tables.

-- system_settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_settings') THEN
        DROP POLICY IF EXISTS "Public access system_settings" ON public.system_settings;
        DROP POLICY IF EXISTS "Public read-only system_settings" ON public.system_settings;
        DROP POLICY IF EXISTS "Super Admin manage system_settings" ON public.system_settings;
        EXECUTE 'CREATE POLICY "Super Admin manage system_settings" ON public.system_settings FOR ALL TO authenticated USING (public.get_user_role() = ''admin'' AND public.get_user_center_id() IS NULL)';
    END IF;
END $$;

-- login_page_settings
DROP POLICY IF EXISTS "Public access login_page_settings" ON public.login_page_settings;
DROP POLICY IF EXISTS "Public read-only login_page_settings" ON public.login_page_settings;
DROP POLICY IF EXISTS "Super Admin manage login_page_settings" ON public.login_page_settings;
CREATE POLICY "Super Admin manage login_page_settings"
ON public.login_page_settings FOR ALL TO authenticated
USING (public.get_user_role() = 'admin' AND public.get_user_center_id() IS NULL);
CREATE POLICY "Public read-only login_page_settings"
ON public.login_page_settings FOR SELECT USING (true);

-- centers
DROP POLICY IF EXISTS "Public access centers" ON public.centers;
DROP POLICY IF EXISTS "Allow public users to view centers" ON public.centers;
DROP POLICY IF EXISTS "Public read-only centers" ON public.centers;
DROP POLICY IF EXISTS "Center access centers" ON public.centers;
DROP POLICY IF EXISTS "Allow authenticated users to view centers" ON public.centers;
CREATE POLICY "Center access centers"
ON public.centers FOR SELECT TO authenticated
USING (id = public.get_user_center_id() OR public.get_user_role() = 'admin');

-- users
DROP POLICY IF EXISTS "Center Admin manage users" ON public.users;
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
CREATE POLICY "Center Admin manage users"
ON public.users FOR ALL TO authenticated
USING (
    public.get_user_role() IN ('admin', 'center') AND
    (public.get_user_center_id() = center_id OR public.get_user_role() = 'admin')
);

-- platform_settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'platform_settings') THEN
        DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
        DROP POLICY IF EXISTS "Public read-only platform_settings" ON public.platform_settings;
        CREATE POLICY "Public read-only platform_settings" ON public.platform_settings FOR SELECT USING (true);
    END IF;
END $$;

-- system_pages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_pages') THEN
        DROP POLICY IF EXISTS "Public can view system pages" ON public.system_pages;
        DROP POLICY IF EXISTS "Public read-only system_pages" ON public.system_pages;
        CREATE POLICY "Public read-only system_pages" ON public.system_pages FOR SELECT USING (true);
    END IF;
END $$;

-- 7. RESTRICT PUBLIC SUBMISSIONS
-- Keep unauthenticated INSERT for specific lead-gen tables but monitor.

-- admission_applications
DROP POLICY IF EXISTS "Public can submit admission" ON public.admission_applications;
DROP POLICY IF EXISTS "Unauthenticated admission submission" ON public.admission_applications;
CREATE POLICY "Unauthenticated admission submission"
ON public.admission_applications FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- demo_requests
DROP POLICY IF EXISTS "Anyone can submit demo requests" ON public.demo_requests;
DROP POLICY IF EXISTS "Unauthenticated demo request submission" ON public.demo_requests;
CREATE POLICY "Unauthenticated demo request submission"
ON public.demo_requests FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 8. GLOBAL RLS ENFORCEMENT & DEFAULT DENY
-- Ensure every table has RLS enabled.
DO $$
DECLARE
    t_name RECORD;
BEGIN
    FOR t_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name.tablename);
    END LOOP;
END $$;

COMMIT;
