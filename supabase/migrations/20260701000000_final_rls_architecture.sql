-- 1. SECURITY INFRASTRUCTURE (RECURSION-PROOF)
CREATE SCHEMA IF NOT EXISTS security;

-- Shadow table to store user metadata for RLS lookups
-- This table DOES NOT have RLS enabled. Access is restricted via schema permissions.
CREATE TABLE IF NOT EXISTS security.user_roles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    center_id UUID,
    student_id UUID,
    teacher_id UUID
);

-- Revoke all access to the shadow table from public roles
REVOKE ALL ON security.user_roles FROM public, anon, authenticated;
GRANT SELECT ON security.user_roles TO postgres, service_role;

-- Trigger function to keep shadow table in sync
CREATE OR REPLACE FUNCTION security.sync_user_roles()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO security.user_roles (user_id, role, center_id, student_id, teacher_id)
        VALUES (NEW.id, NEW.role, NEW.center_id, NEW.student_id, NEW.teacher_id);
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE security.user_roles
        SET role = NEW.role,
            center_id = NEW.center_id,
            student_id = NEW.student_id,
            teacher_id = NEW.teacher_id
        WHERE user_id = NEW.id;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM security.user_roles WHERE user_id = OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to public.users
DROP TRIGGER IF EXISTS trigger_sync_user_roles ON public.users;
CREATE TRIGGER trigger_sync_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION security.sync_user_roles();

-- Seed the shadow table from existing users (if any)
INSERT INTO security.user_roles (user_id, role, center_id, student_id, teacher_id)
SELECT id, role, center_id, student_id, teacher_id FROM public.users
ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    center_id = EXCLUDED.center_id,
    student_id = EXCLUDED.student_id,
    teacher_id = EXCLUDED.teacher_id;

-- Helper functions querying the shadow table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM security.user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_center_id()
RETURNS UUID AS $$
    SELECT center_id FROM security.user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_teacher_restricted()
RETURNS BOOLEAN AS $$
    SELECT COALESCE((
        SELECT teacher_scope_mode = 'restricted'
        FROM public.teacher_feature_permissions
        WHERE teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid())
    ), true);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_grade_assigned(target_grade TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.class_teacher_assignments
        WHERE teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid())
        AND grade = target_grade
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- Table: users (NON-RECURSIVE)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage users" ON public.users;
DROP POLICY IF EXISTS "User view self" ON public.users;
DROP POLICY IF EXISTS "User update self" ON public.users;
CREATE POLICY "Admin manage users" ON public.users FOR ALL TO authenticated USING (auth.uid() IN (SELECT user_id FROM security.user_roles WHERE role IN ('admin', 'center') AND (center_id = users.center_id OR center_id IS NULL)));
CREATE POLICY "User view self" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "User update self" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Table: system_settings (GLOBAL_CONFIG)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Center Admin manage system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Teacher access system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Parent access system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Parent insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public access system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Public insert system_settings" ON public.system_settings;
CREATE POLICY "Super Admin manage system_settings" ON public.system_settings FOR ALL TO authenticated USING (public.get_user_role() = 'admin' AND public.get_user_center_id() IS NULL);
CREATE POLICY "Public access system_settings" ON public.system_settings FOR SELECT USING (true);

-- Table: module_permissions_meta (GLOBAL_CONFIG)
ALTER TABLE public.module_permissions_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage module_permissions_meta" ON public.module_permissions_meta;
DROP POLICY IF EXISTS "Center Admin manage module_permissions_meta" ON public.module_permissions_meta;
DROP POLICY IF EXISTS "Teacher access module_permissions_meta" ON public.module_permissions_meta;
DROP POLICY IF EXISTS "Parent access module_permissions_meta" ON public.module_permissions_meta;
DROP POLICY IF EXISTS "Parent insert module_permissions_meta" ON public.module_permissions_meta;
DROP POLICY IF EXISTS "Public access module_permissions_meta" ON public.module_permissions_meta;
DROP POLICY IF EXISTS "Public insert module_permissions_meta" ON public.module_permissions_meta;
CREATE POLICY "Super Admin manage module_permissions_meta" ON public.module_permissions_meta FOR ALL TO authenticated USING (public.get_user_role() = 'admin' AND public.get_user_center_id() IS NULL);
CREATE POLICY "Public access module_permissions_meta" ON public.module_permissions_meta FOR SELECT USING (true);

-- Table: subscription_plans (GLOBAL_CONFIG)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Center Admin manage subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Teacher access subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Parent access subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Parent insert subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Public access subscription_plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Public insert subscription_plans" ON public.subscription_plans;
CREATE POLICY "Super Admin manage subscription_plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.get_user_role() = 'admin' AND public.get_user_center_id() IS NULL);
CREATE POLICY "Public access subscription_plans" ON public.subscription_plans FOR SELECT USING (true);

-- Table: login_page_settings (GLOBAL_CONFIG)
ALTER TABLE public.login_page_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage login_page_settings" ON public.login_page_settings;
DROP POLICY IF EXISTS "Center Admin manage login_page_settings" ON public.login_page_settings;
DROP POLICY IF EXISTS "Teacher access login_page_settings" ON public.login_page_settings;
DROP POLICY IF EXISTS "Parent access login_page_settings" ON public.login_page_settings;
DROP POLICY IF EXISTS "Parent insert login_page_settings" ON public.login_page_settings;
DROP POLICY IF EXISTS "Public access login_page_settings" ON public.login_page_settings;
DROP POLICY IF EXISTS "Public insert login_page_settings" ON public.login_page_settings;
CREATE POLICY "Super Admin manage login_page_settings" ON public.login_page_settings FOR ALL TO authenticated USING (public.get_user_role() = 'admin' AND public.get_user_center_id() IS NULL);
CREATE POLICY "Public access login_page_settings" ON public.login_page_settings FOR SELECT USING (true);

-- Table: centers (CENTERS)
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage centers" ON public.centers;
DROP POLICY IF EXISTS "Center Admin manage centers" ON public.centers;
DROP POLICY IF EXISTS "Teacher access centers" ON public.centers;
DROP POLICY IF EXISTS "Parent access centers" ON public.centers;
DROP POLICY IF EXISTS "Parent insert centers" ON public.centers;
DROP POLICY IF EXISTS "Public access centers" ON public.centers;
DROP POLICY IF EXISTS "Public insert centers" ON public.centers;
CREATE POLICY "Super Admin manage centers" ON public.centers FOR ALL TO authenticated USING (public.get_user_role() = 'admin' AND public.get_user_center_id() IS NULL);
CREATE POLICY "Center Admin manage centers" ON public.centers FOR UPDATE TO authenticated USING (id = public.get_user_center_id());
CREATE POLICY "Public access centers" ON public.centers FOR SELECT USING (true);

-- Table: error_logs (ERROR_LOGS)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Center Admin manage error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Teacher access error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Parent access error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Parent insert error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Public access error_logs" ON public.error_logs;
DROP POLICY IF EXISTS "Public insert error_logs" ON public.error_logs;
CREATE POLICY "Super Admin manage error_logs" ON public.error_logs FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND public.get_user_center_id() IS NULL);
CREATE POLICY "Public insert" ON public.error_logs FOR INSERT WITH CHECK (true);

