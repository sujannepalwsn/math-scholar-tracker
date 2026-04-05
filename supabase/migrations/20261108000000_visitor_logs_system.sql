-- Migration for Visitor Logs & Analytics System

-- 1. Create visitors table
CREATE TABLE IF NOT EXISTS public.visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_type TEXT NOT NULL CHECK (visitor_type IN ('registered', 'trial', 'general', 'sandbox')),
    user_id UUID REFERENCES public.users(id),
    fingerprint_id TEXT,
    ip_address TEXT,
    location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID NOT NULL REFERENCES public.visitors(id),
    session_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_end TIMESTAMP WITH TIME ZONE,
    duration INTERVAL,
    entry_page TEXT,
    exit_page TEXT
);

-- 3. Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id),
    event_type TEXT NOT NULL, -- page_view, click, feature_action, form_submission, error
    event_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create trial_leads table (Enhanced)
CREATE TABLE IF NOT EXISTS public.trial_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    organization TEXT,
    role TEXT,
    expected_students TEXT,
    location TEXT,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    converted_to_center_id UUID REFERENCES public.centers(id),
    converted_at TIMESTAMP WITH TIME ZONE
);

-- 5. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON public.visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint ON public.visitors(fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON public.sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON public.sessions(session_start);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON public.events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON public.events(timestamp);

-- 6. RLS Policies
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_leads ENABLE ROW LEVEL SECURITY;

-- Admins can read everything
CREATE POLICY admin_read_visitors ON public.visitors FOR SELECT TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY admin_read_sessions ON public.sessions FOR SELECT TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY admin_read_events ON public.events FOR SELECT TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY admin_read_trial_leads ON public.trial_leads FOR SELECT TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Service role / Edge functions can insert everything
-- (Policies for insertion are usually handled via service role key in edge functions,
-- but we can add explicit ones if we were doing client-side inserts.
-- Given the requirement for Edge Functions, we'll assume service role usage.)

-- 7. View for analytics (optional but helpful)
CREATE OR REPLACE VIEW public.visitor_analytics_summary AS
SELECT
    v.visitor_type,
    count(DISTINCT v.id) as total_visitors,
    count(DISTINCT s.id) as total_sessions,
    avg(s.duration) as avg_duration
FROM public.visitors v
LEFT JOIN public.sessions s ON v.id = s.visitor_id
GROUP BY v.visitor_type;
