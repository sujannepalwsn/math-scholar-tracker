-- Add missing columns that the code expects

-- Homework table - add attachment columns
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Lesson plans - add missing columns  
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS lesson_file_url TEXT;
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE public.lesson_plans ADD COLUMN IF NOT EXISTS notes TEXT;

-- Discipline issues - rename columns to match code expectations
ALTER TABLE public.discipline_issues RENAME COLUMN category_id TO discipline_category_id;
ALTER TABLE public.discipline_issues RENAME COLUMN date TO issue_date;

-- Students - add contact_number column
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS contact_number TEXT;

-- Tests - add missing columns
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS test_date DATE;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS max_marks INTEGER;

-- Attendance - add additional columns
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS notes TEXT;