-- Table: academic_years (CENTER_CONFIG)
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Center Admin manage academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Teacher access academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Parent access academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Parent insert academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Public access academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Public insert academic_years" ON public.academic_years;
CREATE POLICY "Center Admin manage academic_years" ON public.academic_years FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access academic_years" ON public.academic_years FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access academic_years" ON public.academic_years FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: activity_types (CENTER_CONFIG)
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage activity_types" ON public.activity_types;
DROP POLICY IF EXISTS "Center Admin manage activity_types" ON public.activity_types;
DROP POLICY IF EXISTS "Teacher access activity_types" ON public.activity_types;
DROP POLICY IF EXISTS "Parent access activity_types" ON public.activity_types;
DROP POLICY IF EXISTS "Parent insert activity_types" ON public.activity_types;
DROP POLICY IF EXISTS "Public access activity_types" ON public.activity_types;
DROP POLICY IF EXISTS "Public insert activity_types" ON public.activity_types;
CREATE POLICY "Center Admin manage activity_types" ON public.activity_types FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access activity_types" ON public.activity_types FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access activity_types" ON public.activity_types FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: bus_routes (CENTER_CONFIG)
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage bus_routes" ON public.bus_routes;
DROP POLICY IF EXISTS "Center Admin manage bus_routes" ON public.bus_routes;
DROP POLICY IF EXISTS "Teacher access bus_routes" ON public.bus_routes;
DROP POLICY IF EXISTS "Parent access bus_routes" ON public.bus_routes;
DROP POLICY IF EXISTS "Parent insert bus_routes" ON public.bus_routes;
DROP POLICY IF EXISTS "Public access bus_routes" ON public.bus_routes;
DROP POLICY IF EXISTS "Public insert bus_routes" ON public.bus_routes;
CREATE POLICY "Center Admin manage bus_routes" ON public.bus_routes FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access bus_routes" ON public.bus_routes FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access bus_routes" ON public.bus_routes FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: calendar_events (CENTER_CONFIG)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Center Admin manage calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Teacher access calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Parent access calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Parent insert calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Public access calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Public insert calendar_events" ON public.calendar_events;
CREATE POLICY "Center Admin manage calendar_events" ON public.calendar_events FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access calendar_events" ON public.calendar_events FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access calendar_events" ON public.calendar_events FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: center_events (CENTER_CONFIG)
ALTER TABLE public.center_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage center_events" ON public.center_events;
DROP POLICY IF EXISTS "Center Admin manage center_events" ON public.center_events;
DROP POLICY IF EXISTS "Teacher access center_events" ON public.center_events;
DROP POLICY IF EXISTS "Parent access center_events" ON public.center_events;
DROP POLICY IF EXISTS "Parent insert center_events" ON public.center_events;
DROP POLICY IF EXISTS "Public access center_events" ON public.center_events;
DROP POLICY IF EXISTS "Public insert center_events" ON public.center_events;
CREATE POLICY "Center Admin manage center_events" ON public.center_events FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access center_events" ON public.center_events FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access center_events" ON public.center_events FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: center_feature_permissions (CENTER_CONFIG)
ALTER TABLE public.center_feature_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage center_feature_permissions" ON public.center_feature_permissions;
DROP POLICY IF EXISTS "Center Admin manage center_feature_permissions" ON public.center_feature_permissions;
DROP POLICY IF EXISTS "Teacher access center_feature_permissions" ON public.center_feature_permissions;
DROP POLICY IF EXISTS "Parent access center_feature_permissions" ON public.center_feature_permissions;
DROP POLICY IF EXISTS "Parent insert center_feature_permissions" ON public.center_feature_permissions;
DROP POLICY IF EXISTS "Public access center_feature_permissions" ON public.center_feature_permissions;
DROP POLICY IF EXISTS "Public insert center_feature_permissions" ON public.center_feature_permissions;
CREATE POLICY "Center Admin manage center_feature_permissions" ON public.center_feature_permissions FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access center_feature_permissions" ON public.center_feature_permissions FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access center_feature_permissions" ON public.center_feature_permissions FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: class_periods (CENTER_CONFIG)
ALTER TABLE public.class_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage class_periods" ON public.class_periods;
DROP POLICY IF EXISTS "Center Admin manage class_periods" ON public.class_periods;
DROP POLICY IF EXISTS "Teacher access class_periods" ON public.class_periods;
DROP POLICY IF EXISTS "Parent access class_periods" ON public.class_periods;
DROP POLICY IF EXISTS "Parent insert class_periods" ON public.class_periods;
DROP POLICY IF EXISTS "Public access class_periods" ON public.class_periods;
DROP POLICY IF EXISTS "Public insert class_periods" ON public.class_periods;
CREATE POLICY "Center Admin manage class_periods" ON public.class_periods FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access class_periods" ON public.class_periods FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access class_periods" ON public.class_periods FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: discipline_categories (CENTER_CONFIG)
ALTER TABLE public.discipline_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage discipline_categories" ON public.discipline_categories;
DROP POLICY IF EXISTS "Center Admin manage discipline_categories" ON public.discipline_categories;
DROP POLICY IF EXISTS "Teacher access discipline_categories" ON public.discipline_categories;
DROP POLICY IF EXISTS "Parent access discipline_categories" ON public.discipline_categories;
DROP POLICY IF EXISTS "Parent insert discipline_categories" ON public.discipline_categories;
DROP POLICY IF EXISTS "Public access discipline_categories" ON public.discipline_categories;
DROP POLICY IF EXISTS "Public insert discipline_categories" ON public.discipline_categories;
CREATE POLICY "Center Admin manage discipline_categories" ON public.discipline_categories FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access discipline_categories" ON public.discipline_categories FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access discipline_categories" ON public.discipline_categories FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: fee_headings (CENTER_CONFIG)
ALTER TABLE public.fee_headings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage fee_headings" ON public.fee_headings;
DROP POLICY IF EXISTS "Center Admin manage fee_headings" ON public.fee_headings;
DROP POLICY IF EXISTS "Teacher access fee_headings" ON public.fee_headings;
DROP POLICY IF EXISTS "Parent access fee_headings" ON public.fee_headings;
DROP POLICY IF EXISTS "Parent insert fee_headings" ON public.fee_headings;
DROP POLICY IF EXISTS "Public access fee_headings" ON public.fee_headings;
DROP POLICY IF EXISTS "Public insert fee_headings" ON public.fee_headings;
CREATE POLICY "Center Admin manage fee_headings" ON public.fee_headings FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access fee_headings" ON public.fee_headings FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access fee_headings" ON public.fee_headings FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: fee_structures (CENTER_CONFIG)
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Center Admin manage fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Teacher access fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Parent access fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Parent insert fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Public access fee_structures" ON public.fee_structures;
DROP POLICY IF EXISTS "Public insert fee_structures" ON public.fee_structures;
CREATE POLICY "Center Admin manage fee_structures" ON public.fee_structures FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access fee_structures" ON public.fee_structures FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access fee_structures" ON public.fee_structures FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: grading_systems (CENTER_CONFIG)
ALTER TABLE public.grading_systems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage grading_systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Center Admin manage grading_systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Teacher access grading_systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Parent access grading_systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Parent insert grading_systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Public access grading_systems" ON public.grading_systems;
DROP POLICY IF EXISTS "Public insert grading_systems" ON public.grading_systems;
CREATE POLICY "Center Admin manage grading_systems" ON public.grading_systems FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access grading_systems" ON public.grading_systems FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access grading_systems" ON public.grading_systems FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: nav_categories (CENTER_CONFIG)
ALTER TABLE public.nav_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage nav_categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Center Admin manage nav_categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Teacher access nav_categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Parent access nav_categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Parent insert nav_categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Public access nav_categories" ON public.nav_categories;
DROP POLICY IF EXISTS "Public insert nav_categories" ON public.nav_categories;
CREATE POLICY "Center Admin manage nav_categories" ON public.nav_categories FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access nav_categories" ON public.nav_categories FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access nav_categories" ON public.nav_categories FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: nav_items (CENTER_CONFIG)
ALTER TABLE public.nav_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage nav_items" ON public.nav_items;
DROP POLICY IF EXISTS "Center Admin manage nav_items" ON public.nav_items;
DROP POLICY IF EXISTS "Teacher access nav_items" ON public.nav_items;
DROP POLICY IF EXISTS "Parent access nav_items" ON public.nav_items;
DROP POLICY IF EXISTS "Parent insert nav_items" ON public.nav_items;
DROP POLICY IF EXISTS "Public access nav_items" ON public.nav_items;
DROP POLICY IF EXISTS "Public insert nav_items" ON public.nav_items;
CREATE POLICY "Center Admin manage nav_items" ON public.nav_items FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access nav_items" ON public.nav_items FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access nav_items" ON public.nav_items FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: school_days (CENTER_CONFIG)
ALTER TABLE public.school_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage school_days" ON public.school_days;
DROP POLICY IF EXISTS "Center Admin manage school_days" ON public.school_days;
DROP POLICY IF EXISTS "Teacher access school_days" ON public.school_days;
DROP POLICY IF EXISTS "Parent access school_days" ON public.school_days;
DROP POLICY IF EXISTS "Parent insert school_days" ON public.school_days;
DROP POLICY IF EXISTS "Public access school_days" ON public.school_days;
DROP POLICY IF EXISTS "Public insert school_days" ON public.school_days;
CREATE POLICY "Center Admin manage school_days" ON public.school_days FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access school_days" ON public.school_days FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access school_days" ON public.school_days FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: subjects (CENTER_CONFIG)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Center Admin manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Teacher access subjects" ON public.subjects;
DROP POLICY IF EXISTS "Parent access subjects" ON public.subjects;
DROP POLICY IF EXISTS "Parent insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Public access subjects" ON public.subjects;
DROP POLICY IF EXISTS "Public insert subjects" ON public.subjects;
CREATE POLICY "Center Admin manage subjects" ON public.subjects FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access subjects" ON public.subjects FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access subjects" ON public.subjects FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: teacher_feature_permissions (CENTER_CONFIG)
ALTER TABLE public.teacher_feature_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage teacher_feature_permissions" ON public.teacher_feature_permissions;
DROP POLICY IF EXISTS "Center Admin manage teacher_feature_permissions" ON public.teacher_feature_permissions;
DROP POLICY IF EXISTS "Teacher access teacher_feature_permissions" ON public.teacher_feature_permissions;
DROP POLICY IF EXISTS "Parent access teacher_feature_permissions" ON public.teacher_feature_permissions;
DROP POLICY IF EXISTS "Parent insert teacher_feature_permissions" ON public.teacher_feature_permissions;
DROP POLICY IF EXISTS "Public access teacher_feature_permissions" ON public.teacher_feature_permissions;
DROP POLICY IF EXISTS "Public insert teacher_feature_permissions" ON public.teacher_feature_permissions;
CREATE POLICY "Center Admin manage teacher_feature_permissions" ON public.teacher_feature_permissions FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access teacher_feature_permissions" ON public.teacher_feature_permissions FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access teacher_feature_permissions" ON public.teacher_feature_permissions FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: exam_types (CENTER_CONFIG)
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage exam_types" ON public.exam_types;
DROP POLICY IF EXISTS "Center Admin manage exam_types" ON public.exam_types;
DROP POLICY IF EXISTS "Teacher access exam_types" ON public.exam_types;
DROP POLICY IF EXISTS "Parent access exam_types" ON public.exam_types;
DROP POLICY IF EXISTS "Parent insert exam_types" ON public.exam_types;
DROP POLICY IF EXISTS "Public access exam_types" ON public.exam_types;
DROP POLICY IF EXISTS "Public insert exam_types" ON public.exam_types;
CREATE POLICY "Center Admin manage exam_types" ON public.exam_types FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access exam_types" ON public.exam_types FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access exam_types" ON public.exam_types FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: leave_categories (CENTER_CONFIG)
ALTER TABLE public.leave_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage leave_categories" ON public.leave_categories;
DROP POLICY IF EXISTS "Center Admin manage leave_categories" ON public.leave_categories;
DROP POLICY IF EXISTS "Teacher access leave_categories" ON public.leave_categories;
DROP POLICY IF EXISTS "Parent access leave_categories" ON public.leave_categories;
DROP POLICY IF EXISTS "Parent insert leave_categories" ON public.leave_categories;
DROP POLICY IF EXISTS "Public access leave_categories" ON public.leave_categories;
DROP POLICY IF EXISTS "Public insert leave_categories" ON public.leave_categories;
CREATE POLICY "Center Admin manage leave_categories" ON public.leave_categories FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access leave_categories" ON public.leave_categories FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access leave_categories" ON public.leave_categories FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: payment_gateway_settings (CENTER_CONFIG)
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage payment_gateway_settings" ON public.payment_gateway_settings;
DROP POLICY IF EXISTS "Center Admin manage payment_gateway_settings" ON public.payment_gateway_settings;
DROP POLICY IF EXISTS "Teacher access payment_gateway_settings" ON public.payment_gateway_settings;
DROP POLICY IF EXISTS "Parent access payment_gateway_settings" ON public.payment_gateway_settings;
DROP POLICY IF EXISTS "Parent insert payment_gateway_settings" ON public.payment_gateway_settings;
DROP POLICY IF EXISTS "Public access payment_gateway_settings" ON public.payment_gateway_settings;
DROP POLICY IF EXISTS "Public insert payment_gateway_settings" ON public.payment_gateway_settings;
CREATE POLICY "Center Admin manage payment_gateway_settings" ON public.payment_gateway_settings FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access payment_gateway_settings" ON public.payment_gateway_settings FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access payment_gateway_settings" ON public.payment_gateway_settings FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: id_card_designs (CENTER_CONFIG)
ALTER TABLE public.id_card_designs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage id_card_designs" ON public.id_card_designs;
DROP POLICY IF EXISTS "Center Admin manage id_card_designs" ON public.id_card_designs;
DROP POLICY IF EXISTS "Teacher access id_card_designs" ON public.id_card_designs;
DROP POLICY IF EXISTS "Parent access id_card_designs" ON public.id_card_designs;
DROP POLICY IF EXISTS "Parent insert id_card_designs" ON public.id_card_designs;
DROP POLICY IF EXISTS "Public access id_card_designs" ON public.id_card_designs;
DROP POLICY IF EXISTS "Public insert id_card_designs" ON public.id_card_designs;
CREATE POLICY "Center Admin manage id_card_designs" ON public.id_card_designs FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access id_card_designs" ON public.id_card_designs FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access id_card_designs" ON public.id_card_designs FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: results (CENTER_CONFIG)
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage results" ON public.results;
DROP POLICY IF EXISTS "Center Admin manage results" ON public.results;
DROP POLICY IF EXISTS "Teacher access results" ON public.results;
DROP POLICY IF EXISTS "Parent access results" ON public.results;
DROP POLICY IF EXISTS "Parent insert results" ON public.results;
DROP POLICY IF EXISTS "Public access results" ON public.results;
DROP POLICY IF EXISTS "Public insert results" ON public.results;
CREATE POLICY "Center Admin manage results" ON public.results FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access results" ON public.results FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access results" ON public.results FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: activities (OPERATIONAL_RECORDS)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage activities" ON public.activities;
DROP POLICY IF EXISTS "Center Admin manage activities" ON public.activities;
DROP POLICY IF EXISTS "Teacher access activities" ON public.activities;
DROP POLICY IF EXISTS "Parent access activities" ON public.activities;
DROP POLICY IF EXISTS "Parent insert activities" ON public.activities;
DROP POLICY IF EXISTS "Public access activities" ON public.activities;
DROP POLICY IF EXISTS "Public insert activities" ON public.activities;
CREATE POLICY "Center Admin manage activities" ON public.activities FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access activities" ON public.activities FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) OR created_by = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access activities" ON public.activities FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: attendance (OPERATIONAL_RECORDS)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Center Admin manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teacher access attendance" ON public.attendance;
DROP POLICY IF EXISTS "Parent access attendance" ON public.attendance;
DROP POLICY IF EXISTS "Parent insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Public access attendance" ON public.attendance;
DROP POLICY IF EXISTS "Public insert attendance" ON public.attendance;
CREATE POLICY "Center Admin manage attendance" ON public.attendance FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access attendance" ON public.attendance FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = attendance.student_id)))) OR marked_by = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access attendance" ON public.attendance FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: exam_marks (OPERATIONAL_RECORDS)
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage exam_marks" ON public.exam_marks;
DROP POLICY IF EXISTS "Center Admin manage exam_marks" ON public.exam_marks;
DROP POLICY IF EXISTS "Teacher access exam_marks" ON public.exam_marks;
DROP POLICY IF EXISTS "Parent access exam_marks" ON public.exam_marks;
DROP POLICY IF EXISTS "Parent insert exam_marks" ON public.exam_marks;
DROP POLICY IF EXISTS "Public access exam_marks" ON public.exam_marks;
DROP POLICY IF EXISTS "Public insert exam_marks" ON public.exam_marks;
CREATE POLICY "Center Admin manage exam_marks" ON public.exam_marks FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access exam_marks" ON public.exam_marks FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access exam_marks" ON public.exam_marks FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: exam_subjects (OPERATIONAL_RECORDS)
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage exam_subjects" ON public.exam_subjects;
DROP POLICY IF EXISTS "Center Admin manage exam_subjects" ON public.exam_subjects;
DROP POLICY IF EXISTS "Teacher access exam_subjects" ON public.exam_subjects;
DROP POLICY IF EXISTS "Parent access exam_subjects" ON public.exam_subjects;
DROP POLICY IF EXISTS "Parent insert exam_subjects" ON public.exam_subjects;
DROP POLICY IF EXISTS "Public access exam_subjects" ON public.exam_subjects;
DROP POLICY IF EXISTS "Public insert exam_subjects" ON public.exam_subjects;
CREATE POLICY "Center Admin manage exam_subjects" ON public.exam_subjects FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access exam_subjects" ON public.exam_subjects FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access exam_subjects" ON public.exam_subjects FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: exams (OPERATIONAL_RECORDS)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage exams" ON public.exams;
DROP POLICY IF EXISTS "Center Admin manage exams" ON public.exams;
DROP POLICY IF EXISTS "Teacher access exams" ON public.exams;
DROP POLICY IF EXISTS "Parent access exams" ON public.exams;
DROP POLICY IF EXISTS "Parent insert exams" ON public.exams;
DROP POLICY IF EXISTS "Public access exams" ON public.exams;
DROP POLICY IF EXISTS "Public insert exams" ON public.exams;
CREATE POLICY "Center Admin manage exams" ON public.exams FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access exams" ON public.exams FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned(grade))));
CREATE POLICY "Parent access exams" ON public.exams FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: homework (OPERATIONAL_RECORDS)
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage homework" ON public.homework;
DROP POLICY IF EXISTS "Center Admin manage homework" ON public.homework;
DROP POLICY IF EXISTS "Teacher access homework" ON public.homework;
DROP POLICY IF EXISTS "Parent access homework" ON public.homework;
DROP POLICY IF EXISTS "Parent insert homework" ON public.homework;
DROP POLICY IF EXISTS "Public access homework" ON public.homework;
DROP POLICY IF EXISTS "Public insert homework" ON public.homework;
CREATE POLICY "Center Admin manage homework" ON public.homework FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access homework" ON public.homework FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned(grade))) OR teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access homework" ON public.homework FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND grade IN (SELECT s.grade FROM public.students s JOIN public.parent_students ps ON s.id = ps.student_id WHERE ps.parent_user_id = auth.uid()));

