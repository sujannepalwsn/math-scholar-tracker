-- Add new columns to teacher_feature_permissions to align with center permissions
ALTER TABLE public.teacher_feature_permissions
  ADD COLUMN IF NOT EXISTS leave_management boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_results boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS student_id_cards boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS teacher_performance boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS chapter_performance boolean DEFAULT true;
