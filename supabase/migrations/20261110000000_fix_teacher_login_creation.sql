-- Fix for Teacher Login Creation Permission Denied
-- Description: Ensures service_role and authenticated Center Admins have correct permissions on the users table.

BEGIN;

-- 1. Ensure GRANTs are correct
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- 2. Explicitly disable FORCE RLS if it was enabled (just in case)
-- This ensures the service_role can always bypass RLS
ALTER TABLE public.users NO FORCE ROW LEVEL SECURITY;

-- 3. Update Policies for users table
-- We ensure that Center Admins have full access to users within their center.
DROP POLICY IF EXISTS "Center Admin manage users" ON public.users;

CREATE POLICY "Center Admin manage users" ON public.users
FOR ALL TO authenticated
USING (
    (public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id)
)
WITH CHECK (
    (public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id)
);

-- 4. Add a specific policy for the service_role
-- While service_role usually bypasses RLS, having an explicit policy doesn't hurt and acts as a safety net.
DROP POLICY IF EXISTS "Service role bypass" ON public.users;
CREATE POLICY "Service role bypass" ON public.users
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 5. Ensure audit logs also have correct permissions
GRANT ALL ON public.audit_logs TO service_role;
GRANT INSERT, SELECT ON public.audit_logs TO authenticated;

COMMIT;
