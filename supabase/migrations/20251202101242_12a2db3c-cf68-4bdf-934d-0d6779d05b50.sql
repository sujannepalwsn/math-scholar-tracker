-- Centers table
CREATE TABLE public.centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Users table (for authentication)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'center', 'teacher', 'parent')),
  center_id UUID REFERENCES public.centers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Teachers table
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  center_id UUID NOT NULL REFERENCES public.centers(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  name TEXT NOT NULL,
  roll_number TEXT,
  class TEXT,
  section TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  date_of_birth DATE,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Center feature permissions
CREATE TABLE public.center_feature_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id) UNIQUE,
  take_attendance BOOLEAN DEFAULT true,
  view_records BOOLEAN DEFAULT true,
  lesson_plans BOOLEAN DEFAULT true,
  lesson_tracking BOOLEAN DEFAULT true,
  homework_management BOOLEAN DEFAULT true,
  preschool_activities BOOLEAN DEFAULT true,
  discipline_issues BOOLEAN DEFAULT true,
  test_management BOOLEAN DEFAULT true,
  register_student BOOLEAN DEFAULT true,
  summary BOOLEAN DEFAULT true,
  teacher_management BOOLEAN DEFAULT true,
  finance BOOLEAN DEFAULT true,
  meetings_management BOOLEAN DEFAULT true,
  ai_insights BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Teacher feature permissions
CREATE TABLE public.teacher_feature_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) UNIQUE,
  take_attendance BOOLEAN DEFAULT true,
  lesson_tracking BOOLEAN DEFAULT true,
  homework_management BOOLEAN DEFAULT true,
  preschool_activities BOOLEAN DEFAULT true,
  discipline_issues BOOLEAN DEFAULT true,
  test_management BOOLEAN DEFAULT true,
  student_report_access BOOLEAN DEFAULT true,
  meetings_management BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activity types
CREATE TABLE public.activity_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Discipline categories
CREATE TABLE public.discipline_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  name TEXT NOT NULL,
  description TEXT,
  default_severity TEXT DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  center_id UUID NOT NULL REFERENCES public.centers(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  remarks TEXT,
  marked_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Homework table
CREATE TABLE public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  teacher_id UUID REFERENCES public.teachers(id),
  class TEXT NOT NULL,
  section TEXT,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Discipline issues
CREATE TABLE public.discipline_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  center_id UUID NOT NULL REFERENCES public.centers(id),
  category_id UUID REFERENCES public.discipline_categories(id),
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reported_by UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tests/Exams table
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  section TEXT,
  subject TEXT NOT NULL,
  total_marks INTEGER NOT NULL,
  date DATE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Test marks
CREATE TABLE public.test_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  marks_obtained NUMERIC,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Preschool activities
CREATE TABLE public.preschool_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  activity_type_id UUID REFERENCES public.activity_types(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  teacher_id UUID REFERENCES public.teachers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lesson plans
CREATE TABLE public.lesson_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  teacher_id UUID REFERENCES public.teachers(id),
  class TEXT NOT NULL,
  section TEXT,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  objectives TEXT,
  content TEXT,
  planned_date DATE,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  title TEXT NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  meeting_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'scheduled',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Meeting attendees
CREATE TABLE public.meeting_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id),
  user_id UUID REFERENCES public.users(id),
  student_id UUID REFERENCES public.students(id),
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Finance: Fee headings
CREATE TABLE public.fee_headings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Finance: Fee structures
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  fee_heading_id UUID NOT NULL REFERENCES public.fee_headings(id),
  class TEXT,
  amount NUMERIC NOT NULL,
  frequency TEXT DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Finance: Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  invoice_number TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Finance: Payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Finance: Expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id UUID NOT NULL REFERENCES public.centers(id),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preschool_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_headings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (edge functions use service role)
CREATE POLICY "Service role full access" ON public.centers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.center_feature_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.teacher_feature_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.activity_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.discipline_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.homework FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.discipline_issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.test_marks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.preschool_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.lesson_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.meeting_attendees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.fee_headings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.fee_structures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON public.centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_center_feature_permissions_updated_at BEFORE UPDATE ON public.center_feature_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_feature_permissions_updated_at BEFORE UPDATE ON public.teacher_feature_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activity_types_updated_at BEFORE UPDATE ON public.activity_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discipline_categories_updated_at BEFORE UPDATE ON public.discipline_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discipline_issues_updated_at BEFORE UPDATE ON public.discipline_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lesson_plans_updated_at BEFORE UPDATE ON public.lesson_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();