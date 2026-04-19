-- Migration: Create get_user_profile_with_permissions RPC function (Optimized)
CREATE OR REPLACE FUNCTION public.get_user_profile_with_permissions(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'user', json_build_object(
      'id', u.id,
      'username', u.username,
      'role', u.role,
      'center_id', u.center_id,
      'teacher_id', u.teacher_id,
      'student_id', u.student_id
    ),
    'center', json_build_object(
      'name', c.name
    ),
    'centerPermissions', json_build_object(
      'id', cfp.id,
      'center_id', cfp.center_id,
      'academics', cfp.academics,
      'finance', cfp.finance,
      'attendance', cfp.attendance,
      'messaging', cfp.messaging,
      'exams', cfp.exams,
      'students', cfp.students,
      'teachers', cfp.teachers,
      'ai_insights', cfp.ai_insights,
      'attendance_summary', cfp.attendance_summary,
      'calendar_events', cfp.calendar_events,
      'class_routine', cfp.class_routine,
      'discipline_issues', cfp.discipline_issues,
      'homework_management', cfp.homework_management,
      'lesson_plans', cfp.lesson_plans,
      'lesson_tracking', cfp.lesson_tracking,
      'meetings_management', cfp.meetings_management,
      'parent_portal', cfp.parent_portal,
      'preschool_activities', cfp.preschool_activities,
      'register_student', cfp.register_student,
      'student_report', cfp.student_report,
      'summary', cfp.summary,
      'take_attendance', cfp.take_attendance,
      'teacher_management', cfp.teacher_management,
      'test_management', cfp.test_management,
      'view_records', cfp.view_records
    ),
    'teacherPermissions', json_build_object(
      'id', tfp.id,
      'teacher_id', tfp.teacher_id,
      'student_report_access', tfp.student_report_access,
      'activities', tfp.activities,
      'attendance_edit', tfp.attendance_edit,
      'teacher_scope_mode', tfp.teacher_scope_mode,
      'ai_insights', tfp.ai_insights,
      'attendance_summary', tfp.attendance_summary,
      'calendar_events', tfp.calendar_events,
      'chapter_performance', tfp.chapter_performance,
      'class_routine', tfp.class_routine,
      'discipline_issues', tfp.discipline_issues,
      'finance', tfp.finance,
      'homework_management', tfp.homework_management,
      'lesson_plans', tfp.lesson_plans,
      'lesson_tracking', tfp.lesson_tracking,
      'meetings_management', tfp.meetings_management,
      'messaging', tfp.messaging,
      'parent_portal', tfp.parent_portal,
      'preschool_activities', tfp.preschool_activities,
      'summary', tfp.summary,
      'take_attendance', tfp.take_attendance,
      'test_management', tfp.test_management,
      'view_records', tfp.view_records
    ),
    'linkedStudents', (
      SELECT json_agg(json_build_object(
        'id', s.id,
        'name', s.name,
        'grade', s.grade
      ))
      FROM public.parent_students ps
      JOIN public.students s ON ps.student_id = s.id
      WHERE ps.parent_user_id = u.id
    )
  ) INTO v_result
  FROM public.users u
  LEFT JOIN public.centers c ON u.center_id = c.id
  LEFT JOIN public.center_feature_permissions cfp ON c.id = cfp.center_id
  LEFT JOIN public.teacher_feature_permissions tfp ON u.teacher_id = tfp.teacher_id
  WHERE u.id = p_user_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.get_user_profile_with_permissions(UUID) TO authenticated;
