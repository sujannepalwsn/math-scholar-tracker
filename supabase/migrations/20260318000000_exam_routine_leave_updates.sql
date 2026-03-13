-- Migration for Exam, Routine, and Leave updates
-- Requirement 1, 10, 11

-- 1. Update exams table
ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS grades TEXT[];

-- Migrate existing grade to grades array if start_date/end_date are not set
UPDATE public.exams SET grades = ARRAY[grade], start_date = exam_date, end_date = exam_date WHERE grades IS NULL;

-- 2. Update period_schedules table
ALTER TABLE public.period_schedules
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS substitute_teacher_id UUID REFERENCES public.teachers(id),
ADD COLUMN IF NOT EXISTS attendance_verified BOOLEAN DEFAULT false;

-- To fulfill requirement 11 strictly, adding redundant columns if needed, but linking to class_periods is better.
-- However, I will add them as they might be needed for CSV import/export without complex joins.
ALTER TABLE public.period_schedules
ADD COLUMN IF NOT EXISTS period_number INTEGER,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- 3. Update leave_applications table
ALTER TABLE public.leave_applications
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS leave_date DATE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id);

-- Backfill leave_date from start_date
UPDATE public.leave_applications SET leave_date = start_date WHERE leave_date IS NULL;
