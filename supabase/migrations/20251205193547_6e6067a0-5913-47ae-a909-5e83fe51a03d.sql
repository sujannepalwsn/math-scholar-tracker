-- Add salary and time tracking columns to teachers table
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS monthly_salary numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS regular_in_time time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS regular_out_time time DEFAULT '17:00:00';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_teachers_center_salary ON public.teachers(center_id, monthly_salary);

-- Add comment for documentation
COMMENT ON COLUMN public.teachers.monthly_salary IS 'Monthly salary for the teacher';
COMMENT ON COLUMN public.teachers.regular_in_time IS 'Regular expected in-time for punctuality tracking';
COMMENT ON COLUMN public.teachers.regular_out_time IS 'Regular expected out-time for punctuality tracking';