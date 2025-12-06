-- Create meetings table
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    agenda TEXT,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    meeting_type TEXT NOT NULL CHECK (meeting_type IN ('parents', 'teachers', 'both')),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for meetings table
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can view their own meetings" ON public.meetings
FOR SELECT USING (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Centers can insert their own meetings" ON public.meetings
FOR INSERT WITH CHECK (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Centers can update their own meetings" ON public.meetings
FOR UPDATE USING (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Centers can delete their own meetings" ON public.meetings
FOR DELETE USING (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()));

-- Create meeting_attendees table
CREATE TABLE public.meeting_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- Can be parent or teacher user
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE, -- For parent meetings
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE, -- For teacher meetings
    attendance_status TEXT NOT NULL DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'present', 'absent', 'excused')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one entry per user/student/teacher per meeting
    UNIQUE (meeting_id, user_id),
    UNIQUE (meeting_id, student_id),
    UNIQUE (meeting_id, teacher_id)
);

-- Add RLS for meeting_attendees table
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees can view their own meeting attendance" ON public.meeting_attendees
FOR SELECT USING (
    user_id = auth.uid() OR
    student_id IN (SELECT student_id FROM public.users WHERE id = auth.uid()) OR
    teacher_id IN (SELECT teacher_id FROM public.users WHERE id = auth.uid()) OR
    meeting_id IN (SELECT id FROM public.meetings WHERE center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()))
);

CREATE POLICY "Centers can manage all meeting attendance" ON public.meeting_attendees
FOR ALL USING (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())));

-- Create meeting_conclusions table
CREATE TABLE public.meeting_conclusions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    conclusion_notes TEXT NOT NULL,
    recorded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (meeting_id)
);

-- Add RLS for meeting_conclusions table
ALTER TABLE public.meeting_conclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Centers can view their own meeting conclusions" ON public.meeting_conclusions
FOR SELECT USING (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Centers can insert their own meeting conclusions" ON public.meeting_conclusions
FOR INSERT WITH CHECK (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Centers can update their own meeting conclusions" ON public.meeting_conclusions
FOR UPDATE USING (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())));

CREATE POLICY "Centers can delete their own meeting conclusions" ON public.meeting_conclusions
FOR DELETE USING (meeting_id IN (SELECT id FROM public.meetings WHERE center_id = (SELECT center_id FROM public.users WHERE id = auth.uid())));

-- Update the 'users' table to include 'meetings_management' permission for 'center' role
-- This is handled in the frontend components, but adding a comment here for context.