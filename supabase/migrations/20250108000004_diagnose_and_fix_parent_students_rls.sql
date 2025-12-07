-- Step 1: Check current policies on parent_students table
-- Run this first to see what policies exist:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'parent_students'
ORDER BY policyname;

-- Step 2: Drop ALL existing policies on parent_students (except service_role and admin)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'parent_students'
    AND policyname NOT LIKE '%service%'
    AND policyname NOT LIKE '%admin%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.parent_students', r.policyname);
  END LOOP;
END $$;

-- Step 3: Create comprehensive policies for parent_students

-- Policy for Admins (keep existing if it works)
DROP POLICY IF EXISTS "Admins can manage all data on parent_students" ON public.parent_students;
CREATE POLICY "Admins can manage all data on parent_students" 
ON public.parent_students 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy for Center users - comprehensive check
CREATE POLICY "Center users can manage parent-student links"
ON public.parent_students
FOR ALL
USING (
  -- Verify current user is a center user
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.id = auth.uid()
    AND cu.role = 'center'
    AND cu.center_id IS NOT NULL
    -- Verify parent user belongs to same center
    AND EXISTS (
      SELECT 1 FROM public.users pu
      WHERE pu.id = parent_students.parent_user_id
      AND pu.center_id = cu.center_id
    )
    -- Verify student belongs to same center
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = parent_students.student_id
      AND s.center_id = cu.center_id
    )
  )
)
WITH CHECK (
  -- Same checks for INSERT/UPDATE
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.id = auth.uid()
    AND cu.role = 'center'
    AND cu.center_id IS NOT NULL
    -- Verify parent user belongs to same center
    AND EXISTS (
      SELECT 1 FROM public.users pu
      WHERE pu.id = parent_students.parent_user_id
      AND pu.center_id = cu.center_id
    )
    -- Verify student belongs to same center
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = parent_students.student_id
      AND s.center_id = cu.center_id
    )
  )
);

-- Policy for Parent users to view their own links
DROP POLICY IF EXISTS "Parent users can view their own linked students" ON public.parent_students;
CREATE POLICY "Parent users can view their own linked students"
ON public.parent_students
FOR SELECT
USING (parent_user_id = auth.uid());

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'parent_students'
ORDER BY policyname;

