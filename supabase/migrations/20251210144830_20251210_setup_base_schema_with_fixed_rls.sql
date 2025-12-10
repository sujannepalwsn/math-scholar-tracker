/*
  # Base schema setup with fixed RLS policies
  
  This migration sets up the complete schema for a school management system
  with proper RLS policies for all operations.
*/

-- Create centers table first
CREATE TABLE IF NOT EXISTS public.centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create users table with center reference
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  center_id UUID REFERENCES public.centers(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'center', 'teacher', 'student', 'parent')),
  is_active BOOLEAN DEFAULT true,
  student_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create center_events table
CREATE TABLE IF NOT EXISTS public.center_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'event',
  is_holiday BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create parent_students junction table
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parent_user_id, student_id)
);

-- NOW create the helper function after tables exist
CREATE OR REPLACE FUNCTION public.is_same_center(target_center_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND center_id = target_center_id
  )
$$;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- ====== CENTER_EVENTS RLS POLICIES ======

-- Service role has full access
CREATE POLICY "center_events_service_role_all"
  ON public.center_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view events from their center
CREATE POLICY "center_events_select"
  ON public.center_events
  FOR SELECT
  TO authenticated
  USING (public.is_same_center(center_id));

-- Users can create events in their center
CREATE POLICY "center_events_insert"
  ON public.center_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_same_center(center_id));

-- Users can update events in their center
CREATE POLICY "center_events_update"
  ON public.center_events
  FOR UPDATE
  TO authenticated
  USING (public.is_same_center(center_id))
  WITH CHECK (public.is_same_center(center_id));

-- Users can delete events in their center
CREATE POLICY "center_events_delete"
  ON public.center_events
  FOR DELETE
  TO authenticated
  USING (public.is_same_center(center_id));

-- ====== PARENT_STUDENTS RLS POLICIES ======

-- Service role has full access
CREATE POLICY "parent_students_service_role_all"
  ON public.parent_students
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Center users can view parent-student links within their center
CREATE POLICY "parent_students_center_select"
  ON public.parent_students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'center'
      AND u.center_id IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.users pu
      WHERE pu.id = parent_students.parent_user_id
      AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
    )
  );

-- Center users can insert parent-student links
CREATE POLICY "parent_students_center_insert"
  ON public.parent_students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'center'
      AND u.center_id IS NOT NULL
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

-- Center users can update parent-student links
CREATE POLICY "parent_students_center_update"
  ON public.parent_students
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'center'
      AND u.center_id IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.users pu
      WHERE pu.id = parent_students.parent_user_id
      AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'center'
      AND u.center_id IS NOT NULL
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

-- Center users can delete parent-student links
CREATE POLICY "parent_students_center_delete"
  ON public.parent_students
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'center'
      AND u.center_id IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.users pu
      WHERE pu.id = parent_students.parent_user_id
      AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
    )
  );

-- Parents can view their own student links
CREATE POLICY "parent_students_parent_select"
  ON public.parent_students
  FOR SELECT
  TO authenticated
  USING (parent_students.parent_user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_center_events_center_date ON public.center_events(center_id, event_date);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON public.parent_students(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON public.parent_students(student_id);
