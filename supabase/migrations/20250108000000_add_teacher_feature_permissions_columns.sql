-- Add missing columns to teacher_feature_permissions table
ALTER TABLE public.teacher_feature_permissions
  ADD COLUMN IF NOT EXISTS attendance_summary BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS lesson_plans BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS activities BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS chapter_performance BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_insights BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS view_records BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS summary BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS finance BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS messaging BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS class_routine BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS calendar_events BOOLEAN DEFAULT true;