-- Table: lesson_plans (OPERATIONAL_RECORDS)
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage lesson_plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Center Admin manage lesson_plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Teacher access lesson_plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Parent access lesson_plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Parent insert lesson_plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Public access lesson_plans" ON public.lesson_plans;
DROP POLICY IF EXISTS "Public insert lesson_plans" ON public.lesson_plans;
CREATE POLICY "Center Admin manage lesson_plans" ON public.lesson_plans FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access lesson_plans" ON public.lesson_plans FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned(grade))) OR teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access lesson_plans" ON public.lesson_plans FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: period_schedules (OPERATIONAL_RECORDS)
ALTER TABLE public.period_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage period_schedules" ON public.period_schedules;
DROP POLICY IF EXISTS "Center Admin manage period_schedules" ON public.period_schedules;
DROP POLICY IF EXISTS "Teacher access period_schedules" ON public.period_schedules;
DROP POLICY IF EXISTS "Parent access period_schedules" ON public.period_schedules;
DROP POLICY IF EXISTS "Parent insert period_schedules" ON public.period_schedules;
DROP POLICY IF EXISTS "Public access period_schedules" ON public.period_schedules;
DROP POLICY IF EXISTS "Public insert period_schedules" ON public.period_schedules;
CREATE POLICY "Center Admin manage period_schedules" ON public.period_schedules FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access period_schedules" ON public.period_schedules FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned(grade))));
CREATE POLICY "Parent access period_schedules" ON public.period_schedules FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: preschool_activities (OPERATIONAL_RECORDS)
ALTER TABLE public.preschool_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage preschool_activities" ON public.preschool_activities;
DROP POLICY IF EXISTS "Center Admin manage preschool_activities" ON public.preschool_activities;
DROP POLICY IF EXISTS "Teacher access preschool_activities" ON public.preschool_activities;
DROP POLICY IF EXISTS "Parent access preschool_activities" ON public.preschool_activities;
DROP POLICY IF EXISTS "Parent insert preschool_activities" ON public.preschool_activities;
DROP POLICY IF EXISTS "Public access preschool_activities" ON public.preschool_activities;
DROP POLICY IF EXISTS "Public insert preschool_activities" ON public.preschool_activities;
CREATE POLICY "Center Admin manage preschool_activities" ON public.preschool_activities FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access preschool_activities" ON public.preschool_activities FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = preschool_activities.student_id)))) OR teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access preschool_activities" ON public.preschool_activities FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: student_activities (OPERATIONAL_RECORDS)
ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage student_activities" ON public.student_activities;
DROP POLICY IF EXISTS "Center Admin manage student_activities" ON public.student_activities;
DROP POLICY IF EXISTS "Teacher access student_activities" ON public.student_activities;
DROP POLICY IF EXISTS "Parent access student_activities" ON public.student_activities;
DROP POLICY IF EXISTS "Parent insert student_activities" ON public.student_activities;
DROP POLICY IF EXISTS "Public access student_activities" ON public.student_activities;
DROP POLICY IF EXISTS "Public insert student_activities" ON public.student_activities;
CREATE POLICY "Center Admin manage student_activities" ON public.student_activities FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access student_activities" ON public.student_activities FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = student_activities.student_id)))) OR teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access student_activities" ON public.student_activities FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: student_chapters (OPERATIONAL_RECORDS)
ALTER TABLE public.student_chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage student_chapters" ON public.student_chapters;
DROP POLICY IF EXISTS "Center Admin manage student_chapters" ON public.student_chapters;
DROP POLICY IF EXISTS "Teacher access student_chapters" ON public.student_chapters;
DROP POLICY IF EXISTS "Parent access student_chapters" ON public.student_chapters;
DROP POLICY IF EXISTS "Parent insert student_chapters" ON public.student_chapters;
DROP POLICY IF EXISTS "Public access student_chapters" ON public.student_chapters;
DROP POLICY IF EXISTS "Public insert student_chapters" ON public.student_chapters;
CREATE POLICY "Center Admin manage student_chapters" ON public.student_chapters FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access student_chapters" ON public.student_chapters FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher') AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = student_chapters.student_id)))) OR recorded_by_teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access student_chapters" ON public.student_chapters FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent') AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: student_homework_records (OPERATIONAL_RECORDS)
ALTER TABLE public.student_homework_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage student_homework_records" ON public.student_homework_records;
DROP POLICY IF EXISTS "Center Admin manage student_homework_records" ON public.student_homework_records;
DROP POLICY IF EXISTS "Teacher access student_homework_records" ON public.student_homework_records;
DROP POLICY IF EXISTS "Parent access student_homework_records" ON public.student_homework_records;
DROP POLICY IF EXISTS "Parent insert student_homework_records" ON public.student_homework_records;
DROP POLICY IF EXISTS "Public access student_homework_records" ON public.student_homework_records;
DROP POLICY IF EXISTS "Public insert student_homework_records" ON public.student_homework_records;
CREATE POLICY "Center Admin manage student_homework_records" ON public.student_homework_records FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access student_homework_records" ON public.student_homework_records FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher') AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = student_homework_records.student_id)))));
CREATE POLICY "Parent access student_homework_records" ON public.student_homework_records FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent') AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: student_results (OPERATIONAL_RECORDS)
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage student_results" ON public.student_results;
DROP POLICY IF EXISTS "Center Admin manage student_results" ON public.student_results;
DROP POLICY IF EXISTS "Teacher access student_results" ON public.student_results;
DROP POLICY IF EXISTS "Parent access student_results" ON public.student_results;
DROP POLICY IF EXISTS "Parent insert student_results" ON public.student_results;
DROP POLICY IF EXISTS "Public access student_results" ON public.student_results;
DROP POLICY IF EXISTS "Public insert student_results" ON public.student_results;
CREATE POLICY "Center Admin manage student_results" ON public.student_results FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access student_results" ON public.student_results FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher'));
CREATE POLICY "Parent access student_results" ON public.student_results FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent') AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: test_marks (OPERATIONAL_RECORDS)
ALTER TABLE public.test_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage test_marks" ON public.test_marks;
DROP POLICY IF EXISTS "Center Admin manage test_marks" ON public.test_marks;
DROP POLICY IF EXISTS "Teacher access test_marks" ON public.test_marks;
DROP POLICY IF EXISTS "Parent access test_marks" ON public.test_marks;
DROP POLICY IF EXISTS "Parent insert test_marks" ON public.test_marks;
DROP POLICY IF EXISTS "Public access test_marks" ON public.test_marks;
DROP POLICY IF EXISTS "Public insert test_marks" ON public.test_marks;
CREATE POLICY "Center Admin manage test_marks" ON public.test_marks FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access test_marks" ON public.test_marks FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher') AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = test_marks.student_id)))));
CREATE POLICY "Parent access test_marks" ON public.test_marks FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent'));

