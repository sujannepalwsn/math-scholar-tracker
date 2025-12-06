-- ============================================================================
-- ERP SCHEMA MIGRATION SCRIPT - COMPLETE RESET
-- WARNING: This script will DELETE ALL DATA in your public schema.
-- Please BACK UP your database before running this script.
-- ============================================================================

-- 1. Drop all foreign key constraints first to avoid dependency issues during table drops
-- This is a more robust way than relying solely on CASCADE for every table.
DO $$ DECLARE
    r record;
BEGIN
    FOR r IN (SELECT conname, relname FROM pg_constraint JOIN pg_class ON conrelid = pg_class.oid WHERE contype = 'f' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.relname) || ' DROP CONSTRAINT ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;
END $$;

-- 2. Drop all tables (both old and new schema tables)
-- Order is less critical here after dropping FKs, but still good practice.
DROP TABLE IF EXISTS public.ai_summaries CASCADE;
DROP TABLE IF EXISTS public.centers CASCADE;
DROP TABLE IF EXISTS public.chapter_teachings CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.student_chapters CASCADE;
DROP TABLE IF EXISTS public.test_results CASCADE;
DROP TABLE IF EXISTS public.tests CASCADE;
DROP TABLE IF EXISTS public.homework CASCADE;
DROP TABLE IF EXISTS public.student_homework_status CASCADE;
DROP TABLE IF EXISTS public.preschool_activities CASCADE;
DROP TABLE IF EXISTS public.discipline_issues CASCADE;
DROP TABLE IF EXISTS public.teacher_attendance CASCADE;
DROP TABLE IF EXISTS public.lesson_plans CASCADE;
DROP TABLE IF EXISTS public.fee_headings CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.financial_summaries CASCADE;
DROP TABLE IF EXISTS public.payment_allocations CASCADE;
DROP TABLE IF EXISTS public.center_feature_permissions CASCADE;
DROP TABLE IF EXISTS public.teacher_feature_permissions CASCADE;

-- Drop tables from the new ERP schema
DROP TABLE IF EXISTS public.exam_results CASCADE;
DROP TABLE IF EXISTS public.assignment_submissions CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.message_participants CASCADE;
DROP TABLE IF EXISTS public.student_parents CASCADE;
DROP TABLE IF EXISTS public.user_permissions CASCADE;
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.parents CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.fee_structures CASCADE;
DROP TABLE IF EXISTS public.fee_categories CASCADE;
DROP TABLE IF EXISTS public.academic_years CASCADE;
DROP TABLE IF EXISTS public.grade_levels CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.message_threads CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;


-- 3. Drop all ENUM types if they exist
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.invoice_status CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.transaction_type CASCADE;
DROP TYPE IF EXISTS public.expense_category CASCADE;
DROP TYPE IF EXISTS public.submission_status CASCADE;
DROP TYPE IF EXISTS public.attendance_status CASCADE;
DROP TYPE IF EXISTS public.assignment_status CASCADE;
DROP TYPE IF EXISTS public.message_priority CASCADE;
DROP TYPE IF EXISTS public.plan_tier CASCADE;
DROP TYPE IF EXISTS public.school_status CASCADE;
DROP TYPE IF EXISTS public.user_status CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.role CASCADE;


-- 4. Create new ENUM types first
CREATE TYPE public.submission_status AS ENUM ('not_submitted', 'submitted', 'graded');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE public.assignment_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.message_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.plan_tier AS ENUM ('free', 'basic', 'premium');
CREATE TYPE public.school_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'partially_paid', 'overdue', 'refunded', 'cancelled');
CREATE TYPE public.role AS ENUM ('admin', 'school_admin', 'teacher', 'student', 'parent');


-- 5. Create new tables based on the provided schema (without foreign keys initially)

CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  subdomain character varying NOT NULL UNIQUE,
  plan_tier public.plan_tier DEFAULT 'basic'::plan_tier,
  max_schools integer DEFAULT 1,
  max_users integer DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name character varying NOT NULL,
  address text NOT NULL,
  phone character varying NOT NULL,
  email character varying NOT NULL,
  website character varying,
  principal_id uuid, -- FK added later
  logo_url character varying,
  established_date date,
  student_capacity integer DEFAULT 0,
  current_enrollment integer DEFAULT 0,
  accreditation character varying,
  school_type character varying DEFAULT 'public'::character varying,
  grade_range character varying DEFAULT 'K-12'::character varying,
  status public.school_status DEFAULT 'active'::school_status,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT schools_pkey PRIMARY KEY (id)
);

