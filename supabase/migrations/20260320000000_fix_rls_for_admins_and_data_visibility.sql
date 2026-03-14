-- Migration to fix RLS policies for Super Admin visibility and consistent data isolation
-- Requirement 1: Multi-Tenant Data Security (Refined & Data Recovery)

-- 1. Redefine the helper functions to be more robust and avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  -- We use a direct query with auth.uid() to avoid recursion if used in the users table policy
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_center_id()
RETURNS uuid AS $$
  SELECT center_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Update RLS policies for all tables to allow Super Admin access
DO $$
DECLARE
    t text;
    tables_to_secure text[] := ARRAY[
        'activities', 'activity_logs', 'activity_types', 'attendance', 'broadcast_messages',
        'center_events', 'center_feature_permissions', 'chat_conversations', 'chat_messages',
        'class_periods', 'class_teacher_assignments', 'discipline_categories', 'discipline_issues',
        'exam_marks', 'exam_subjects', 'exams', 'expenses', 'fee_headings', 'fee_structures',
        'homework', 'invoice_items', 'invoices', 'lesson_plans', 'meeting_attendees',
        'meeting_conclusions', 'meetings', 'notifications', 'parent_students', 'payments',
        'period_schedules', 'preschool_activities', 'results', 'student_activities',
        'student_chapters', 'student_homework_records', 'student_results', 'students',
        'teacher_attendance', 'teacher_feature_permissions', 'teachers', 'test_marks',
        'test_results', 'users', 'centers', 'leave_applications', 'leave_categories', 'class_substitutions'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_secure
    LOOP
        -- Enable RLS (idempotent)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- Drop all existing isolation policies to start fresh
        EXECUTE format('DROP POLICY IF EXISTS "Center Isolation Policy" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Center Isolation Policy for view" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Center Isolation Policy for manage" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can manage all data on %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Center users can manage their own data on %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Teacher users can manage their own data on %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Parent users can view their linked student''s data on %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view themselves" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Users update own record" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public access" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin full access" ON public.%I', t);

        -- 1. All-powerful policy for Super Admin
        -- We use is_admin() which is SECURITY DEFINER to avoid recursion
        EXECUTE format('CREATE POLICY "Admin full access" ON public.%I FOR ALL USING (public.is_admin())', t);

        -- 2. Scoped policy for others
        IF t = 'users' THEN
            EXECUTE format('
                CREATE POLICY "Center Isolation Policy" ON public.%I
                FOR SELECT USING (
                    id = auth.uid()
                    OR center_id = public.get_auth_center_id()
                )', t);

            EXECUTE format('
                CREATE POLICY "Users update own record" ON public.%I
                FOR UPDATE USING (id = auth.uid())', t);

        ELSIF t = 'centers' THEN
            EXECUTE format('
                CREATE POLICY "Center Isolation Policy" ON public.%I
                USING (id = public.get_auth_center_id())', t);

        ELSIF t = 'leave_categories' THEN
            EXECUTE format('
                CREATE POLICY "Center Isolation Policy" ON public.%I
                USING (
                    center_id = public.get_auth_center_id()
                    OR center_id IS NULL
                )', t);
        ELSE
            EXECUTE format('
                CREATE POLICY "Center Isolation Policy" ON public.%I
                USING (center_id = public.get_auth_center_id())', t);
        END IF;
    END LOOP;
END $$;

-- 3. Data Recovery & Backfill
-- This ensures existing data becomes visible under the new RLS policies.
DO $$
DECLARE
    default_center_id uuid;
BEGIN
    -- Get or create a default center if none exists, to assign orphan records
    SELECT id INTO default_center_id FROM public.centers LIMIT 1;

    IF default_center_id IS NULL THEN
        INSERT INTO public.centers (name) VALUES ('Default Tuition Center') RETURNING id INTO default_center_id;
    END IF;

    -- Ensure Super Admin user has correct role and NO center_id (to avoid accidental scoping)
    -- But wait, my RLS helper uses center_id. If Super Admin has NULL center_id, get_auth_center_id returns NULL.
    -- The "Admin full access" policy handles this by ignoring center_id for admins.

    -- Link orphan users to the default center (except admins)
    UPDATE public.users SET center_id = default_center_id WHERE center_id IS NULL AND role != 'admin';

    -- Students
    UPDATE public.students SET center_id = default_center_id WHERE center_id IS NULL;

    -- Teachers
    UPDATE public.teachers SET center_id = default_center_id WHERE center_id IS NULL;

    -- Associate attendance with student's center
    UPDATE public.attendance a SET center_id = s.center_id FROM public.students s WHERE a.student_id = s.id AND a.center_id IS NULL;
    UPDATE public.attendance SET center_id = default_center_id WHERE center_id IS NULL;

    -- Associate results with center
    UPDATE public.results SET center_id = default_center_id WHERE center_id IS NULL;

    -- Associate exams with center
    UPDATE public.exams SET center_id = default_center_id WHERE center_id IS NULL;

    -- Exam Marks
    UPDATE public.exam_marks em SET center_id = e.center_id FROM public.exams e WHERE em.exam_id = e.id AND em.center_id IS NULL;
    UPDATE public.exam_marks SET center_id = default_center_id WHERE center_id IS NULL;

    -- Lesson Plans
    UPDATE public.lesson_plans SET center_id = default_center_id WHERE center_id IS NULL;

    -- Homework
    UPDATE public.homework SET center_id = default_center_id WHERE center_id IS NULL;

    -- Notifications
    UPDATE public.notifications SET center_id = default_center_id WHERE center_id IS NULL;

    -- Discipline Issues
    UPDATE public.discipline_issues di SET center_id = s.center_id FROM public.students s WHERE di.student_id = s.id AND di.center_id IS NULL;
    UPDATE public.discipline_issues SET center_id = default_center_id WHERE center_id IS NULL;

    -- Test Results
    UPDATE public.test_results tr SET center_id = s.center_id FROM public.students s WHERE tr.student_id = s.id AND tr.center_id IS NULL;
    UPDATE public.test_results SET center_id = default_center_id WHERE center_id IS NULL;

    -- Student Chapters
    UPDATE public.student_chapters sc SET center_id = s.center_id FROM public.students s WHERE sc.student_id = s.id AND sc.center_id IS NULL;
    UPDATE public.student_chapters SET center_id = default_center_id WHERE center_id IS NULL;

    -- Student Homework Records
    UPDATE public.student_homework_records shr SET center_id = s.center_id FROM public.students s WHERE shr.student_id = s.id AND shr.center_id IS NULL;
    UPDATE public.student_homework_records SET center_id = default_center_id WHERE center_id IS NULL;

    -- Chat Messages
    UPDATE public.chat_messages m SET center_id = c.center_id FROM public.chat_conversations c WHERE m.conversation_id = c.id AND m.center_id IS NULL;
    UPDATE public.chat_messages SET center_id = default_center_id WHERE center_id IS NULL;

    -- Broadcast Messages
    UPDATE public.broadcast_messages SET center_id = default_center_id WHERE center_id IS NULL;

    -- Invoices & Payments
    UPDATE public.invoices SET center_id = default_center_id WHERE center_id IS NULL;
    UPDATE public.payments p SET center_id = i.center_id FROM public.invoices i WHERE p.invoice_id = i.id AND p.center_id IS NULL;
    UPDATE public.payments SET center_id = default_center_id WHERE center_id IS NULL;

END $$;
