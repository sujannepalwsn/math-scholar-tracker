-- Migration to enforce strict multi-tenant RLS and ensure all tables have center_id
-- Requirement 1: Multi-Tenant Data Security

-- 1. Helper function to get current user's center_id
CREATE OR REPLACE FUNCTION public.get_auth_center_id()
RETURNS uuid AS $$
  SELECT center_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Add center_id to tables where it's missing and backfill if possible
-- results table fix (change from number to uuid)
ALTER TABLE public.results ALTER COLUMN center_id TYPE uuid USING NULL;

-- chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.chat_messages m SET center_id = c.center_id FROM public.chat_conversations c WHERE m.conversation_id = c.id AND m.center_id IS NULL;

-- invoice_items
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.invoice_items i SET center_id = inv.center_id FROM public.invoices inv WHERE i.invoice_id = inv.id AND i.center_id IS NULL;

-- meeting_attendees
ALTER TABLE public.meeting_attendees ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.meeting_attendees ma SET center_id = m.center_id FROM public.meetings m WHERE ma.meeting_id = m.id AND ma.center_id IS NULL;

-- meeting_conclusions
ALTER TABLE public.meeting_conclusions ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.meeting_conclusions mc SET center_id = m.center_id FROM public.meetings m WHERE mc.meeting_id = m.id AND mc.center_id IS NULL;

-- parent_students
ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.parent_students ps SET center_id = s.center_id FROM public.students s WHERE ps.student_id = s.id AND ps.center_id IS NULL;

-- payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.payments p SET center_id = inv.center_id FROM public.invoices inv WHERE p.invoice_id = inv.id AND p.center_id IS NULL;

-- student_activities
ALTER TABLE public.student_activities ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.student_activities sa SET center_id = s.center_id FROM public.students s WHERE sa.student_id = s.id AND sa.center_id IS NULL;

-- student_chapters
ALTER TABLE public.student_chapters ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.student_chapters sc SET center_id = s.center_id FROM public.students s WHERE sc.student_id = s.id AND sc.center_id IS NULL;

-- student_homework_records
ALTER TABLE public.student_homework_records ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.student_homework_records shr SET center_id = s.center_id FROM public.students s WHERE shr.student_id = s.id AND shr.center_id IS NULL;

-- student_results
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.student_results sr SET center_id = s.center_id FROM public.students s WHERE sr.student_id = s.id AND sr.center_id IS NULL;

-- teacher_feature_permissions
ALTER TABLE public.teacher_feature_permissions ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.teacher_feature_permissions tfp SET center_id = t.center_id FROM public.teachers t WHERE tfp.teacher_id = t.id AND tfp.center_id IS NULL;

-- test_marks
ALTER TABLE public.test_marks ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.test_marks tm SET center_id = s.center_id FROM public.students s WHERE tm.student_id = s.id AND tm.center_id IS NULL;

-- test_results
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);
UPDATE public.test_results tr SET center_id = s.center_id FROM public.students s WHERE tr.student_id = s.id AND tr.center_id IS NULL;

-- 3. Enable RLS on all tables and create policies
-- To avoid infinite recursion, we use a simpler check for the users table
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
        'test_results', 'users'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_secure
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Center Isolation Policy" ON public.%I', t);

        IF t = 'users' THEN
            -- Users can see themselves
            EXECUTE format('CREATE POLICY "Center Isolation Policy" ON public.%I FOR SELECT USING (id = auth.uid() OR center_id = public.get_auth_center_id())', t);
            EXECUTE format('CREATE POLICY "Users update own record" ON public.%I FOR UPDATE USING (id = auth.uid())', t);
        ELSE
            -- Default policy: matches center_id
            EXECUTE format('CREATE POLICY "Center Isolation Policy" ON public.%I USING (center_id = public.get_auth_center_id())', t);
        END IF;
    END LOOP;
END $$;
