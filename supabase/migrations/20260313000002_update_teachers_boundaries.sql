-- Update expected check-in/out boundaries to teachers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='expected_check_in') THEN
    ALTER TABLE public.teachers ADD COLUMN expected_check_in TIME DEFAULT '09:00:00';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teachers' AND column_name='expected_check_out') THEN
    ALTER TABLE public.teachers ADD COLUMN expected_check_out TIME DEFAULT '17:00:00';
  END IF;
END $$;
