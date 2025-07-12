
-- Fix admin user with correct email
DELETE FROM auth.users WHERE email IN ('sujan1nepal@gmail.com', 'sujan01nepal@gmail.com');
DELETE FROM public.profiles WHERE email IN ('sujan1nepal@gmail.com', 'sujan01nepal@gmail.com');

-- Create admin user with the requested email
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    role
) VALUES (
    gen_random_uuid(),
    'sujan1nepal@gmail.com',
    crypt('precioussn', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Admin User", "role": "admin"}'::jsonb,
    'authenticated'
);

-- Create admin profile
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role
) 
SELECT 
    id,
    'sujan1nepal@gmail.com',
    'Admin User',
    'admin'::user_role
FROM auth.users 
WHERE email = 'sujan1nepal@gmail.com';

-- Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    grade TEXT,
    date DATE NOT NULL,
    time TIME,
    duration INTEGER DEFAULT 60, -- minutes
    teacher_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create students table (for detailed student info)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id TEXT UNIQUE, -- custom student ID
    grade TEXT NOT NULL,
    section TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    address TEXT,
    date_of_birth DATE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    marked_by UUID REFERENCES public.profiles(id),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(lesson_id, student_id)
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    lesson_id UUID REFERENCES public.lessons(id),
    due_date DATE,
    max_points INTEGER DEFAULT 100,
    instructions TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    content TEXT,
    file_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
    points_earned INTEGER,
    feedback TEXT,
    graded_by UUID REFERENCES public.profiles(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(assignment_id, student_id)
);

-- Create tests table
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    grade TEXT,
    total_marks INTEGER NOT NULL DEFAULT 100,
    duration INTEGER, -- minutes
    test_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create test results table
CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained INTEGER NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN (SELECT total_marks FROM public.tests WHERE id = test_id) > 0 
            THEN (marks_obtained::DECIMAL / (SELECT total_marks FROM public.tests WHERE id = test_id)) * 100
            ELSE 0
        END
    ) STORED,
    grade_letter TEXT,
    remarks TEXT,
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(test_id, student_id)
);

-- Create messages table for communication
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id),
    recipient_id UUID REFERENCES public.profiles(id),
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    parent_message_id UUID REFERENCES public.messages(id) -- for threading
);

-- Enable RLS on all tables
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lessons
CREATE POLICY "Teachers and admins can manage lessons" ON public.lessons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'co_teacher')
        )
    );

CREATE POLICY "Students can view lessons" ON public.lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'student'
        )
    );

-- RLS Policies for students
CREATE POLICY "Admins and teachers can manage students" ON public.students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'co_teacher')
        )
    );

CREATE POLICY "Students can view own record" ON public.students
    FOR SELECT USING (profile_id = auth.uid());

-- RLS Policies for attendance
CREATE POLICY "Teachers can manage attendance" ON public.attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'co_teacher')
        )
    );

CREATE POLICY "Students can view own attendance" ON public.attendance
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM public.students WHERE profile_id = auth.uid()
        )
    );

-- RLS Policies for assignments
CREATE POLICY "Teachers can manage assignments" ON public.assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'co_teacher')
        )
    );

CREATE POLICY "Students can view assignments" ON public.assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'student'
        )
    );

-- RLS Policies for submissions
CREATE POLICY "Teachers can view all submissions" ON public.submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'co_teacher')
        )
    );

CREATE POLICY "Students can manage own submissions" ON public.submissions
    FOR ALL USING (
        student_id IN (
            SELECT id FROM public.students WHERE profile_id = auth.uid()
        )
    );

-- RLS Policies for tests
CREATE POLICY "Teachers can manage tests" ON public.tests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'co_teacher')
        )
    );

CREATE POLICY "Students can view published tests" ON public.tests
    FOR SELECT USING (
        status = 'published' AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'student'
        )
    );

-- RLS Policies for test results
CREATE POLICY "Teachers can manage test results" ON public.test_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'co_teacher')
        )
    );

CREATE POLICY "Students can view own test results" ON public.test_results
    FOR SELECT USING (
        student_id IN (
            SELECT id FROM public.students WHERE profile_id = auth.uid()
        )
    );

-- RLS Policies for messages
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (
        sender_id = auth.uid() OR recipient_id = auth.uid()
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own sent messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Add missing RLS policy for profiles insert
CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_id ON public.lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON public.lessons(date);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON public.students(grade);
CREATE INDEX IF NOT EXISTS idx_attendance_lesson_id ON public.attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON public.assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON public.test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_student_id ON public.test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
