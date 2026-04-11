-- Migration: Create get_user_profile_with_permissions RPC function (Optimized)
CREATE OR REPLACE FUNCTION public.get_user_profile_with_permissions(p_user_id UUID)
RETURNS JSON AS $$
SELECT json_build_object(
  'user_id', u.id,
  'username', u.username,
  'role', u.role,
  'center_id', u.center_id,
  'teacher_id', u.teacher_id,
  'center_name', c.name,
  'center_permissions', json_build_object(
    'id', cfp.id,
    'center_id', cfp.center_id,
    'academics', cfp.academics,
    'finance', cfp.finance,
    'attendance', cfp.attendance,
    'messaging', cfp.messaging,
    'exams', cfp.exams,
    'students', cfp.students,
    'teachers', cfp.teachers
  ),
  'teacher_permissions', json_build_object(
    'id', tfp.id,
    'teacher_id', tfp.teacher_id,
    'student_report_access', tfp.student_report_access,
    'activities', tfp.activities,
    'attendance_edit', tfp.attendance_edit,
    'teacher_scope_mode', tfp.teacher_scope_mode
  )
)
FROM users u
LEFT JOIN centers c ON u.center_id = c.id
LEFT JOIN center_feature_permissions cfp ON c.id = cfp.center_id
LEFT JOIN teacher_feature_permissions tfp ON u.teacher_id = tfp.teacher_id
WHERE u.id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.get_user_profile_with_permissions(UUID) TO authenticated;
