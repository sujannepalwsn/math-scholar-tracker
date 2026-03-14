-- Update exams table to support multi-grade and date range
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exams' AND column_name='start_date') THEN
    ALTER TABLE public.exams ADD COLUMN start_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exams' AND column_name='end_date') THEN
    ALTER TABLE public.exams ADD COLUMN end_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exams' AND column_name='applicable_grades') THEN
    ALTER TABLE public.exams ADD COLUMN applicable_grades TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exams' AND column_name='description') THEN
    ALTER TABLE public.exams ADD COLUMN description TEXT;
  END IF;
END $$;

-- Migrate existing grade to applicable_grades if applicable_grades is empty
UPDATE public.exams
SET applicable_grades = ARRAY[grade]
WHERE (applicable_grades IS NULL OR array_length(applicable_grades, 1) IS NULL)
AND grade IS NOT NULL;

-- Migrate existing exam_date to start_date/end_date if they are null
UPDATE public.exams
SET start_date = exam_date, end_date = exam_date
WHERE start_date IS NULL AND exam_date IS NOT NULL;
