-- Add missing columns to teachers table
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS contact_number text,
ADD COLUMN IF NOT EXISTS hire_date date DEFAULT CURRENT_DATE;

-- Add missing columns to meetings table  
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS meeting_time time without time zone,
ADD COLUMN IF NOT EXISTS agenda text;

-- Add missing columns to activities table
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS title character varying,
ADD COLUMN IF NOT EXISTS activity_type_id uuid REFERENCES public.activity_types(id),
ADD COLUMN IF NOT EXISTS activity_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS grade character varying,
ADD COLUMN IF NOT EXISTS notes text;

-- Add lesson_plan_id to tests table
ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS lesson_plan_id uuid REFERENCES public.lesson_plans(id);

-- Add missing columns to student_activities for proper relationship
ALTER TABLE public.student_activities
ADD COLUMN IF NOT EXISTS participation_rating character varying,
ADD COLUMN IF NOT EXISTS involvement_score integer,
ADD COLUMN IF NOT EXISTS teacher_notes text,
ADD COLUMN IF NOT EXISTS completed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS attended_at timestamp with time zone;

-- Update attendance table to match expected schema
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);

-- Update activity_types to add updated_at if missing
ALTER TABLE public.activity_types
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();