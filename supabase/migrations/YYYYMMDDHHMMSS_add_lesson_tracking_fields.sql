-- Add teacher_notes column
ALTER TABLE public.student_chapters
ADD COLUMN teacher_notes TEXT;

-- Add evaluation_rating column
ALTER TABLE public.student_chapters
ADD COLUMN evaluation_rating INTEGER CHECK (evaluation_rating >= 1 AND evaluation_rating <= 5);

-- Add recorded_by_teacher_id column
ALTER TABLE public.student_chapters
ADD COLUMN recorded_by_teacher_id UUID;

-- Add foreign key constraint for recorded_by_teacher_id
ALTER TABLE public.student_chapters
ADD CONSTRAINT student_chapters_recorded_by_teacher_id_fkey
FOREIGN KEY (recorded_by_teacher_id) REFERENCES public.teachers(id)
ON DELETE SET NULL;

-- Optional: Add index for faster lookups on recorded_by_teacher_id
CREATE INDEX IF NOT EXISTS idx_student_chapters_recorded_by_teacher_id ON public.student_chapters (recorded_by_teacher_id);

-- Update RLS policies if necessary (example, adjust as per your RLS setup)
-- For example, to allow teachers to update their own notes:
-- ALTER POLICY "Teachers can update their own lesson records" ON public.student_chapters
-- FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.teachers WHERE id = recorded_by_teacher_id));