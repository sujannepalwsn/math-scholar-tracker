-- Migration to add preferences column to users table
-- Date: 2026-03-08
-- Description: Adds a jsonb preferences column to store user-specific theme settings (theme name, dark mode, compact mode).

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{"theme": "Indigo Pro", "darkMode": false, "compactMode": false}'::jsonb;

-- Update existing users to have default preferences if they are null
UPDATE public.users
SET preferences = '{"theme": "Indigo Pro", "darkMode": false, "compactMode": false}'::jsonb
WHERE preferences IS NULL;