-- Table: test_results (OPERATIONAL_RECORDS)
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage test_results" ON public.test_results;
DROP POLICY IF EXISTS "Center Admin manage test_results" ON public.test_results;
DROP POLICY IF EXISTS "Teacher access test_results" ON public.test_results;
DROP POLICY IF EXISTS "Parent access test_results" ON public.test_results;
DROP POLICY IF EXISTS "Parent insert test_results" ON public.test_results;
DROP POLICY IF EXISTS "Public access test_results" ON public.test_results;
DROP POLICY IF EXISTS "Public insert test_results" ON public.test_results;
CREATE POLICY "Center Admin manage test_results" ON public.test_results FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access test_results" ON public.test_results FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher') AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = test_results.student_id)))));
CREATE POLICY "Parent access test_results" ON public.test_results FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent') AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: tests (OPERATIONAL_RECORDS)
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage tests" ON public.tests;
DROP POLICY IF EXISTS "Center Admin manage tests" ON public.tests;
DROP POLICY IF EXISTS "Teacher access tests" ON public.tests;
DROP POLICY IF EXISTS "Parent access tests" ON public.tests;
DROP POLICY IF EXISTS "Parent insert tests" ON public.tests;
DROP POLICY IF EXISTS "Public access tests" ON public.tests;
DROP POLICY IF EXISTS "Public insert tests" ON public.tests;
CREATE POLICY "Center Admin manage tests" ON public.tests FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access tests" ON public.tests FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned(class))) OR created_by = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access tests" ON public.tests FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: class_substitutions (OPERATIONAL_RECORDS)
ALTER TABLE public.class_substitutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage class_substitutions" ON public.class_substitutions;
DROP POLICY IF EXISTS "Center Admin manage class_substitutions" ON public.class_substitutions;
DROP POLICY IF EXISTS "Teacher access class_substitutions" ON public.class_substitutions;
DROP POLICY IF EXISTS "Parent access class_substitutions" ON public.class_substitutions;
DROP POLICY IF EXISTS "Parent insert class_substitutions" ON public.class_substitutions;
DROP POLICY IF EXISTS "Public access class_substitutions" ON public.class_substitutions;
DROP POLICY IF EXISTS "Public insert class_substitutions" ON public.class_substitutions;
CREATE POLICY "Center Admin manage class_substitutions" ON public.class_substitutions FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access class_substitutions" ON public.class_substitutions FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) OR substitute_teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access class_substitutions" ON public.class_substitutions FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: leave_applications (OPERATIONAL_RECORDS)
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage leave_applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Center Admin manage leave_applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Teacher access leave_applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Parent access leave_applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Parent insert leave_applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Public access leave_applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Public insert leave_applications" ON public.leave_applications;
CREATE POLICY "Center Admin manage leave_applications" ON public.leave_applications FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access leave_applications" ON public.leave_applications FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = leave_applications.student_id)))) OR teacher_id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Parent access leave_applications" ON public.leave_applications FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));
CREATE POLICY "Parent insert" ON public.leave_applications FOR INSERT TO authenticated WITH CHECK ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: discipline_issues (OPERATIONAL_RECORDS)
ALTER TABLE public.discipline_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage discipline_issues" ON public.discipline_issues;
DROP POLICY IF EXISTS "Center Admin manage discipline_issues" ON public.discipline_issues;
DROP POLICY IF EXISTS "Teacher access discipline_issues" ON public.discipline_issues;
DROP POLICY IF EXISTS "Parent access discipline_issues" ON public.discipline_issues;
DROP POLICY IF EXISTS "Parent insert discipline_issues" ON public.discipline_issues;
DROP POLICY IF EXISTS "Public access discipline_issues" ON public.discipline_issues;
DROP POLICY IF EXISTS "Public insert discipline_issues" ON public.discipline_issues;
CREATE POLICY "Center Admin manage discipline_issues" ON public.discipline_issues FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access discipline_issues" ON public.discipline_issues FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access discipline_issues" ON public.discipline_issues FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: notices (OPERATIONAL_RECORDS)
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage notices" ON public.notices;
DROP POLICY IF EXISTS "Center Admin manage notices" ON public.notices;
DROP POLICY IF EXISTS "Teacher access notices" ON public.notices;
DROP POLICY IF EXISTS "Parent access notices" ON public.notices;
DROP POLICY IF EXISTS "Parent insert notices" ON public.notices;
DROP POLICY IF EXISTS "Public access notices" ON public.notices;
DROP POLICY IF EXISTS "Public insert notices" ON public.notices;
CREATE POLICY "Center Admin manage notices" ON public.notices FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access notices" ON public.notices FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access notices" ON public.notices FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: notifications (OPERATIONAL_RECORDS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Center Admin manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Teacher access notifications" ON public.notifications;
DROP POLICY IF EXISTS "Parent access notifications" ON public.notifications;
DROP POLICY IF EXISTS "Parent insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public access notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public insert notifications" ON public.notifications;
CREATE POLICY "Center Admin manage notifications" ON public.notifications FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access notifications" ON public.notifications FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access notifications" ON public.notifications FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: meeting_attendees (OPERATIONAL_RECORDS)
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage meeting_attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Center Admin manage meeting_attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Teacher access meeting_attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Parent access meeting_attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Parent insert meeting_attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Public access meeting_attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Public insert meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Center Admin manage meeting_attendees" ON public.meeting_attendees FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access meeting_attendees" ON public.meeting_attendees FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access meeting_attendees" ON public.meeting_attendees FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: meeting_conclusions (OPERATIONAL_RECORDS)
ALTER TABLE public.meeting_conclusions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage meeting_conclusions" ON public.meeting_conclusions;
DROP POLICY IF EXISTS "Center Admin manage meeting_conclusions" ON public.meeting_conclusions;
DROP POLICY IF EXISTS "Teacher access meeting_conclusions" ON public.meeting_conclusions;
DROP POLICY IF EXISTS "Parent access meeting_conclusions" ON public.meeting_conclusions;
DROP POLICY IF EXISTS "Parent insert meeting_conclusions" ON public.meeting_conclusions;
DROP POLICY IF EXISTS "Public access meeting_conclusions" ON public.meeting_conclusions;
DROP POLICY IF EXISTS "Public insert meeting_conclusions" ON public.meeting_conclusions;
CREATE POLICY "Center Admin manage meeting_conclusions" ON public.meeting_conclusions FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access meeting_conclusions" ON public.meeting_conclusions FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access meeting_conclusions" ON public.meeting_conclusions FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: meetings (OPERATIONAL_RECORDS)
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage meetings" ON public.meetings;
DROP POLICY IF EXISTS "Center Admin manage meetings" ON public.meetings;
DROP POLICY IF EXISTS "Teacher access meetings" ON public.meetings;
DROP POLICY IF EXISTS "Parent access meetings" ON public.meetings;
DROP POLICY IF EXISTS "Parent insert meetings" ON public.meetings;
DROP POLICY IF EXISTS "Public access meetings" ON public.meetings;
DROP POLICY IF EXISTS "Public insert meetings" ON public.meetings;
CREATE POLICY "Center Admin manage meetings" ON public.meetings FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access meetings" ON public.meetings FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access meetings" ON public.meetings FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: suggestions (OPERATIONAL_RECORDS)
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Center Admin manage suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Teacher access suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Parent access suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Parent insert suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Public access suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Public insert suggestions" ON public.suggestions;
CREATE POLICY "Center Admin manage suggestions" ON public.suggestions FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access suggestions" ON public.suggestions FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access suggestions" ON public.suggestions FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: broadcast_messages (OPERATIONAL_RECORDS)
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage broadcast_messages" ON public.broadcast_messages;
DROP POLICY IF EXISTS "Center Admin manage broadcast_messages" ON public.broadcast_messages;
DROP POLICY IF EXISTS "Teacher access broadcast_messages" ON public.broadcast_messages;
DROP POLICY IF EXISTS "Parent access broadcast_messages" ON public.broadcast_messages;
DROP POLICY IF EXISTS "Parent insert broadcast_messages" ON public.broadcast_messages;
DROP POLICY IF EXISTS "Public access broadcast_messages" ON public.broadcast_messages;
DROP POLICY IF EXISTS "Public insert broadcast_messages" ON public.broadcast_messages;
CREATE POLICY "Center Admin manage broadcast_messages" ON public.broadcast_messages FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access broadcast_messages" ON public.broadcast_messages FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access broadcast_messages" ON public.broadcast_messages FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: chat_conversations (OPERATIONAL_RECORDS)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Center Admin manage chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Teacher access chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Parent access chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Parent insert chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Public access chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Public insert chat_conversations" ON public.chat_conversations;
CREATE POLICY "Center Admin manage chat_conversations" ON public.chat_conversations FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access chat_conversations" ON public.chat_conversations FOR ALL TO authenticated USING (((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) AND (NOT public.is_teacher_restricted() OR public.is_grade_assigned((SELECT s.grade FROM public.students s WHERE s.id = chat_conversations.student_id)))) OR teacher_user_id = auth.uid());
CREATE POLICY "Parent access chat_conversations" ON public.chat_conversations FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: chat_messages (OPERATIONAL_RECORDS)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Center Admin manage chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Teacher access chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Parent access chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Parent insert chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public access chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public insert chat_messages" ON public.chat_messages;
CREATE POLICY "Center Admin manage chat_messages" ON public.chat_messages FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access chat_messages" ON public.chat_messages FOR ALL TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access chat_messages" ON public.chat_messages FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND conversation_id IN (SELECT c.id FROM public.chat_conversations c WHERE c.parent_user_id = auth.uid()));
CREATE POLICY "Parent insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND conversation_id IN (SELECT c.id FROM public.chat_conversations c WHERE c.parent_user_id = auth.uid()));

