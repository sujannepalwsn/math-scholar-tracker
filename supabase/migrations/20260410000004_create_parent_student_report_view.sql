-- Migration: Create parent-specific VIEW
DROP VIEW IF EXISTS public.student_report_summary_parent_view CASCADE;
CREATE VIEW public.student_report_summary_parent_view AS
SELECT
  s.id, s.name, s.grade, s.roll_number,
  COUNT(DISTINCT a.id) as total_attendance_days,
  COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as present_days,
  ROUND(COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END)::numeric / NULLIF(COUNT(DISTINCT a.id), 0) * 100, 1) as attendance_percentage,
  ROUND(AVG(CASE WHEN tr.marks_obtained IS NOT NULL THEN (tr.marks_obtained::numeric / NULLIF(t.total_marks, 0) * 100) END)::numeric, 1) as avg_percentage,
  COUNT(DISTINCT CASE WHEN tr.marks_obtained IS NOT NULL THEN tr.id END) as total_tests_taken,
  MAX(a.date) as last_attendance_date,
  MAX(tr.date_taken) as last_marks_date
FROM students s
LEFT JOIN attendance a ON s.id = a.student_id AND a.date > (CURRENT_DATE - INTERVAL '30 days')
LEFT JOIN test_results tr ON s.id = tr.student_id AND tr.date_taken::date > (CURRENT_DATE - INTERVAL '30 days')
LEFT JOIN tests t ON tr.test_id = t.id
GROUP BY s.id, s.name, s.grade, s.roll_number;
ALTER VIEW public.student_report_summary_parent_view OWNER TO postgres;
GRANT SELECT ON public.student_report_summary_parent_view TO authenticated;
