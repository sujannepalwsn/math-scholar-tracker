-- Migration: Create student_report_summary VIEW for cost optimization
DROP VIEW IF EXISTS public.student_report_summary CASCADE;
CREATE VIEW public.student_report_summary AS
SELECT
  s.id, s.name, s.grade, s.roll_number,
  COUNT(DISTINCT a.id) as total_attendance_days,
  COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as present_days,
  ROUND(AVG(CASE WHEN tr.marks_obtained IS NOT NULL
    THEN (tr.marks_obtained::numeric / NULLIF(t.total_marks, 0) * 100)
  END)::numeric, 1) as avg_percentage,
  COUNT(DISTINCT d.id) as discipline_count,
  MAX(tr.date_taken) as last_test_date
FROM students s
LEFT JOIN attendance a ON s.id = a.student_id
  AND a.date > (CURRENT_DATE - INTERVAL '30 days')
LEFT JOIN test_results tr ON s.id = tr.student_id
  AND tr.date_taken::date > (CURRENT_DATE - INTERVAL '30 days')
LEFT JOIN tests t ON tr.test_id = t.id
LEFT JOIN discipline_issues d ON s.id = d.student_id
WHERE s.center_id = (SELECT center_id FROM users WHERE id = auth.uid() LIMIT 1)
GROUP BY s.id, s.name, s.grade, s.roll_number;
ALTER VIEW public.student_report_summary OWNER TO postgres;
GRANT SELECT ON public.student_report_summary TO authenticated;
