-- Update lesson_plans table for formal approval workflow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='title') THEN
    ALTER TABLE public.lesson_plans ADD COLUMN title TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='description') THEN
    ALTER TABLE public.lesson_plans ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='submitted_at') THEN
    ALTER TABLE public.lesson_plans ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='approved_at') THEN
    ALTER TABLE public.lesson_plans ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='rejection_reason') THEN
    ALTER TABLE public.lesson_plans ADD COLUMN rejection_reason TEXT;
  END IF;

  -- Add constraints for status if not exists, but it likely already has them
  -- Let's ensure 'submitted' is a valid status if there's a check constraint
END $$;

-- Migrate existing approval_date to approved_at if needed
UPDATE public.lesson_plans SET approved_at = approval_date WHERE approved_at IS NULL AND approval_date IS NOT NULL;
