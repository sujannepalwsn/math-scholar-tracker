-- Add exam_date column to exam_subjects table
ALTER TABLE public.exam_subjects ADD COLUMN IF NOT EXISTS exam_date DATE;
