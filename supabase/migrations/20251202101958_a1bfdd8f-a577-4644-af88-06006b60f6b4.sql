-- Add remaining missing tables and columns

-- Activities table (base activities definition)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.activities FOR ALL USING (true) WITH CHECK (true);

-- Student activities (links students to activities)
CREATE TABLE IF NOT EXISTS public.student_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  activity_id UUID REFERENCES public.activities(id),
  activity_type_id UUID REFERENCES public.activity_types(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating INTEGER,
  notes TEXT,
  teacher_id UUID REFERENCES public.teachers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.student_activities FOR ALL USING (true) WITH CHECK (true);

-- Add missing columns to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_month INTEGER;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_year INTEGER;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_name TEXT;

-- Add missing columns to attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS time_in TIME;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS time_out TIME;

-- Add missing columns to test_results
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS date_taken DATE;

-- Student chapters - add notes column
ALTER TABLE public.student_chapters ADD COLUMN IF NOT EXISTS notes TEXT;