-- Table: saas_invoices (FINANCIAL_RECORDS)
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage saas_invoices" ON public.saas_invoices;
DROP POLICY IF EXISTS "Center Admin manage saas_invoices" ON public.saas_invoices;
DROP POLICY IF EXISTS "Teacher access saas_invoices" ON public.saas_invoices;
DROP POLICY IF EXISTS "Parent access saas_invoices" ON public.saas_invoices;
DROP POLICY IF EXISTS "Parent insert saas_invoices" ON public.saas_invoices;
DROP POLICY IF EXISTS "Public access saas_invoices" ON public.saas_invoices;
DROP POLICY IF EXISTS "Public insert saas_invoices" ON public.saas_invoices;
CREATE POLICY "Center Admin manage saas_invoices" ON public.saas_invoices FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access saas_invoices" ON public.saas_invoices FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: center_usage_stats (FINANCIAL_RECORDS)
ALTER TABLE public.center_usage_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage center_usage_stats" ON public.center_usage_stats;
DROP POLICY IF EXISTS "Center Admin manage center_usage_stats" ON public.center_usage_stats;
DROP POLICY IF EXISTS "Teacher access center_usage_stats" ON public.center_usage_stats;
DROP POLICY IF EXISTS "Parent access center_usage_stats" ON public.center_usage_stats;
DROP POLICY IF EXISTS "Parent insert center_usage_stats" ON public.center_usage_stats;
DROP POLICY IF EXISTS "Public access center_usage_stats" ON public.center_usage_stats;
DROP POLICY IF EXISTS "Public insert center_usage_stats" ON public.center_usage_stats;
CREATE POLICY "Center Admin manage center_usage_stats" ON public.center_usage_stats FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access center_usage_stats" ON public.center_usage_stats FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: center_subscriptions (FINANCIAL_RECORDS)
ALTER TABLE public.center_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage center_subscriptions" ON public.center_subscriptions;
DROP POLICY IF EXISTS "Center Admin manage center_subscriptions" ON public.center_subscriptions;
DROP POLICY IF EXISTS "Teacher access center_subscriptions" ON public.center_subscriptions;
DROP POLICY IF EXISTS "Parent access center_subscriptions" ON public.center_subscriptions;
DROP POLICY IF EXISTS "Parent insert center_subscriptions" ON public.center_subscriptions;
DROP POLICY IF EXISTS "Public access center_subscriptions" ON public.center_subscriptions;
DROP POLICY IF EXISTS "Public insert center_subscriptions" ON public.center_subscriptions;
CREATE POLICY "Center Admin manage center_subscriptions" ON public.center_subscriptions FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access center_subscriptions" ON public.center_subscriptions FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: center_invoices (FINANCIAL_RECORDS)
ALTER TABLE public.center_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage center_invoices" ON public.center_invoices;
DROP POLICY IF EXISTS "Center Admin manage center_invoices" ON public.center_invoices;
DROP POLICY IF EXISTS "Teacher access center_invoices" ON public.center_invoices;
DROP POLICY IF EXISTS "Parent access center_invoices" ON public.center_invoices;
DROP POLICY IF EXISTS "Parent insert center_invoices" ON public.center_invoices;
DROP POLICY IF EXISTS "Public access center_invoices" ON public.center_invoices;
DROP POLICY IF EXISTS "Public insert center_invoices" ON public.center_invoices;
CREATE POLICY "Center Admin manage center_invoices" ON public.center_invoices FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access center_invoices" ON public.center_invoices FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: expenses (FINANCIAL_RECORDS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Center Admin manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Teacher access expenses" ON public.expenses;
DROP POLICY IF EXISTS "Parent access expenses" ON public.expenses;
DROP POLICY IF EXISTS "Parent insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public access expenses" ON public.expenses;
DROP POLICY IF EXISTS "Public insert expenses" ON public.expenses;
CREATE POLICY "Center Admin manage expenses" ON public.expenses FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access expenses" ON public.expenses FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: tax_slabs (FINANCIAL_RECORDS)
ALTER TABLE public.tax_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage tax_slabs" ON public.tax_slabs;
DROP POLICY IF EXISTS "Center Admin manage tax_slabs" ON public.tax_slabs;
DROP POLICY IF EXISTS "Teacher access tax_slabs" ON public.tax_slabs;
DROP POLICY IF EXISTS "Parent access tax_slabs" ON public.tax_slabs;
DROP POLICY IF EXISTS "Parent insert tax_slabs" ON public.tax_slabs;
DROP POLICY IF EXISTS "Public access tax_slabs" ON public.tax_slabs;
DROP POLICY IF EXISTS "Public insert tax_slabs" ON public.tax_slabs;
CREATE POLICY "Center Admin manage tax_slabs" ON public.tax_slabs FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access tax_slabs" ON public.tax_slabs FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id));

