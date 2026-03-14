-- Add is_published to class_periods if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='class_periods' AND column_name='is_published') THEN
    ALTER TABLE public.class_periods ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
