-- Add missing tables for messaging system and class periods

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id),
  parent_user_id uuid NOT NULL REFERENCES public.users(id),
  student_id uuid NOT NULL REFERENCES public.students(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_conversations_pkey PRIMARY KEY (id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.users(id),
  message_text text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);

-- Create class_periods table
CREATE TABLE IF NOT EXISTS public.class_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id),
  period_number integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_periods_pkey PRIMARY KEY (id)
);

-- Create period_schedules table
CREATE TABLE IF NOT EXISTS public.period_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id),
  class_period_id uuid NOT NULL REFERENCES public.class_periods(id) ON DELETE CASCADE,
  grade text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  subject text NOT NULL,
  teacher_id uuid REFERENCES public.teachers(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT period_schedules_pkey PRIMARY KEY (id)
);

-- Update meeting_attendees to add attendance_status field
ALTER TABLE public.meeting_attendees 
ADD COLUMN IF NOT EXISTS attendance_status text DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'present', 'absent', 'excused')),
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id);

-- Enable RLS on new tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_conversations
CREATE POLICY "Service role full access on chat_conversations" ON public.chat_conversations FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for chat_messages  
CREATE POLICY "Service role full access on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for class_periods
CREATE POLICY "Service role full access on class_periods" ON public.class_periods FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for period_schedules
CREATE POLICY "Service role full access on period_schedules" ON public.period_schedules FOR ALL USING (true) WITH CHECK (true);