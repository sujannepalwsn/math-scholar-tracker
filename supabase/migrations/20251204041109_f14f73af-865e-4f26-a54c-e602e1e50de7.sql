-- Create parent_students junction table to allow multiple children per parent
CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_user_id, student_id)
);

-- Enable RLS
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
CREATE POLICY "Service role full access on parent_students" 
ON public.parent_students 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Add submission_date column to student_homework_records if it doesn't exist
ALTER TABLE public.student_homework_records 
ADD COLUMN IF NOT EXISTS submission_date DATE;

-- Migrate existing parent-student relationships to the junction table
INSERT INTO public.parent_students (parent_user_id, student_id)
SELECT id, student_id 
FROM public.users 
WHERE role = 'parent' AND student_id IS NOT NULL
ON CONFLICT (parent_user_id, student_id) DO NOTHING;