CREATE TABLE public.academic_years (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL, -- FK added later
  name character varying NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT academic_years_pkey PRIMARY KEY (id)
);

CREATE TABLE public.grade_levels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL, -- FK added later
  name character varying NOT NULL,
  grade_number integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT grade_levels_pkey PRIMARY KEY (id)
);

CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL, -- FK added later
  name character varying NOT NULL,
  code character varying NOT NULL UNIQUE,
  description text,
  department character varying,
  credits numeric DEFAULT 1.0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL, -- FK added later
  school_id uuid, -- FK added later
  auth_user_id uuid UNIQUE,
  email character varying NOT NULL UNIQUE,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  role public.role NOT NULL,
  status public.user_status DEFAULT 'active'::user_status,
  phone character varying,
  address text,
  date_of_birth date,
  gender character varying,
  profile_image_url character varying,
  emergency_contact jsonb,
  last_login timestamp with time zone,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.parents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL, -- FK added later
  school_id uuid NOT NULL, -- FK added later
  occupation character varying,
  workplace character varying,
  work_phone character varying,
  is_guardian boolean DEFAULT true,
  relationship character varying DEFAULT 'parent'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT parents_pkey PRIMARY KEY (id)
);

CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL, -- FK added later
  school_id uuid NOT NULL, -- FK added later
  student_id character varying NOT NULL UNIQUE,
  grade_level_id uuid NOT NULL, -- FK added later
  admission_date date,
  graduation_date date,
  gpa numeric DEFAULT 0.00,
  credits_earned numeric DEFAULT 0.0,
  attendance_percentage numeric DEFAULT 100.00,
  medical_info jsonb,
  transportation_info jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
);

CREATE TABLE public.teachers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL, -- FK added later
  school_id uuid NOT NULL, -- FK added later
  employee_id character varying NOT NULL UNIQUE,
  hire_date date,
  department character varying,
  qualifications jsonb,
  certifications jsonb,
  salary numeric,
  contract_type character varying DEFAULT 'full-time'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teachers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL, -- FK added later
  academic_year_id uuid NOT NULL, -- FK added later
  subject_id uuid NOT NULL, -- FK added later
  grade_level_id uuid NOT NULL, -- FK added later
  teacher_id uuid NOT NULL, -- FK added later (references users.id)
  name character varying NOT NULL,
  section character varying,
  room_number character varying,
  schedule jsonb,
  max_students integer DEFAULT 30,
  current_enrollment integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fee_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL, -- FK added later
  name character varying NOT NULL,
  description text,
  is_mandatory boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fee_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fee_structures (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL, -- FK added later
  academic_year_id uuid NOT NULL, -- FK added later
  fee_category_id uuid NOT NULL, -- FK added later
  grade_level_id uuid, -- FK added later
  amount numeric NOT NULL,
  due_date date,
  late_fee_amount numeric DEFAULT 0.00,
  late_fee_days integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fee_structures_pkey PRIMARY KEY (id)
);

CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL, -- FK added later
  teacher_id uuid NOT NULL, -- FK added later (references users.id)
  title character varying NOT NULL,
  description text,
  instructions text,
  due_date timestamp with time zone,
  points_possible numeric DEFAULT 100.00,
  assignment_type character varying DEFAULT 'homework'::character varying,
  status public.assignment_status DEFAULT 'draft'::assignment_status,
  attachments jsonb DEFAULT '[]'::jsonb,
  rubric jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL, -- FK added later
  student_id uuid NOT NULL, -- FK added later
  date date NOT NULL,
  status public.attendance_status DEFAULT 'present'::attendance_status,
  notes text,
  recorded_by uuid, -- FK added later (references users.id)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exam_results (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL, -- FK added later
  student_id uuid NOT NULL, -- FK added later
  points_earned numeric,
  percentage numeric,
  grade character varying,
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_results_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exams (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL, -- FK added later
  teacher_id uuid NOT NULL, -- FK added later (references users.id)
  title character varying NOT NULL,
  description text,
  exam_date timestamp with time zone,
  duration_minutes integer,
  total_points numeric DEFAULT 100.00,
  exam_type character varying DEFAULT 'written'::character varying,
  instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exams_pkey PRIMARY KEY (id)
);

CREATE TABLE public.message_threads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  school_id uuid NOT NULL, -- FK added later
  subject character varying NOT NULL,
  created_by uuid NOT NULL, -- FK added later (references users.id)
  priority public.message_priority DEFAULT 'normal'::message_priority,
  is_announcement boolean DEFAULT false,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT message_threads_pkey PRIMARY KEY (id)
);

