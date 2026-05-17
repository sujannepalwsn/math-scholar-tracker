-- Migration: Add system_notifications table for global popups
BEGIN;

CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    link TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- All authenticated users can read active system notifications
CREATE POLICY "Users can view active system notifications"
ON public.system_notifications
FOR SELECT
TO authenticated
USING (expiry_date > now());

-- Super Admin (role='admin' AND center_id IS NULL) can manage everything
CREATE POLICY "Super Admin manage system notifications"
ON public.system_notifications
FOR ALL
TO authenticated
USING (public.get_user_role() = 'admin' AND public.get_user_center_id() IS NULL);

COMMIT;