-- Table: fee_installments (FINANCIAL_SUBRECORDS)
ALTER TABLE public.fee_installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage fee_installments" ON public.fee_installments;
DROP POLICY IF EXISTS "Center Admin manage fee_installments" ON public.fee_installments;
DROP POLICY IF EXISTS "Teacher access fee_installments" ON public.fee_installments;
DROP POLICY IF EXISTS "Parent access fee_installments" ON public.fee_installments;
DROP POLICY IF EXISTS "Parent insert fee_installments" ON public.fee_installments;
DROP POLICY IF EXISTS "Public access fee_installments" ON public.fee_installments;
DROP POLICY IF EXISTS "Public insert fee_installments" ON public.fee_installments;
CREATE POLICY "Center Admin manage fee_installments" ON public.fee_installments FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Parent access fee_installments" ON public.fee_installments FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent') AND invoice_id IN (SELECT i.id FROM public.invoices i JOIN public.parent_students ps ON i.student_id = ps.student_id WHERE ps.parent_user_id = auth.uid()));

-- Table: invoice_items (FINANCIAL_SUBRECORDS)
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Center Admin manage invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Teacher access invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Parent access invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Parent insert invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Public access invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Public insert invoice_items" ON public.invoice_items;
CREATE POLICY "Center Admin manage invoice_items" ON public.invoice_items FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Parent access invoice_items" ON public.invoice_items FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent') AND invoice_id IN (SELECT i.id FROM public.invoices i JOIN public.parent_students ps ON i.student_id = ps.student_id WHERE ps.parent_user_id = auth.uid()));

