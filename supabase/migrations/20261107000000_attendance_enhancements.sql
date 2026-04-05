-- Migration to connect student attendance and teacher attendance to academic year and calendar events
-- Removal of school_days as requested

-- 1. Add academic_year_id to attendance and teacher_attendance tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'academic_year_id') THEN
        ALTER TABLE public.attendance ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_attendance' AND column_name = 'academic_year_id') THEN
        ALTER TABLE public.teacher_attendance ADD COLUMN academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Drop the school_days table as requested
DROP TABLE IF EXISTS public.school_days CASCADE;

-- 3. Ensure 'pending' is an allowed status (mostly for UI and logic)
-- Some tables might have CHECK constraints. Let's check and update them if they exist.
-- attendance table status check (common in many projects)
-- We'll use a DO block to safely handle existing constraints

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass AND contype = 'c' AND consrc LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.attendance DROP CONSTRAINT ' || constraint_name;
        ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check CHECK (status IN ('present', 'absent', 'late', 'leave', 'pending'));
    END IF;

    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.teacher_attendance'::regclass AND contype = 'c' AND consrc LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.teacher_attendance DROP CONSTRAINT ' || constraint_name;
        ALTER TABLE public.teacher_attendance ADD CONSTRAINT teacher_attendance_status_check CHECK (status IN ('present', 'absent', 'leave', 'pending'));
    END IF;
END $$;

-- 4. Function to get pending student attendance by grade
CREATE OR REPLACE FUNCTION get_pending_attendance_by_grade(p_center_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (grade text, pending_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role text;
    v_teacher_id uuid;
    v_teacher_scope text;
    v_user_center_id uuid;
BEGIN
    -- Security Check: Verify user belongs to the requested center
    SELECT center_id, role, teacher_id INTO v_user_center_id, v_user_role, v_teacher_id
    FROM public.users WHERE id = auth.uid();

    IF v_user_center_id IS NULL OR (v_user_center_id != p_center_id AND v_user_role != 'super_admin') THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to view data for this center.';
    END IF;

    -- Check if it's a school day
    IF EXISTS (
        SELECT 1 FROM public.calendar_events
        WHERE center_id = p_center_id AND date = p_date AND is_school_day = false
    ) THEN
        RETURN;
    END IF;

    -- Get teacher scope
    SELECT teacher_scope_mode INTO v_teacher_scope
    FROM public.teacher_feature_permissions
    WHERE teacher_id = v_teacher_id;

    RETURN QUERY
    SELECT
        s.grade,
        COUNT(s.id) as pending_count
    FROM
        public.students s
    WHERE
        s.center_id = p_center_id
        AND s.is_active = true
        AND (
            v_user_role IN ('admin', 'center', 'super_admin')
            OR (v_user_role = 'teacher' AND (
                v_teacher_scope = 'full'
                OR s.grade IN (SELECT cta.grade FROM public.class_teacher_assignments cta WHERE cta.teacher_id = v_teacher_id)
            ))
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.attendance a
            WHERE a.student_id = s.id AND a.date = p_date
        )
    GROUP BY
        s.grade;
END;
$$;

-- 5. Function to get pending teacher attendance
CREATE OR REPLACE FUNCTION get_pending_teacher_attendance(p_center_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (teacher_id uuid, teacher_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_center_id uuid;
    v_user_role text;
BEGIN
    -- Security Check: Verify user belongs to the requested center
    SELECT center_id, role INTO v_user_center_id, v_user_role
    FROM public.users WHERE id = auth.uid();

    IF v_user_center_id IS NULL OR (v_user_center_id != p_center_id AND v_user_role != 'super_admin') THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to view data for this center.';
    END IF;

    -- Check if it's a school day
    IF EXISTS (
        SELECT 1 FROM public.calendar_events
        WHERE center_id = p_center_id AND date = p_date AND is_school_day = false
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        t.id,
        t.name
    FROM
        public.teachers t
    WHERE
        t.center_id = p_center_id
        AND t.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM public.teacher_attendance ta
            WHERE ta.teacher_id = t.id AND ta.date = p_date
        );
END;
$$;

-- 6. Data Migration: Populate academic_year_id for existing records
UPDATE public.attendance a
SET academic_year_id = ay.id
FROM public.academic_years ay
WHERE a.center_id = ay.center_id
AND a.date >= ay.start_date
AND a.date <= ay.end_date
AND a.academic_year_id IS NULL;

UPDATE public.teacher_attendance ta
SET academic_year_id = ay.id
FROM public.academic_years ay
WHERE ta.center_id = ay.center_id
AND ta.date >= ay.start_date
AND ta.date <= ay.end_date
AND ta.academic_year_id IS NULL;
