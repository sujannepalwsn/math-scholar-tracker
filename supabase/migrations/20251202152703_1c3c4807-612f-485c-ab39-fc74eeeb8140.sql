-- Add student_id and teacher_id columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id),
ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id),
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;