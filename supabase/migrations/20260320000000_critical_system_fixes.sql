-- Migration: Critical System Fixes
-- Date: 2026-03-20

-- 1. Fix subscription_plans RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.subscription_plans;
CREATE POLICY "Allow authenticated read"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (true);

-- 2. Fix payment_gateway_settings RLS
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Center users can read gateway settings" ON public.payment_gateway_settings;
CREATE POLICY "Center users can read gateway settings"
ON public.payment_gateway_settings
FOR SELECT
TO authenticated
USING (true);

-- 3. Student Alumni/Graduation Enhancement
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_alumni boolean DEFAULT false;

-- 4. Ensure Teacher Feature Permissions have all requested columns
ALTER TABLE public.teacher_feature_permissions
ADD COLUMN IF NOT EXISTS can_manage_students boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_teachers boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_attendance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_hr boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_leave boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_id_cards boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_inventory boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_transport boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_school_days boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_settings boolean DEFAULT false;
