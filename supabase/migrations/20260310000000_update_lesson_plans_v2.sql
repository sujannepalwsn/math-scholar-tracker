-- Migration to update lesson_plans table with fields from the new Daily Lesson Plan form
ALTER TABLE lesson_plans
ADD COLUMN IF NOT EXISTS period TEXT,
ADD COLUMN IF NOT EXISTS warm_up_review TEXT,
ADD COLUMN IF NOT EXISTS learning_activities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evaluation_activities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS class_work TEXT,
ADD COLUMN IF NOT EXISTS home_assignment TEXT,
ADD COLUMN IF NOT EXISTS principal_remarks TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE;

-- Ensure status column exists and has appropriate default
-- If it's already there, we might want to ensure it supports our workflow
-- Common statuses: 'draft', 'pending', 'approved', 'rejected'
ALTER TABLE lesson_plans ALTER COLUMN status SET DEFAULT 'draft';
