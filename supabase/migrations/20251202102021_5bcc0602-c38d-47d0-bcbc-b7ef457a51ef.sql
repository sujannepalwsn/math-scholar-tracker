-- Add remaining missing tables

-- Teacher attendance
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id),
  center_id UUID NOT NULL REFERENCES public.centers(id),
  date DATE NOT NULL,
  status TEXT NOT NULL,
  time_in TIME,
  time_out TIME,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.teacher_attendance FOR ALL USING (true) WITH CHECK (true);

-- Meeting conclusions
CREATE TABLE IF NOT EXISTS public.meeting_conclusions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id),
  conclusion_notes TEXT NOT NULL,
  recorded_by UUID REFERENCES public.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_conclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.meeting_conclusions FOR ALL USING (true) WITH CHECK (true);

-- Test results - add question_marks column
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS question_marks JSONB;

-- Tests - add questions column
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS questions JSONB;