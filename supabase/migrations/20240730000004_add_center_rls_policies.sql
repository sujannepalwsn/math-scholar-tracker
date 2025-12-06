-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Helper function to get the current user's center_id
CREATE OR REPLACE FUNCTION public.get_user_center_id()
RETURNS uuid AS $$
  SELECT center_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Helper function to get the current user's student_id (for parents)
CREATE OR REPLACE FUNCTION public.get_user_student_id()
RETURNS uuid AS $$
  SELECT student_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Helper function to get the current user's teacher_id
CREATE OR REPLACE FUNCTION public.get_user_teacher_id()
RETURNS uuid AS $$
  SELECT teacher_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- RLS for tables with direct center_id
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
        'fee_headings', 'fee_structures', 'invoices', 'expenses', 'homework', 'activities',
        'discipline_categories', 'tests', 'class_periods', 'period_schedules', 'meetings',
        'broadcast_messages', 'chat_conversations', 'teachers', 'teacher_attendance',
        'center_feature_permissions', 'lesson_plans'
    )
    LOOP
        EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE FORMAT('DROP POLICY IF EXISTS "Admins can manage all data on %I" ON public.%I;', t_name, t_name);
        EXECUTE FORMAT('CREATE POLICY "Admins can manage all data on %I" ON public.%I FOR ALL USING (get_user_role() = ''admin'');', t_name, t_name);
        EXECUTE FORMAT('DROP POLICY IF EXISTS "Center users can manage their own data on %I" ON public.%I;', t_name, t_name);
        EXECUTE FORMAT('CREATE POLICY "Center users can manage their own data on %I" ON public.%I FOR ALL USING ((get_user_role() = ''center'' AND center_id = get_user_center_id()));', t_name, t_name);
        EXECUTE FORMAT('DROP POLICY IF EXISTS "Teacher users can manage their own data on %I" ON public.%I;', t_name, t_name);
        EXECUTE FORMAT('CREATE POLICY "Teacher users can manage their own data on %I" ON public.%I FOR ALL USING ((get_user_role() = ''teacher'' AND center_id = get_user_center_id()));', t_name, t_name);
        -- No direct parent policy for these tables as they are center-scoped. Parents access via student_id linked tables.
    END LOOP;
END $$;

-- RLS for tables with direct student_id (and implicitly center_id via students table)
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
        'student_chapters', 'student_homework_records', 'student_activities', 'discipline_issues', 'test_results'
    )
    LOOP
        EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE FORMAT('DROP POLICY IF EXISTS "Admins can manage all data on %I" ON public.%I;', t_name, t_name);
        EXECUTE FORMAT('CREATE POLICY "Admins can manage all data on %I" ON public.%I FOR ALL USING (get_user_role() = ''admin'');', t_name, t_name);
        EXECUTE FORMAT('DROP POLICY IF EXISTS "Center users can manage their own data on %I" ON public.%I;', t_name, t_name);
        EXECUTE FORMAT('CREATE POLICY "Center users can manage their own data on %I" ON public.%I FOR ALL USING ((get_user_role() = ''center'' AND student_id IN (SELECT id FROM public.students WHERE center_id = get_user_center_id())));', t_name, t_name);
        EXECUTE FORMAT('DROP POLICY IF EXISTS "Teacher users can manage their own data on %I" ON public.%I;', t_name, t_name);
        EXECUTE FORMAT('CREATE POLICY "Teacher users can manage their own data on %I" ON public.%I FOR ALL USING ((get_user_role() = ''teacher'' AND student_id IN (SELECT id FROM public.students WHERE center_id = get_user_center_id())));', t_name, t_name);
        EXECUTE FORMAT('DROP POLICY IF EXISTS "Parent users can view their linked student''s data on %I" ON public.%I;', t_name, t_name);
        EXECUTE FORMAT('CREATE POLICY "Parent users can view their linked student''s data on %I" ON public.%I FOR SELECT USING ((get_user_role() = ''parent'' AND student_id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid())));', t_name, t_name);
    END LOOP;
END $$;

