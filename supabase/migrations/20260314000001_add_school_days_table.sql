-- Create school_days table for attendance control
CREATE TABLE IF NOT EXISTS public.school_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_school_day BOOLEAN NOT NULL DEFAULT true,
  reason TEXT, -- Holiday, Exam, Special Closure, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(center_id, date)
);

-- Enable RLS
ALTER TABLE public.school_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view school days of their center" ON public.school_days;
    CREATE POLICY "Users can view school days of their center" ON public.school_days
      FOR SELECT USING (is_same_center(center_id));

    DROP POLICY IF EXISTS "Center admins can manage school days" ON public.school_days;
    CREATE POLICY "Center admins can manage school days" ON public.school_days
      FOR ALL USING (is_same_center(center_id));
END $$;
