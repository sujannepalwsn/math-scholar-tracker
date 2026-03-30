-- Migration: 20260525000000_add_error_tracking_system.sql
-- Description: Build a centralized error tracking and observability system

-- Create error_logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    error_type TEXT NOT NULL, -- 'runtime' | 'api' | 'database' | 'ui'
    message TEXT NOT NULL,
    stack TEXT,
    status_code INTEGER,
    endpoint TEXT,
    module TEXT,
    component TEXT,
    action TEXT,
    user_context JSONB NOT NULL DEFAULT '{}'::jsonb, -- {id, name, role, centerId}
    request_context JSONB DEFAULT '{}'::jsonb, -- {body, query}
    schema_context TEXT, -- Relevant tables for AI debugging
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
    device_info JSONB DEFAULT '{}'::jsonb, -- {type, os, browser, user_agent}
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for dashboard filters
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_module ON public.error_logs (module);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_role ON public.error_logs ((user_context->>'role'));
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs (severity);

-- RLS: Only admins can view logs. Everyone can insert logs (anonymously or authenticated)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view error logs"
ON public.error_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.role = 'center')
    )
);

CREATE POLICY "Anyone can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Cleanup function to maintain 5000 logs
CREATE OR REPLACE FUNCTION public.cleanup_old_error_logs()
RETURNS trigger AS $$
BEGIN
    DELETE FROM public.error_logs
    WHERE id IN (
        SELECT id FROM public.error_logs
        ORDER BY timestamp DESC
        OFFSET 5000
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_error_logs
AFTER INSERT ON public.error_logs
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_error_logs();
