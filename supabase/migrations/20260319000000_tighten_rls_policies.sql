-- Migration to fix permissive RLS policies and ensure strict center_id isolation
-- Requirement 1: Multi-Tenant Data Security

-- Tighten class_substitutions policy
DROP POLICY IF EXISTS "Service role full access on class_substitutions" ON public.class_substitutions;
DROP POLICY IF EXISTS "Users can view substitutions of their center" ON public.class_substitutions;
DROP POLICY IF EXISTS "Center admins can manage substitutions" ON public.class_substitutions;
DROP POLICY IF EXISTS "Teachers can view substitutions assigned to them" ON public.class_substitutions;

CREATE POLICY "Center Isolation Policy" ON public.class_substitutions
USING (center_id = public.get_auth_center_id());

-- Tighten leave_categories policy (already has some isolation but let's make it consistent)
DROP POLICY IF EXISTS "Users can view leave categories" ON public.leave_categories;
DROP POLICY IF EXISTS "Center admins can manage leave categories" ON public.leave_categories;

CREATE POLICY "Center Isolation Policy for view" ON public.leave_categories
FOR SELECT USING (center_id IS NULL OR center_id = public.get_auth_center_id());

CREATE POLICY "Center Isolation Policy for manage" ON public.leave_categories
FOR ALL USING (center_id = public.get_auth_center_id());

-- Ensure notifications policy is strict
DROP POLICY IF EXISTS "Allow any user to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Center users can insert notifications" ON public.notifications;

CREATE POLICY "Center Isolation Policy" ON public.notifications
USING (center_id = public.get_auth_center_id());

-- Fix RLS for leave_applications to use the consistent helper
DROP POLICY IF EXISTS "Users can view their own leave applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Users can submit leave applications" ON public.leave_applications;
DROP POLICY IF EXISTS "Center admins can update leave applications" ON public.leave_applications;

CREATE POLICY "Center Isolation Policy" ON public.leave_applications
USING (center_id = public.get_auth_center_id());
