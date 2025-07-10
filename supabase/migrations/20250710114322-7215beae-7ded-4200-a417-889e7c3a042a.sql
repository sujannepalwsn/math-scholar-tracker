
-- Create enum types for better data integrity
CREATE TYPE user_role AS ENUM ('admin', 'student', 'parent', 'co_teacher');
CREATE TYPE grade_level AS ENUM ('8', '9', '10');
CREATE TYPE question_type AS ENUM ('mcq', 'short_answer', 'numeric');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE absence_reason AS ENUM ('sick', 'family_emergency', 'school_event', 'other');
CREATE TYPE assignment_status AS ENUM ('assigned', 'submitted', 'graded', 'overdue');

-- User profiles table with role-based access
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table with detailed registration information
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id TEXT UNIQUE NOT NULL, -- Auto-generated unique ID
  grade grade_level NOT NULL,
  school_name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT,
  address TEXT,
  emergency_contact TEXT,
  photo_url TEXT,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parent-student relationships
CREATE TABLE parent_student_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- Lesson plans table
CREATE TABLE lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grade grade_level NOT NULL,
  topic TEXT NOT NULL,
  lesson_date DATE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  materials TEXT[], -- Array of material names/links
  objectives TEXT[],
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tests table (pre-tests and post-tests)
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grade grade_level NOT NULL,
  topic TEXT NOT NULL,
  test_type TEXT CHECK (test_type IN ('pre_test', 'post_test', 'quiz', 'assessment')),
  total_marks INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test questions table
CREATE TABLE test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  options JSONB, -- For MCQ options
  correct_answer TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  explanation TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test attempts/results table
CREATE TABLE test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  answers JSONB NOT NULL, -- Store student answers
  marks_obtained INTEGER DEFAULT 0,
  total_marks INTEGER NOT NULL,
  percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_marks > 0 THEN (marks_obtained::DECIMAL / total_marks) * 100 ELSE 0 END
  ) STORED,
  time_taken_minutes INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES profiles(id),
  feedback TEXT,
  UNIQUE(test_id, student_id)
);

-- Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lesson_plan_id UUID REFERENCES lesson_plans(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status attendance_status NOT NULL,
  absence_reason absence_reason,
  notes TEXT,
  marked_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, attendance_date)
);

-- Homework/Assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  grade grade_level NOT NULL,
  topic TEXT,
  assigned_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  max_marks INTEGER DEFAULT 10,
  instructions TEXT,
  attachment_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignment submissions table
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  submission_text TEXT,
  attachment_urls TEXT[],
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status assignment_status DEFAULT 'submitted',
  marks_obtained INTEGER,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES profiles(id),
  UNIQUE(assignment_id, student_id)
);

-- Teacher remarks/feedback table
CREATE TABLE teacher_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  remark_text TEXT NOT NULL,
  remark_type TEXT CHECK (remark_type IN ('weekly', 'monthly', 'general', 'behavior', 'academic')),
  is_visible_to_parents BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'test_reminder', 'homework_due', 'feedback_available', etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for students
CREATE POLICY "Admins can manage all students" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Students can view their own data" ON students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Parents can view their children's data" ON students FOR SELECT USING (
  EXISTS (SELECT 1 FROM parent_student_relations psr 
          WHERE psr.student_id = students.id AND psr.parent_id = auth.uid())
);

-- RLS Policies for lesson plans
CREATE POLICY "Admins can manage lesson plans" ON lesson_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Students can view lesson plans for their grade" ON lesson_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s JOIN profiles p ON s.user_id = p.id 
          WHERE p.id = auth.uid() AND s.grade = lesson_plans.grade)
);

-- RLS Policies for tests
CREATE POLICY "Admins can manage tests" ON tests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Students can view published tests for their grade" ON tests FOR SELECT USING (
  is_published = TRUE AND EXISTS (
    SELECT 1 FROM students s JOIN profiles p ON s.user_id = p.id 
    WHERE p.id = auth.uid() AND s.grade = tests.grade
  )
);

-- RLS Policies for test questions
CREATE POLICY "Admins can manage test questions" ON test_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Students can view questions of published tests" ON test_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM tests t WHERE t.id = test_questions.test_id AND t.is_published = TRUE)
);

-- RLS Policies for test attempts
CREATE POLICY "Admins can view all test attempts" ON test_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Students can view their own test attempts" ON test_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Students can insert their own test attempts" ON test_attempts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Parents can view their children's test attempts" ON test_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM parent_student_relations psr 
          WHERE psr.student_id = test_attempts.student_id AND psr.parent_id = auth.uid())
);

-- RLS Policies for attendance
CREATE POLICY "Admins can manage attendance" ON attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Students can view their own attendance" ON attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Parents can view their children's attendance" ON attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM parent_student_relations psr 
          WHERE psr.student_id = attendance.student_id AND psr.parent_id = auth.uid())
);

-- RLS Policies for assignments
CREATE POLICY "Admins can manage assignments" ON assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Students can view assignments for their grade" ON assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s JOIN profiles p ON s.user_id = p.id 
          WHERE p.id = auth.uid() AND s.grade = assignments.grade)
);

-- RLS Policies for assignment submissions
CREATE POLICY "Admins can view all submissions" ON assignment_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Students can manage their own submissions" ON assignment_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Parents can view their children's submissions" ON assignment_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM parent_student_relations psr 
          WHERE psr.student_id = assignment_submissions.student_id AND psr.parent_id = auth.uid())
);

-- RLS Policies for teacher remarks
CREATE POLICY "Admins can manage remarks" ON teacher_remarks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Students can view remarks about them" ON teacher_remarks FOR SELECT USING (
  EXISTS (SELECT 1 FROM students s WHERE s.id = student_id AND s.user_id = auth.uid())
);
CREATE POLICY "Parents can view remarks about their children" ON teacher_remarks FOR SELECT USING (
  is_visible_to_parents = TRUE AND EXISTS (
    SELECT 1 FROM parent_student_relations psr 
    WHERE psr.student_id = teacher_remarks.student_id AND psr.parent_id = auth.uid()
  )
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (recipient_id = auth.uid());
CREATE POLICY "Admins can create notifications" ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('student-photos', 'student-photos', true),
  ('assignment-files', 'assignment-files', true),
  ('lesson-materials', 'lesson-materials', true);

-- Storage policies for student photos
CREATE POLICY "Admins can upload student photos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'student-photos' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Anyone can view student photos" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');

-- Storage policies for assignment files
CREATE POLICY "Students and admins can upload assignment files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'assignment-files' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher', 'student'))
);
CREATE POLICY "Anyone can view assignment files" ON storage.objects FOR SELECT USING (bucket_id = 'assignment-files');

-- Storage policies for lesson materials
CREATE POLICY "Admins can upload lesson materials" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lesson-materials' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'co_teacher'))
);
CREATE POLICY "Anyone can view lesson materials" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-materials');

-- Create function to auto-generate student IDs
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  counter INTEGER := 1;
BEGIN
  LOOP
    new_id := 'STU' || TO_CHAR(CURRENT_DATE, 'YY') || LPAD(counter::TEXT, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = new_id) THEN
      RETURN new_id;
    END IF;
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate student ID
CREATE OR REPLACE FUNCTION set_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
    NEW.student_id := generate_student_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_student_id
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION set_student_id();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_tests_grade ON tests(grade);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, attendance_date);
CREATE INDEX idx_assignments_grade_due_date ON assignments(grade, due_date);
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at);
