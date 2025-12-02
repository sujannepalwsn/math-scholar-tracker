-- Add grade column as alias to class (for backward compatibility with existing code)
ALTER TABLE public.students RENAME COLUMN class TO grade;

-- Also add missing tables that the code expects

-- Student homework records
CREATE TABLE public.student_homework_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.homework(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_homework_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.student_homework_records FOR ALL USING (true) WITH CHECK (true);

-- Student chapters (for lesson tracking)
CREATE TABLE public.student_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  lesson_plan_id UUID REFERENCES public.lesson_plans(id),
  chapter_name TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.student_chapters FOR ALL USING (true) WITH CHECK (true);

-- Test results (link between test_marks and tests with additional info)
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  marks_obtained NUMERIC,
  percentage NUMERIC,
  grade_earned TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.test_results FOR ALL USING (true) WITH CHECK (true);

-- Add grade column to homework table
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add grade column to lesson_plans table
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add lesson_date column to lesson_plans
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS lesson_date DATE;