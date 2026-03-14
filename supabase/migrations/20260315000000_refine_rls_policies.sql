-- Refine RLS policies for leave_categories and notifications
-- Migration: 20260315000000_refine_rls_policies.sql

DO $$
BEGIN
    -- 1. Refine leave_categories: Allow reading global categories (center_id IS NULL)
    DROP POLICY IF EXISTS "Center and Admin access on leave_categories" ON public.leave_categories;
    DROP POLICY IF EXISTS "Teacher read access on leave_categories" ON public.leave_categories;

    CREATE POLICY "Allow users to view their center or global leave categories"
    ON public.leave_categories FOR SELECT
    USING (
      center_id IS NULL
      OR is_same_center(center_id)
    );

    CREATE POLICY "Center admins can manage their center categories"
    ON public.leave_categories FOR ALL
    USING (get_user_role() = 'center' AND is_same_center(center_id))
    WITH CHECK (get_user_role() = 'center' AND is_same_center(center_id));

    CREATE POLICY "Admins can manage all leave categories"
    ON public.leave_categories FOR ALL
    USING (get_user_role() = 'admin');

    -- 2. Refine notifications: Ensure user-level isolation
    DROP POLICY IF EXISTS "Center and Admin access on notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Teacher read access on notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Allow any user to insert notifications" ON public.notifications;

    -- SELECT policy for notifications
    CREATE POLICY "Users can view their own notifications or center broadcasts"
    ON public.notifications FOR SELECT
    USING (
      (user_id = auth.uid()) -- Personal notification
      OR (user_id IS NULL AND is_same_center(center_id) AND get_user_role() = 'center') -- Center broadcast
      OR (get_user_role() = 'admin') -- Super Admin access
    );

    -- INSERT policy for notifications (allow authenticated users to send notifications)
    CREATE POLICY "Authenticated users can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

    -- UPDATE policy (to mark as read)
    CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid() OR (user_id IS NULL AND is_same_center(center_id) AND get_user_role() = 'center'))
    WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND is_same_center(center_id) AND get_user_role() = 'center'));

    -- DELETE policy
    CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (user_id = auth.uid() OR (user_id IS NULL AND is_same_center(center_id) AND get_user_role() = 'center') OR get_user_role() = 'admin');

END $$;
