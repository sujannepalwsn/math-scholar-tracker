-- Fix for Teacher Login Creation Permission Denied
-- Description: Ensures service_role and authenticated Center Admins have correct permissions on the users table.

BEGIN;

-- 1. Ensure GRANTs are correct
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO postgres;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- 2. Explicitly disable FORCE RLS if it was enabled (just in case)
ALTER TABLE public.users NO FORCE ROW LEVEL SECURITY;

-- 3. Update Policies for users table to be more robust
DROP POLICY IF EXISTS "Center Admin manage users" ON public.users;

-- Re-create policy with both USING and WITH CHECK for clarity
-- This allows Center Admins to see, update, and insert users for their center
CREATE POLICY "Center Admin manage users" ON public.users
FOR ALL TO authenticated
USING (
    (public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id)
)
WITH CHECK (
    (public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id)
);

-- 4. Add a specific policy for the service_role just in case RLS is being applied
CREATE POLICY "Service role bypass" ON public.users
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 5. Ensure audit logs also have correct permissions
GRANT ALL ON public.audit_logs TO service_role;
GRANT INSERT ON public.audit_logs TO authenticated;

-- 6. Add a policy for Center Admin to see users in their center by role
-- This might be needed if they are trying to select before the role is set
-- but the current policies should cover it.

COMMIT;
