-- Fix RLS policies for parent_students table - Simple direct approach
-- This version uses direct SQL checks without helper functions to avoid any recursion issues

-- Drop all existing center user policies on parent_students
DROP POLICY IF EXISTS "Center users can manage their own data on parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can insert parent-student links" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can insert parent-student links within their cente" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can link parents to students within their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can view parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can update parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can delete parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can manage parent-student links in their center" ON public.parent_students;

-- Create a simple, direct policy for center users
-- This policy checks that:
-- 1. The current user is a center user
-- 2. The parent user belongs to the same center as the current user
-- 3. The student belongs to the same center as the current user

CREATE POLICY "Center users can manage parent-student links"
ON public.parent_students
FOR ALL
USING (
  -- Check current user is center and get their center_id
  EXISTS (
    SELECT 1 FROM public.users current_user
    WHERE current_user.id = auth.uid()
    AND current_user.role = 'center'
    AND current_user.center_id IS NOT NULL
    -- Check parent belongs to same center
    AND EXISTS (
      SELECT 1 FROM public.users parent_user
      WHERE parent_user.id = parent_students.parent_user_id
      AND parent_user.center_id = current_user.center_id
    )
    -- Check student belongs to same center
    AND EXISTS (
      SELECT 1 FROM public.students student
      WHERE student.id = parent_students.student_id
      AND student.center_id = current_user.center_id
    )
  )
)
WITH CHECK (
  -- Same checks for INSERT/UPDATE operations
  EXISTS (
    SELECT 1 FROM public.users current_user
    WHERE current_user.id = auth.uid()
    AND current_user.role = 'center'
    AND current_user.center_id IS NOT NULL
    -- Check parent belongs to same center
    AND EXISTS (
      SELECT 1 FROM public.users parent_user
      WHERE parent_user.id = parent_students.parent_user_id
      AND parent_user.center_id = current_user.center_id
    )
    -- Check student belongs to same center
    AND EXISTS (
      SELECT 1 FROM public.students student
      WHERE student.id = parent_students.student_id
      AND student.center_id = current_user.center_id
    )
  )
);


