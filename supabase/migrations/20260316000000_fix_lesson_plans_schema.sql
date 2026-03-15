-- Finalized fix for lesson_plans table and RLS
-- Migration: 20260316000000_fix_lesson_plans_schema.sql

DO $$
BEGIN
    -- 1. Ensure all columns exist with correct defaults
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='status') THEN
        ALTER TABLE public.lesson_plans ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='submitted_at') THEN
        ALTER TABLE public.lesson_plans ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='approval_date') THEN
        ALTER TABLE public.lesson_plans ADD COLUMN approval_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='principal_remarks') THEN
        ALTER TABLE public.lesson_plans ADD COLUMN principal_remarks TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lesson_plans' AND column_name='approved_by') THEN
        ALTER TABLE public.lesson_plans ADD COLUMN approved_by UUID;
    END IF;

    -- 2. Foreign Key Fix: Ensure approved_by references the correct table
    -- Drop old one if it exists (it might point to auth.users which we want to avoid for consistency)
    ALTER TABLE public.lesson_plans DROP CONSTRAINT IF EXISTS lesson_plans_approved_by_fkey;

    -- public.users is the source of truth for our app roles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='users' AND table_schema='public') THEN
        ALTER TABLE public.lesson_plans ADD CONSTRAINT lesson_plans_approved_by_fkey
        FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

END $$;

-- 3. RLS Policy Overhaul for Lesson Plans
-- We need to ensure Center Admins can definitely UPDATE records in their center

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

-- Drop all possible existing policies to start fresh
DROP POLICY IF EXISTS "Center and Admin access on lesson_plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Teacher read access on lesson_plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Allow center users to manage their lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Allow admin to view all lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Allow teachers to view and manage their center's lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Center admins can update lesson plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Teachers can view relevant lesson plans" ON public.lesson_plans;

-- Policy: Broad access for Center and Super Admins
-- Uses the helper function is_same_center() defined in 20260312000000_fix_rls_recursion_final.sql
CREATE POLICY "Admin and Center access on lesson_plans"
ON public.lesson_plans
FOR ALL
USING (public.is_same_center(center_id));

-- Policy: Specific access for Teachers
-- They can manage (ALL) their own, or SELECT ones they substitute for
CREATE POLICY "Teacher access on lesson_plans"
ON public.lesson_plans
FOR ALL
USING (
  get_user_role() = 'teacher'
  AND (
    teacher_id = get_user_teacher_id()
    OR
    -- Allow viewing if they are a substitute teacher for this class/subject on some date
    EXISTS (
      SELECT 1 FROM public.class_substitutions cs
      JOIN public.period_schedules ps ON cs.period_schedule_id = ps.id
      WHERE cs.substitute_teacher_id = get_user_teacher_id()
      AND ps.subject = lesson_plans.subject
      AND ps.grade = lesson_plans.grade
    )
  )
);

-- Policy: Global Admin fallback (if not already covered)
CREATE POLICY "Super Admin full access on lesson_plans"
ON public.lesson_plans
FOR ALL
USING (get_user_role() = 'admin');
