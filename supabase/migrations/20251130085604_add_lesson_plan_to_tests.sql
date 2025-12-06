-- Add lesson_plan_id column to tests table
ALTER TABLE public.tests
ADD COLUMN lesson_plan_id uuid NULL;

-- Add foreign key constraint to link tests to lesson_plans
ALTER TABLE public.tests
ADD CONSTRAINT tests_lesson_plan_id_fkey
FOREIGN KEY (lesson_plan_id) REFERENCES public.lesson_plans(id)
ON DELETE SET NULL;

-- Create an index on lesson_plan_id for faster lookups
CREATE INDEX tests_lesson_plan_id_idx ON public.tests (lesson_plan_id);

-- Optional: Update existing tests to link to a lesson plan if a matching subject/grade exists
-- This is a more complex operation and might require custom logic based on your data.
-- For now, new tests can be linked, and existing ones will have NULL.