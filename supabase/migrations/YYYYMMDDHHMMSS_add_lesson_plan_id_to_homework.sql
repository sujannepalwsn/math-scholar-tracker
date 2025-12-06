-- Add lesson_plan_id to homework table
ALTER TABLE public.homework
ADD COLUMN lesson_plan_id uuid NULL;

-- Add foreign key constraint
ALTER TABLE public.homework
ADD CONSTRAINT homework_lesson_plan_id_fkey
FOREIGN KEY (lesson_plan_id) REFERENCES public.lesson_plans(id)
ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_homework_lesson_plan_id ON public.homework (lesson_plan_id);