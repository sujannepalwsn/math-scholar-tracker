-- Fix for Activity Tracking 403 Forbidden
-- Date: 2026-11-09
-- Description: Specifically allowing users to update their last_active_at without complex role checks in WITH CHECK.

BEGIN;

-- 1. Redefine the user self-update policy
DROP POLICY IF EXISTS "Allow users to update their own record" ON public.users;

-- Re-apply policy with relaxed check specifically for non-sensitive fields
-- Or we keep it robust but ensure it doesn't fail on role/center check for simple updates.
CREATE POLICY "Allow users to update their own record" ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  -- If role or center_id is being changed, ensure they match existing values
  -- The IS NOT DISTINCT FROM is safe for NULLs
  (role IS NOT DISTINCT FROM (SELECT role FROM public.users WHERE id = auth.uid())) AND
  (center_id IS NOT DISTINCT FROM (SELECT center_id FROM public.users WHERE id = auth.uid()))
);

-- Alternative simpler policy if above still causes issues due to subquery in WITH CHECK
/*
CREATE POLICY "Allow users to update their own record" ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
*/
-- But the instructions in memories suggest preventing self-modifying sensitive fields.

COMMIT;
