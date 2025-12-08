-- Fix RLS policies for parent_students table to allow center users to link children to parents
-- This version uses the helper functions and properly checks both parent and student

-- First, ensure the helper functions exist
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_center_id()
RETURNS uuid AS $$
  SELECT center_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop all existing center user policies on parent_students
DROP POLICY IF EXISTS "Center users can manage their own data on parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can insert parent-student links" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can insert parent-student links within their cente" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can link parents to students within their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can view parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can update parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can delete parent-student links in their center" ON public.parent_students;

-- Create a comprehensive policy for center users that checks both parent and student belong to their center
-- This uses a single policy for all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Center users can manage parent-student links in their center"
ON public.parent_students
FOR ALL
USING (
  -- For SELECT, UPDATE, DELETE: check existing records
  get_user_role() = 'center'
  AND get_user_center_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.id = parent_students.parent_user_id
    AND pu.center_id = get_user_center_id()
  )
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = parent_students.student_id
    AND s.center_id = get_user_center_id()
  )
)
WITH CHECK (
  -- For INSERT, UPDATE: check new/modified records
  get_user_role() = 'center'
  AND get_user_center_id() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.id = parent_students.parent_user_id
    AND pu.center_id = get_user_center_id()
  )
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = parent_students.student_id
    AND s.center_id = get_user_center_id()
  )
);


