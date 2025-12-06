-- Add logo_url and theme columns to centers table
ALTER TABLE public.centers 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT '{"primary": "#6366f1", "background": "#ffffff", "sidebar": "#1e293b"}'::jsonb,
ADD COLUMN IF NOT EXISTS contact_person text;