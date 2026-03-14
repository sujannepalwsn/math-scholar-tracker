-- Update leave_applications table for emergency and mid-day leave
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_applications' AND column_name='leave_type') THEN
    ALTER TABLE public.leave_applications ADD COLUMN leave_type TEXT DEFAULT 'regular' CHECK (leave_type IN ('regular', 'emergency'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_applications' AND column_name='start_time') THEN
    ALTER TABLE public.leave_applications ADD COLUMN start_time TIME;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leave_applications' AND column_name='end_time') THEN
    ALTER TABLE public.leave_applications ADD COLUMN end_time TIME;
  END IF;
END $$;
