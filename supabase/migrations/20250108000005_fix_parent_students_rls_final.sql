-- Final fix for parent_students RLS - Using a security definer function approach

-- Create a helper function that safely checks if a center user can manage a parent-student link
CREATE OR REPLACE FUNCTION public.can_center_manage_parent_student_link(
  p_parent_user_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_center_id uuid;
  v_parent_center_id uuid;
  v_student_center_id uuid;
BEGIN
  -- Get current user's center_id
  SELECT center_id INTO v_user_center_id
  FROM public.users
  WHERE id = auth.uid() AND role = 'center';
  
  IF v_user_center_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get parent's center_id
  SELECT center_id INTO v_parent_center_id
  FROM public.users
  WHERE id = p_parent_user_id;
  
  -- Get student's center_id
  SELECT center_id INTO v_student_center_id
  FROM public.students
  WHERE id = p_student_id;
  
  -- Check all belong to same center
  RETURN v_parent_center_id = v_user_center_id 
     AND v_student_center_id = v_user_center_id;
END;
$$;

-- Drop all existing center user policies
DROP POLICY IF EXISTS "Center users can manage their own data on parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can insert parent-student links" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can insert parent-student links within their cente" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can link parents to students within their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can view parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can update parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can delete parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can manage parent-student links in their center" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can manage parent-student links" ON public.parent_students;

-- Create new policy using the helper function
CREATE POLICY "Center users can manage parent-student links"
ON public.parent_students
FOR ALL
USING (
  public.can_center_manage_parent_student_link(
    parent_students.parent_user_id,
    parent_students.student_id
  )
)
WITH CHECK (
  public.can_center_manage_parent_student_link(
    parent_students.parent_user_id,
    parent_students.student_id
  )
);