-- Special case: parent_students table
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all data on parent_students" ON public.parent_students;
CREATE POLICY "Admins can manage all data on parent_students" ON public.parent_students FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Center users can manage their own data on parent_students" ON public.parent_students;
CREATE POLICY "Center users can manage their own data on parent_students" ON public.parent_students FOR ALL USING ((get_user_role() = 'center' AND student_id IN (SELECT id FROM public.students WHERE center_id = get_user_center_id())));
DROP POLICY IF EXISTS "Parent users can view their own linked students" ON public.parent_students;
CREATE POLICY "Parent users can view their own linked students" ON public.parent_students FOR ALL USING (parent_user_id = auth.uid());

-- RLS for tables linked via other tables (e.g., invoice_items -> invoices -> center_id)
-- invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all data on invoice_items" ON public.invoice_items;
CREATE POLICY "Admins can manage all data on invoice_items" ON public.invoice_items FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Center users can manage their own data on invoice_items" ON public.invoice_items;
CREATE POLICY "Center users can manage their own data on invoice_items" ON public.invoice_items FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Teacher users can manage their own data on invoice_items" ON public.invoice_items;
CREATE POLICY "Teacher users can manage their own data on invoice_items" ON public.invoice_items FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Parent users can view their linked student's invoice_items" ON public.invoice_items;
CREATE POLICY "Parent users can view their linked student's invoice_items" ON public.invoice_items FOR SELECT USING (invoice_id IN (SELECT id FROM public.invoices WHERE student_id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid())));

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all data on payments" ON public.payments;
CREATE POLICY "Admins can manage all data on payments" ON public.payments FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Center users can manage their own data on payments" ON public.payments;
CREATE POLICY "Center users can manage their own data on payments" ON public.payments FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Teacher users can manage their own data on payments" ON public.payments;
CREATE POLICY "Teacher users can manage their own data on payments" ON public.payments FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Parent users can view their linked student's payments" ON public.payments;
CREATE POLICY "Parent users can view their linked student's payments" ON public.payments FOR SELECT USING (invoice_id IN (SELECT id FROM public.invoices WHERE student_id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid())));