-- Table: invoices (FINANCIAL_SUBRECORDS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Center Admin manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Teacher access invoices" ON public.invoices;
DROP POLICY IF EXISTS "Parent access invoices" ON public.invoices;
DROP POLICY IF EXISTS "Parent insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public access invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public insert invoices" ON public.invoices;
CREATE POLICY "Center Admin manage invoices" ON public.invoices FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Parent access invoices" ON public.invoices FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent' AND public.get_user_center_id() = center_id) AND student_id IN (SELECT ps.student_id FROM public.parent_students ps WHERE ps.parent_user_id = auth.uid()));

-- Table: payments (FINANCIAL_SUBRECORDS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage payments" ON public.payments;
DROP POLICY IF EXISTS "Center Admin manage payments" ON public.payments;
DROP POLICY IF EXISTS "Teacher access payments" ON public.payments;
DROP POLICY IF EXISTS "Parent access payments" ON public.payments;
DROP POLICY IF EXISTS "Parent insert payments" ON public.payments;
DROP POLICY IF EXISTS "Public access payments" ON public.payments;
DROP POLICY IF EXISTS "Public insert payments" ON public.payments;
CREATE POLICY "Center Admin manage payments" ON public.payments FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Parent access payments" ON public.payments FOR SELECT TO authenticated USING ((public.get_user_role() = 'parent') AND invoice_id IN (SELECT i.id FROM public.invoices i JOIN public.parent_students ps ON i.student_id = ps.student_id WHERE ps.parent_user_id = auth.uid()));

-- Table: teachers (ADMIN_ONLY)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Center Admin manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teacher access teachers" ON public.teachers;
DROP POLICY IF EXISTS "Parent access teachers" ON public.teachers;
DROP POLICY IF EXISTS "Parent insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public access teachers" ON public.teachers;
DROP POLICY IF EXISTS "Public insert teachers" ON public.teachers;
CREATE POLICY "Center Admin manage teachers" ON public.teachers FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access teachers" ON public.teachers FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id) OR id = (SELECT teacher_id FROM security.user_roles WHERE user_id = auth.uid()));

-- Table: staff_contracts (ADMIN_ONLY)
ALTER TABLE public.staff_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage staff_contracts" ON public.staff_contracts;
DROP POLICY IF EXISTS "Center Admin manage staff_contracts" ON public.staff_contracts;
DROP POLICY IF EXISTS "Teacher access staff_contracts" ON public.staff_contracts;
DROP POLICY IF EXISTS "Parent access staff_contracts" ON public.staff_contracts;
DROP POLICY IF EXISTS "Parent insert staff_contracts" ON public.staff_contracts;
DROP POLICY IF EXISTS "Public access staff_contracts" ON public.staff_contracts;
DROP POLICY IF EXISTS "Public insert staff_contracts" ON public.staff_contracts;
CREATE POLICY "Center Admin manage staff_contracts" ON public.staff_contracts FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access staff_contracts" ON public.staff_contracts FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher'));

-- Table: staff_documents (ADMIN_ONLY)
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Center Admin manage staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Teacher access staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Parent access staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Parent insert staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Public access staff_documents" ON public.staff_documents;
DROP POLICY IF EXISTS "Public insert staff_documents" ON public.staff_documents;
CREATE POLICY "Center Admin manage staff_documents" ON public.staff_documents FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access staff_documents" ON public.staff_documents FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher'));

-- Table: payroll_logs (ADMIN_ONLY)
ALTER TABLE public.payroll_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage payroll_logs" ON public.payroll_logs;
DROP POLICY IF EXISTS "Center Admin manage payroll_logs" ON public.payroll_logs;
DROP POLICY IF EXISTS "Teacher access payroll_logs" ON public.payroll_logs;
DROP POLICY IF EXISTS "Parent access payroll_logs" ON public.payroll_logs;
DROP POLICY IF EXISTS "Parent insert payroll_logs" ON public.payroll_logs;
DROP POLICY IF EXISTS "Public access payroll_logs" ON public.payroll_logs;
DROP POLICY IF EXISTS "Public insert payroll_logs" ON public.payroll_logs;
CREATE POLICY "Center Admin manage payroll_logs" ON public.payroll_logs FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access payroll_logs" ON public.payroll_logs FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher'));

-- Table: performance_evaluations (ADMIN_ONLY)
ALTER TABLE public.performance_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage performance_evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Center Admin manage performance_evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Teacher access performance_evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Parent access performance_evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Parent insert performance_evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Public access performance_evaluations" ON public.performance_evaluations;
DROP POLICY IF EXISTS "Public insert performance_evaluations" ON public.performance_evaluations;
CREATE POLICY "Center Admin manage performance_evaluations" ON public.performance_evaluations FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access performance_evaluations" ON public.performance_evaluations FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher'));

-- Table: teacher_attendance (ADMIN_ONLY)
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage teacher_attendance" ON public.teacher_attendance;
DROP POLICY IF EXISTS "Center Admin manage teacher_attendance" ON public.teacher_attendance;
DROP POLICY IF EXISTS "Teacher access teacher_attendance" ON public.teacher_attendance;
DROP POLICY IF EXISTS "Parent access teacher_attendance" ON public.teacher_attendance;
DROP POLICY IF EXISTS "Parent insert teacher_attendance" ON public.teacher_attendance;
DROP POLICY IF EXISTS "Public access teacher_attendance" ON public.teacher_attendance;
DROP POLICY IF EXISTS "Public insert teacher_attendance" ON public.teacher_attendance;
CREATE POLICY "Center Admin manage teacher_attendance" ON public.teacher_attendance FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access teacher_attendance" ON public.teacher_attendance FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: assets (ADMIN_ONLY)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage assets" ON public.assets;
DROP POLICY IF EXISTS "Center Admin manage assets" ON public.assets;
DROP POLICY IF EXISTS "Teacher access assets" ON public.assets;
DROP POLICY IF EXISTS "Parent access assets" ON public.assets;
DROP POLICY IF EXISTS "Parent insert assets" ON public.assets;
DROP POLICY IF EXISTS "Public access assets" ON public.assets;
DROP POLICY IF EXISTS "Public insert assets" ON public.assets;
CREATE POLICY "Center Admin manage assets" ON public.assets FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access assets" ON public.assets FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: consumable_logs (ADMIN_ONLY)
ALTER TABLE public.consumable_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage consumable_logs" ON public.consumable_logs;
DROP POLICY IF EXISTS "Center Admin manage consumable_logs" ON public.consumable_logs;
DROP POLICY IF EXISTS "Teacher access consumable_logs" ON public.consumable_logs;
DROP POLICY IF EXISTS "Parent access consumable_logs" ON public.consumable_logs;
DROP POLICY IF EXISTS "Parent insert consumable_logs" ON public.consumable_logs;
DROP POLICY IF EXISTS "Public access consumable_logs" ON public.consumable_logs;
DROP POLICY IF EXISTS "Public insert consumable_logs" ON public.consumable_logs;
CREATE POLICY "Center Admin manage consumable_logs" ON public.consumable_logs FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access consumable_logs" ON public.consumable_logs FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher'));

-- Table: consumables (ADMIN_ONLY)
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage consumables" ON public.consumables;
DROP POLICY IF EXISTS "Center Admin manage consumables" ON public.consumables;
DROP POLICY IF EXISTS "Teacher access consumables" ON public.consumables;
DROP POLICY IF EXISTS "Parent access consumables" ON public.consumables;
DROP POLICY IF EXISTS "Parent insert consumables" ON public.consumables;
DROP POLICY IF EXISTS "Public access consumables" ON public.consumables;
DROP POLICY IF EXISTS "Public insert consumables" ON public.consumables;
CREATE POLICY "Center Admin manage consumables" ON public.consumables FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access consumables" ON public.consumables FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: books (ADMIN_ONLY)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage books" ON public.books;
DROP POLICY IF EXISTS "Center Admin manage books" ON public.books;
DROP POLICY IF EXISTS "Teacher access books" ON public.books;
DROP POLICY IF EXISTS "Parent access books" ON public.books;
DROP POLICY IF EXISTS "Parent insert books" ON public.books;
DROP POLICY IF EXISTS "Public access books" ON public.books;
DROP POLICY IF EXISTS "Public insert books" ON public.books;
CREATE POLICY "Center Admin manage books" ON public.books FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access books" ON public.books FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: book_loans (ADMIN_ONLY)
ALTER TABLE public.book_loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage book_loans" ON public.book_loans;
DROP POLICY IF EXISTS "Center Admin manage book_loans" ON public.book_loans;
DROP POLICY IF EXISTS "Teacher access book_loans" ON public.book_loans;
DROP POLICY IF EXISTS "Parent access book_loans" ON public.book_loans;
DROP POLICY IF EXISTS "Parent insert book_loans" ON public.book_loans;
DROP POLICY IF EXISTS "Public access book_loans" ON public.book_loans;
DROP POLICY IF EXISTS "Public insert book_loans" ON public.book_loans;
CREATE POLICY "Center Admin manage book_loans" ON public.book_loans FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access book_loans" ON public.book_loans FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: vehicles (ADMIN_ONLY)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Center Admin manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Teacher access vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Parent access vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Parent insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Public access vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Public insert vehicles" ON public.vehicles;
CREATE POLICY "Center Admin manage vehicles" ON public.vehicles FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access vehicles" ON public.vehicles FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: transport_assignments (ADMIN_ONLY)
ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage transport_assignments" ON public.transport_assignments;
DROP POLICY IF EXISTS "Center Admin manage transport_assignments" ON public.transport_assignments;
DROP POLICY IF EXISTS "Teacher access transport_assignments" ON public.transport_assignments;
DROP POLICY IF EXISTS "Parent access transport_assignments" ON public.transport_assignments;
DROP POLICY IF EXISTS "Parent insert transport_assignments" ON public.transport_assignments;
DROP POLICY IF EXISTS "Public access transport_assignments" ON public.transport_assignments;
DROP POLICY IF EXISTS "Public insert transport_assignments" ON public.transport_assignments;
CREATE POLICY "Center Admin manage transport_assignments" ON public.transport_assignments FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access transport_assignments" ON public.transport_assignments FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: admission_applications (ADMIN_ONLY)
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Center Admin manage admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Teacher access admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Parent access admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Parent insert admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Public access admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Public insert admission_applications" ON public.admission_applications;
CREATE POLICY "Center Admin manage admission_applications" ON public.admission_applications FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access admission_applications" ON public.admission_applications FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: parent_students (ADMIN_ONLY)
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Center Admin manage parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Teacher access parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Parent access parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Parent insert parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Public access parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Public insert parent_students" ON public.parent_students;
CREATE POLICY "Center Admin manage parent_students" ON public.parent_students FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access parent_students" ON public.parent_students FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher'));

-- Table: student_promotion_history (ADMIN_ONLY)
ALTER TABLE public.student_promotion_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage student_promotion_history" ON public.student_promotion_history;
DROP POLICY IF EXISTS "Center Admin manage student_promotion_history" ON public.student_promotion_history;
DROP POLICY IF EXISTS "Teacher access student_promotion_history" ON public.student_promotion_history;
DROP POLICY IF EXISTS "Parent access student_promotion_history" ON public.student_promotion_history;
DROP POLICY IF EXISTS "Parent insert student_promotion_history" ON public.student_promotion_history;
DROP POLICY IF EXISTS "Public access student_promotion_history" ON public.student_promotion_history;
DROP POLICY IF EXISTS "Public insert student_promotion_history" ON public.student_promotion_history;
CREATE POLICY "Center Admin manage student_promotion_history" ON public.student_promotion_history FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center')));
CREATE POLICY "Teacher access student_promotion_history" ON public.student_promotion_history FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher'));

-- Table: transfer_certificates (ADMIN_ONLY)
ALTER TABLE public.transfer_certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage transfer_certificates" ON public.transfer_certificates;
DROP POLICY IF EXISTS "Center Admin manage transfer_certificates" ON public.transfer_certificates;
DROP POLICY IF EXISTS "Teacher access transfer_certificates" ON public.transfer_certificates;
DROP POLICY IF EXISTS "Parent access transfer_certificates" ON public.transfer_certificates;
DROP POLICY IF EXISTS "Parent insert transfer_certificates" ON public.transfer_certificates;
DROP POLICY IF EXISTS "Public access transfer_certificates" ON public.transfer_certificates;
DROP POLICY IF EXISTS "Public insert transfer_certificates" ON public.transfer_certificates;
CREATE POLICY "Center Admin manage transfer_certificates" ON public.transfer_certificates FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access transfer_certificates" ON public.transfer_certificates FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: audit_logs (ADMIN_ONLY)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Center Admin manage audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Teacher access audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Parent access audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Parent insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public access audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public insert audit_logs" ON public.audit_logs;
CREATE POLICY "Center Admin manage audit_logs" ON public.audit_logs FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: center_requirements (ADMIN_ONLY)
ALTER TABLE public.center_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage center_requirements" ON public.center_requirements;
DROP POLICY IF EXISTS "Center Admin manage center_requirements" ON public.center_requirements;
DROP POLICY IF EXISTS "Teacher access center_requirements" ON public.center_requirements;
DROP POLICY IF EXISTS "Parent access center_requirements" ON public.center_requirements;
DROP POLICY IF EXISTS "Parent insert center_requirements" ON public.center_requirements;
DROP POLICY IF EXISTS "Public access center_requirements" ON public.center_requirements;
DROP POLICY IF EXISTS "Public insert center_requirements" ON public.center_requirements;
CREATE POLICY "Center Admin manage center_requirements" ON public.center_requirements FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access center_requirements" ON public.center_requirements FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: activity_logs (ADMIN_ONLY)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Center Admin manage activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Teacher access activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Parent access activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Parent insert activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Public access activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Public insert activity_logs" ON public.activity_logs;
CREATE POLICY "Center Admin manage activity_logs" ON public.activity_logs FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: students (ADMIN_ONLY)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage students" ON public.students;
DROP POLICY IF EXISTS "Center Admin manage students" ON public.students;
DROP POLICY IF EXISTS "Teacher access students" ON public.students;
DROP POLICY IF EXISTS "Parent access students" ON public.students;
DROP POLICY IF EXISTS "Parent insert students" ON public.students;
DROP POLICY IF EXISTS "Public access students" ON public.students;
DROP POLICY IF EXISTS "Public insert students" ON public.students;
CREATE POLICY "Center Admin manage students" ON public.students FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access students" ON public.students FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

-- Table: class_teacher_assignments (ADMIN_ONLY)
ALTER TABLE public.class_teacher_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super Admin manage class_teacher_assignments" ON public.class_teacher_assignments;
DROP POLICY IF EXISTS "Center Admin manage class_teacher_assignments" ON public.class_teacher_assignments;
DROP POLICY IF EXISTS "Teacher access class_teacher_assignments" ON public.class_teacher_assignments;
DROP POLICY IF EXISTS "Parent access class_teacher_assignments" ON public.class_teacher_assignments;
DROP POLICY IF EXISTS "Parent insert class_teacher_assignments" ON public.class_teacher_assignments;
DROP POLICY IF EXISTS "Public access class_teacher_assignments" ON public.class_teacher_assignments;
DROP POLICY IF EXISTS "Public insert class_teacher_assignments" ON public.class_teacher_assignments;
CREATE POLICY "Center Admin manage class_teacher_assignments" ON public.class_teacher_assignments FOR ALL TO authenticated USING ((public.get_user_role() IN ('admin', 'center') AND public.get_user_center_id() = center_id));
CREATE POLICY "Teacher access class_teacher_assignments" ON public.class_teacher_assignments FOR SELECT TO authenticated USING ((public.get_user_role() = 'teacher' AND public.get_user_center_id() = center_id));

COMMIT;