CREATE TABLE public.message_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_id uuid NOT NULL, -- FK added later
  user_id uuid NOT NULL, -- FK added later
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone,
  CONSTRAINT message_participants_pkey PRIMARY KEY (id)
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_id uuid NOT NULL, -- FK added later
  sender_id uuid NOT NULL, -- FK added later
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL, -- FK added later
  title character varying NOT NULL,
  message text NOT NULL,
  type character varying DEFAULT 'general'::character varying,
  priority public.message_priority DEFAULT 'normal'::message_priority,
  is_read boolean DEFAULT false,
  action_url character varying,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL, -- FK added later
  fee_structure_id uuid NOT NULL, -- FK added later
  amount numeric NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  payment_method character varying,
  transaction_id character varying,
  status public.payment_status DEFAULT 'pending'::payment_status,
  reference_number character varying,
  notes text,
  processed_by uuid, -- FK added later (references users.id)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.student_parents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL, -- FK added later
  parent_id uuid NOT NULL, -- FK added later
  relationship character varying NOT NULL,
  is_primary boolean DEFAULT false,
  can_pickup boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_parents_pkey PRIMARY KEY (id)
);

CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL, -- FK added later
  permission character varying NOT NULL,
  granted_by uuid, -- FK added later (references users.id)
  granted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_permissions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL, -- FK added later
  user_id uuid, -- FK added later
  action character varying NOT NULL,
  resource_type character varying NOT NULL,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);


-- 6. Add all foreign key constraints
ALTER TABLE public.schools ADD CONSTRAINT schools_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.schools ADD CONSTRAINT fk_schools_principal_id FOREIGN KEY (principal_id) REFERENCES public.users(id);

ALTER TABLE public.academic_years ADD CONSTRAINT academic_years_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);

ALTER TABLE public.grade_levels ADD CONSTRAINT grade_levels_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);

ALTER TABLE public.subjects ADD CONSTRAINT subjects_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);

ALTER TABLE public.users ADD CONSTRAINT users_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);
ALTER TABLE public.users ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

ALTER TABLE public.parents ADD CONSTRAINT parents_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);
ALTER TABLE public.parents ADD CONSTRAINT parents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.students ADD CONSTRAINT students_grade_level_id_fkey FOREIGN KEY (grade_level_id) REFERENCES public.grade_levels(id);
ALTER TABLE public.students ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);
ALTER TABLE public.students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.teachers ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);
ALTER TABLE public.teachers ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.classes ADD CONSTRAINT classes_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
ALTER TABLE public.classes ADD CONSTRAINT classes_grade_level_id_fkey FOREIGN KEY (grade_level_id) REFERENCES public.grade_levels(id);
ALTER TABLE public.classes ADD CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);
ALTER TABLE public.classes ADD CONSTRAINT classes_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);
ALTER TABLE public.classes ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);

ALTER TABLE public.fee_categories ADD CONSTRAINT fee_categories_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);

ALTER TABLE public.fee_structures ADD CONSTRAINT fee_structures_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);
ALTER TABLE public.fee_structures ADD CONSTRAINT fee_structures_fee_category_id_fkey FOREIGN KEY (fee_category_id) REFERENCES public.fee_categories(id);
ALTER TABLE public.fee_structures ADD CONSTRAINT fee_structures_grade_level_id_fkey FOREIGN KEY (grade_level_id) REFERENCES public.grade_levels(id);
ALTER TABLE public.fee_structures ADD CONSTRAINT fee_structures_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);

ALTER TABLE public.assignments ADD CONSTRAINT assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);
ALTER TABLE public.assignments ADD CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);

ALTER TABLE public.attendance ADD CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);
ALTER TABLE public.attendance ADD CONSTRAINT attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);

ALTER TABLE public.exam_results ADD CONSTRAINT exam_results_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id);
ALTER TABLE public.exam_results ADD CONSTRAINT exam_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);

ALTER TABLE public.exams ADD CONSTRAINT exams_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);
ALTER TABLE public.exams ADD CONSTRAINT exams_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);

ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);

ALTER TABLE public.message_participants ADD CONSTRAINT message_participants_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id);
ALTER TABLE public.message_participants ADD CONSTRAINT message_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);
ALTER TABLE public.messages ADD CONSTRAINT messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.message_threads(id);

ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id);
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);

ALTER TABLE public.student_parents ADD CONSTRAINT student_parents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(id);
ALTER TABLE public.student_parents ADD CONSTRAINT student_parents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);

ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);
ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);