-- meeting_attendees
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all data on meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Admins can manage all data on meeting_attendees" ON public.meeting_attendees FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Center users can manage their own data on meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Center users can manage their own data on meeting_attendees" ON public.meeting_attendees FOR ALL USING (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Teacher users can manage their own data on meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Teacher users can manage their own data on meeting_attendees" ON public.meeting_attendees FOR ALL USING (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Parent users can view their own meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Parent users can view their own meeting_attendees" ON public.meeting_attendees FOR ALL USING (user_id = auth.uid());

-- meeting_conclusions
ALTER TABLE public.meeting_conclusions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all data on meeting_conclusions" ON public.meeting_conclusions;
CREATE POLICY "Admins can manage all data on meeting_conclusions" ON public.meeting_conclusions FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Center users can manage their own data on meeting_conclusions" ON public.meeting_conclusions;
CREATE POLICY "Center users can manage their own data on meeting_conclusions" ON public.meeting_conclusions FOR ALL USING (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Teacher users can manage their own data on meeting_conclusions" ON public.meeting_conclusions;
CREATE POLICY "Teacher users can manage their own data on meeting_conclusions" ON public.meeting_conclusions FOR ALL USING (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Parent users can view their linked student's meeting_conclusions" ON public.meeting_conclusions;
CREATE POLICY "Parent users can view their linked student's meeting_conclusions" ON public.meeting_conclusions FOR SELECT USING (meeting_id IN (SELECT meeting_id FROM public.meeting_attendees WHERE student_id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid())));

-- chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all data on chat_messages" ON public.chat_messages;
CREATE POLICY "Admins can manage all data on chat_messages" ON public.chat_messages FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Center users can manage their own data on chat_messages" ON public.chat_messages;
CREATE POLICY "Center users can manage their own data on chat_messages" ON public.chat_messages FOR ALL USING (conversation_id IN (SELECT id FROM public.chat_conversations WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Teacher users can manage their own data on chat_messages" ON public.chat_messages;
CREATE POLICY "Teacher users can manage their own data on chat_messages" ON public.chat_messages FOR ALL USING (conversation_id IN (SELECT id FROM public.chat_conversations WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Parent users can view their own chat_messages" ON public.chat_messages;
CREATE POLICY "Parent users can view their own chat_messages" ON public.chat_messages FOR ALL USING (conversation_id IN (SELECT id FROM public.chat_conversations WHERE parent_user_id = auth.uid()));

-- teacher_feature_permissions
ALTER TABLE public.teacher_feature_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all data on teacher_feature_permissions" ON public.teacher_feature_permissions;
CREATE POLICY "Admins can manage all data on teacher_feature_permissions" ON public.teacher_feature_permissions FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Center users can manage their own teacher_feature_permissions" ON public.teacher_feature_permissions;
CREATE POLICY "Center users can manage their own teacher_feature_permissions" ON public.teacher_feature_permissions FOR ALL USING (teacher_id IN (SELECT id FROM public.teachers WHERE center_id = get_user_center_id()));
DROP POLICY IF EXISTS "Teacher users can view their own teacher_feature_permissions" ON public.teacher_feature_permissions;
CREATE POLICY "Teacher users can view their own teacher_feature_permissions" ON public.teacher_feature_permissions FOR SELECT USING (teacher_id = get_user_teacher_id());

-- users table RLS (more complex, allowing users to see their own record and relevant linked records)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Admins can see all users
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Admins can modify all users" ON public.users;
CREATE POLICY "Admins can modify all users" ON public.users FOR ALL USING (get_user_role() = 'admin');

-- All users can view and modify their own user record
DROP POLICY IF EXISTS "Users can view and modify their own record" ON public.users;
CREATE POLICY "Users can view and modify their own record" ON public.users FOR ALL USING (id = auth.uid());

-- Center users can view users associated with their center (teachers, parents of their students)
DROP POLICY IF EXISTS "Center users can view associated users" ON public.users;
CREATE POLICY "Center users can view associated users" ON public.users FOR SELECT USING (
    get_user_role() = 'center' AND (
        center_id = get_user_center_id() OR -- Users directly linked to the center
        id IN (SELECT parent_user_id FROM public.parent_students WHERE student_id IN (SELECT id FROM public.students WHERE center_id = get_user_center_id())) OR -- Parents of students in their center
        id IN (SELECT user_id FROM public.teachers WHERE center_id = get_user_center_id()) -- Teachers in their center
    )
);

-- Teacher users can view users associated with their center (e.g., parents of students they teach, if needed)
-- For now, teachers can only see their own record and records of students they teach (if student_id is directly linked to user)
DROP POLICY IF EXISTS "Teacher users can view associated users" ON public.users;
CREATE POLICY "Teacher users can view associated users" ON public.users FOR SELECT USING (
    get_user_role() = 'teacher' AND (
        id = auth.uid() OR
        id IN (SELECT parent_user_id FROM public.parent_students WHERE student_id IN (SELECT student_id FROM public.teacher_student_assignments WHERE teacher_id = get_user_teacher_id())) -- Parents of students assigned to them (if such a table exists)
    )
);

-- Parent users can view users associated with their linked students (e.g., teachers of their student)
DROP POLICY IF EXISTS "Parent users can view associated users" ON public.users;
CREATE POLICY "Parent users can view associated users" ON public.users FOR SELECT USING (
    get_user_role() = 'parent' AND (
        id = auth.uid() OR
        id IN (SELECT user_id FROM public.teachers WHERE id IN (SELECT teacher_id FROM public.period_schedules WHERE grade IN (SELECT grade FROM public.students WHERE id = get_user_student_id()))) -- Teachers teaching their student's grade
    )
);

-- RLS for students table (already exists, but ensuring it's comprehensive)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
CREATE POLICY "Admins can manage all students" ON public.students FOR ALL USING (get_user_role() = 'admin');
DROP POLICY IF EXISTS "Center users can manage their own students" ON public.students;
CREATE POLICY "Center users can manage their own students" ON public.students FOR ALL USING (center_id = get_user_center_id());
DROP POLICY IF EXISTS "Teacher users can view their own students" ON public.students;
CREATE POLICY "Teacher users can view their own students" ON public.students FOR SELECT USING (center_id = get_user_center_id()); -- Teachers can view all students in their center
DROP POLICY IF EXISTS "Parent users can view their linked students" ON public.students;
CREATE POLICY "Parent users can view their linked students" ON public.students FOR SELECT USING (id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid()));