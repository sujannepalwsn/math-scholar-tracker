-- Fix RLS policies for parent_students table to allow center users to link children to parents

-- Drop all existing center user policies on parent_students
DROP POLICY IF EXISTS "Center users can manage their own data on parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can insert parent-student links" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can insert parent-student links within their cente" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can link parents to students within their center" ON public.parent_students;

-- Create comprehensive policies for center users
-- Policy for SELECT: Center users can view parent-student links where both parent and student belong to their center
CREATE POLICY "Center users can view parent-student links in their center"
ON public.parent_students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.id = auth.uid() 
    AND cu.role = 'center'
    AND cu.center_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.id = parent_students.parent_user_id
    AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = parent_students.student_id
    AND s.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
);

-- Policy for INSERT: Center users can create parent-student links where both parent and student belong to their center
CREATE POLICY "Center users can insert parent-student links in their center"
ON public.parent_students
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.id = auth.uid() 
    AND cu.role = 'center'
    AND cu.center_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.id = parent_students.parent_user_id
    AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = parent_students.student_id
    AND s.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
);

-- Policy for UPDATE: Center users can update parent-student links where both parent and student belong to their center
CREATE POLICY "Center users can update parent-student links in their center"
ON public.parent_students
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.id = auth.uid() 
    AND cu.role = 'center'
    AND cu.center_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.id = parent_students.parent_user_id
    AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = parent_students.student_id
    AND s.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.id = auth.uid() 
    AND cu.role = 'center'
    AND cu.center_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.id = parent_students.parent_user_id
    AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = parent_students.student_id
    AND s.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
);

-- Policy for DELETE: Center users can delete parent-student links where both parent and student belong to their center
CREATE POLICY "Center users can delete parent-student links in their center"
ON public.parent_students
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.id = auth.uid() 
    AND cu.role = 'center'
    AND cu.center_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.id = parent_students.parent_user_id
    AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = parent_students.student_id
    AND s.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
);


