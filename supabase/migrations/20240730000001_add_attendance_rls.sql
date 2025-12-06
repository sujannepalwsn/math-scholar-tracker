-- Enable RLS on the attendance table
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policy for center users to SELECT their students' attendance
DROP POLICY IF EXISTS "Center users can view their students' attendance" ON public.attendance;
CREATE POLICY "Center users can view their students' attendance"
ON public.attendance FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid() AND users.center_id = attendance.center_id
  )
);

-- Policy for center users to INSERT attendance for their students
DROP POLICY IF EXISTS "Center users can insert attendance for their students" ON public.attendance;
CREATE POLICY "Center users can insert attendance for their students"
ON public.attendance FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid() AND users.center_id = attendance.center_id
  )
);

-- Policy for center users to UPDATE attendance for their students
DROP POLICY IF EXISTS "Center users can update attendance for their students" ON public.attendance;
CREATE POLICY "Center users can update attendance for their students"
ON public.attendance FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid() AND users.center_id = attendance.center_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid() AND users.center_id = attendance.center_id
  )
);

-- Policy for center users to DELETE attendance for their students
DROP POLICY IF EXISTS "Center users can delete attendance for their students" ON public.attendance;
CREATE POLICY "Center users can delete attendance for their students"
ON public.attendance FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid() AND users.center_id = attendance.center_id
  )
);