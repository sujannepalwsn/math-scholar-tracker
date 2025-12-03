-- Create broadcast_messages table
CREATE TABLE public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    target_audience TEXT NOT NULL, -- 'all_parents', 'grade_X', 'all_teachers' etc.
    target_grade TEXT, -- NULL if target_audience is 'all_parents'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for broadcast_messages
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

-- Policy for center users to insert and view their own center's broadcast messages
CREATE POLICY "Center users can manage their broadcast messages" ON public.broadcast_messages
FOR ALL USING (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()));

-- Policy for parents to view broadcast messages targeted at them or their student's grade
CREATE POLICY "Parents can view relevant broadcast messages" ON public.broadcast_messages
FOR SELECT TO authenticated
USING (
    (target_audience = 'all_parents')
    OR
    (target_audience = 'grade_' || (SELECT grade FROM public.students WHERE id = (SELECT student_id FROM public.users WHERE id = auth.uid())))
    OR
    (target_audience = 'student_' || (SELECT student_id FROM public.users WHERE id = auth.uid()))
);

-- Policy for teachers to view broadcast messages targeted at them
CREATE POLICY "Teachers can view relevant broadcast messages" ON public.broadcast_messages
FOR SELECT TO authenticated
USING (
    (target_audience = 'all_teachers')
    OR
    (target_audience = 'teacher_' || (SELECT teacher_id FROM public.users WHERE id = auth.uid()))
);

-- Create invoice_items table (if not already present from previous migrations)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    fee_heading_id UUID REFERENCES public.fee_headings(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    unit_amount NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Policy for center users to manage invoice_items
CREATE POLICY "Center users can manage invoice items" ON public.invoice_items
FOR ALL USING (
    invoice_id IN (SELECT id FROM public.invoices WHERE center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()))
) WITH CHECK (
    invoice_id IN (SELECT id FROM public.invoices WHERE center_id = (SELECT center_id FROM public.users WHERE id = auth.uid()))
);

-- Policy for parents to view their invoice_items
CREATE POLICY "Parents can view their invoice items" ON public.invoice_items
FOR SELECT TO authenticated
USING (
    invoice_id IN (SELECT id FROM public.invoices WHERE student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()))
);