-- Migration: Add performance indexes on hot columns
CREATE INDEX IF NOT EXISTS idx_students_center_grade ON students(center_id, grade) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_student ON test_results(student_id, date_taken DESC);
CREATE INDEX IF NOT EXISTS idx_teachers_center ON teachers(center_id, is_active);
CREATE INDEX IF NOT EXISTS idx_discipline_issues_student ON discipline_issues(student_id);
