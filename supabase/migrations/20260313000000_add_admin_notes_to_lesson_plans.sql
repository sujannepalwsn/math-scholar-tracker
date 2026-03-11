-- Add admin_notes column to lesson_plans to store institutional feedback
ALTER TABLE public.lesson_plans
ADD COLUMN IF NOT EXISTS admin_notes TEXT;
