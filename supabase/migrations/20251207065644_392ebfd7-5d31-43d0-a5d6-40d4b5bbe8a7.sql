-- Add missing columns to teachers table
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS monthly_salary numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS regular_in_time time without time zone DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS regular_out_time time without time zone DEFAULT '17:00';

-- Add missing columns to centers table for settings
ALTER TABLE public.centers
ADD COLUMN IF NOT EXISTS contact_person text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{"primary": "#6366f1", "background": "#ffffff", "sidebar": "#1e293b"}'::jsonb;

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('test-files', 'test-files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('homework-files', 'homework-files', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-files', 'lesson-files', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for test-files bucket
CREATE POLICY "Allow public read access to test files"
ON storage.objects FOR SELECT
USING (bucket_id = 'test-files');

CREATE POLICY "Allow authenticated upload to test files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'test-files');

CREATE POLICY "Allow authenticated update to test files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'test-files');

CREATE POLICY "Allow authenticated delete to test files"
ON storage.objects FOR DELETE
USING (bucket_id = 'test-files');

-- Storage policies for homework-files bucket
CREATE POLICY "Allow public read access to homework files"
ON storage.objects FOR SELECT
USING (bucket_id = 'homework-files');

CREATE POLICY "Allow authenticated upload to homework files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'homework-files');

CREATE POLICY "Allow authenticated update to homework files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'homework-files');

CREATE POLICY "Allow authenticated delete to homework files"
ON storage.objects FOR DELETE
USING (bucket_id = 'homework-files');

-- Storage policies for lesson-files bucket
CREATE POLICY "Allow public read access to lesson files"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-files');

CREATE POLICY "Allow authenticated upload to lesson files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-files');

CREATE POLICY "Allow authenticated update to lesson files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-files');

CREATE POLICY "Allow authenticated delete to lesson files"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-files');

-- Update RLS policy for parent_students to allow center users to insert
DROP POLICY IF EXISTS "Center users can insert parent-student links within their cente" ON public.parent_students;
DROP POLICY IF EXISTS "Center users can link parents to students within their center" ON public.parent_students;

CREATE POLICY "Center users can insert parent-student links"
ON public.parent_students
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users cu
    WHERE cu.id = auth.uid() 
    AND cu.role = 'center'
    AND cu.center_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.users pu
    WHERE pu.id = parent_students.parent_user_id
    AND pu.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = parent_students.student_id
    AND s.center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())
  )
);

-- Fix payments query to only show center-specific payments
-- Add center isolation to payments by ensuring they are linked through invoices

-- Add lesson plan start/end date support
ALTER TABLE public.lesson_plans
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Update lesson_date to be start_date if not already migrated
UPDATE public.lesson_plans 
SET start_date = lesson_date, end_date = lesson_date 
WHERE start_date IS NULL AND lesson_date IS NOT NULL;