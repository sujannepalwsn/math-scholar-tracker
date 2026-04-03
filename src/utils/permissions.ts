import { UserRole } from "@/types/roles";
/**
 * SECURITY WARNING: This utility is for FRONTEND UI/UX purposes only.
 * It determines whether to hide or show buttons, menu items, or views based on
 * metadata stored in local storage. This metadata is NOT a secure source of truth.
 * TRUE authorization is enforced solely by Supabase Row Level Security (RLS) on the backend.
 *
 * PERMISSION_MAPPING aligns navigation/feature names or routes with database column names.
 * The keys are the 'featureName' or 'route' used in navigation items or UI checks.
 * The values are the corresponding column names in 'center_feature_permissions' and 'teacher_feature_permissions'.
 */
export const PERMISSION_MAPPING: Record<string, string> = {
  // Navigation / UI Key -> Database Column Name
  'dashboard': 'dashboard_access',
  'dashboard_access': 'dashboard_access',
  'register_student': 'register_student',
  'students_registration': 'register_student',
  'student_report': 'student_report',
  'student_report_access': 'student_report',
  'homework_management': 'homework_management',
  'homework': 'homework_management',
  'lesson_plans': 'lesson_plans',
  'lesson_plan_management': 'lesson_plans',
  'lesson_tracking': 'lesson_tracking',
  'take_attendance': 'take_attendance',
  'attendance': 'take_attendance',
  'teacher_management': 'teacher_management',
  'teachers': 'teacher_management',
  'teachers_registration': 'teacher_management',
  'teachers_attendance': 'teachers_attendance',
  'discipline_issues': 'discipline_issues',
  'discipline': 'discipline_issues',
  'preschool_activities': 'preschool_activities',
  'activities': 'preschool_activities',
  'exams_results': 'exams_results',
  'exams': 'exams_results',
  'published_results': 'published_results',
  'view_records': 'view_records',
  'records': 'view_records',
  'finance': 'finance',
  'messaging': 'messaging',
  'messages': 'messaging',
  'meetings_management': 'meetings_management',
  'meetings': 'meetings_management',
  'calendar_events': 'calendar_events',
  'calendar': 'calendar_events',
  'attendance_summary': 'attendance_summary',
  'attendance-summary': 'attendance_summary',
  'summary': 'summary',
  'teacher_reports': 'teacher_reports',
  'teacher-performance': 'teacher_reports',
  'teacher_performance': 'teacher_reports',
  'chapter_performance': 'chapter_performance',
  'chapter-performance-overview': 'chapter_performance',
  'leave_management': 'leave_management',
  'hr_management': 'hr_management',
  'student_id_cards': 'student_id_cards',
  'student-id-cards': 'student_id_cards',
  'inventory_assets': 'inventory_assets',
  'inventory': 'inventory_assets',
  'transport_tracking': 'transport_tracking',
  'transport': 'transport_tracking',
  'settings_access': 'settings_access',
  'settings': 'settings_access',
  'about_institution': 'about_institution',
  'about-institution': 'about_institution',
  'class_routine': 'class_routine',
  'parent_portal': 'parent_portal',

  // Route Fallbacks (to handle items with null feature_name in DB)
  '/register': 'register_student',
  '/teachers': 'teacher_management',
  '/teacher-attendance': 'teachers_attendance',
  '/hr-management': 'hr_management',
  '/leave-management': 'leave_management',
  '/teacher/leave': 'leave_management',
  '/parent-leave': 'leave_management',
  'leave-applications': 'leave_management',
  'leave-management': 'leave_management',
  'leaves': 'leave_management',
  '/student-id-cards': 'student_id_cards',
  '/inventory': 'inventory_assets',
  '/transport': 'transport_tracking',
  '/settings': 'settings_access',
  '/finance': 'finance',
  '/about-institution': 'about_institution',
  '/teacher/about-institution': 'about_institution',
  '/exams': 'exams_results',
  '/teacher/exams': 'exams_results',
  '/published-results': 'published_results',
  '/teacher/published-results': 'published_results',
  '/student-report': 'student_report',
  '/teacher/student-report': 'student_report',
  '/teacher/take-attendance': 'take_attendance',
  '/teacher/attendance-summary': 'attendance_summary',
  '/teacher/lesson-plans': 'lesson_plans',
  '/teacher/lesson-tracking': 'lesson_tracking',
  '/teacher/homework-management': 'homework_management',
  '/teacher/activities': 'preschool_activities',
  '/teacher/preschool-activities': 'preschool_activities',
  '/teacher/discipline-issues': 'discipline_issues',
  '/teacher/test-management': 'test_management',
  '/teacher/chapter-performance': 'chapter_performance',
  '/teacher/view-records': 'view_records',
  '/teacher/summary': 'summary',
  '/teacher/finance': 'finance',
  '/teacher/my-attendance': 'teachers_attendance',
  '/teacher-meetings': 'meetings_management',
  '/teacher-messages': 'messaging',
  '/teacher/class-routine': 'class_routine',
  '/teacher/calendar': 'calendar_events',
  '/teacher/settings': 'settings_access',
  '/teacher-dashboard': 'dashboard_access',
  '/teacher-performance': 'teacher_reports',
  '/chapter-performance-overview': 'chapter_performance',
};

/**
 * Checks if a user has permission for a specific feature.
 * A module is accessible only if it's enabled and the user can view it.
 */
export const hasPermission = (user: any, featureKey: string, route?: string): boolean => {
  if (!user) return false;

  // Super Admin bypass
  if (user.role === UserRole.ADMIN && !user.center_id) return true;

  // 1. Normalize the feature key
  let dbColumnName = PERMISSION_MAPPING[featureKey] || featureKey;

  // 2. If it's still not a known column, and we have a route, try route mapping
  if (route && (!dbColumnName || !PERMISSION_MAPPING[dbColumnName])) {
    dbColumnName = PERMISSION_MAPPING[route] || dbColumnName;
  }

  // Get permissions from user object
  const centerPerms = user.centerPermissions || {};
  const teacherPerms = user.teacherPermissions || {};

  // 3. Check Global Center Override (Absolute Master Toggle)
  // If explicitly set to false, NO ONE in the center has access.
  if (centerPerms[dbColumnName] === false) {
    return false;
  }

  // Special Check: If parent portal is disabled globally, parents lose all access
  if (user.role === UserRole.PARENT && centerPerms['parent_portal'] === false) {
    return false;
  }

  // 4. Special case for Dashboard - usually always allowed if not explicitly disabled
  if (dbColumnName === 'dashboard_access') {
    return centerPerms['dashboard_access'] !== false;
  }

  // 5. Role-based logic
  if (user.role === UserRole.CENTER || user.role === UserRole.ADMIN) {
    // Center Admin has access to everything unless globally disabled at center level
    return true;
  }

  if (user.role === UserRole.TEACHER) {
    const isFullScope = user.teacher_scope_mode === 'full';

    // FULL SCOPE MODE: Equivalent to Center Admin
    if (isFullScope) {
      return true;
    }

    // RESTRICTED SCOPE MODE: Apply strict restrictions
    // Ensure '/teacher/leave' is ALWAYS accessible if leave_management is enabled globally.
    if (route === '/teacher/leave' || featureKey === 'leave_management') {
      return centerPerms['leave_management'] !== false;
    }

    // 1. Specific route-based blocks for restricted mode
    if (dbColumnName === 'lesson_plans' && (featureKey === 'lesson_plan_management' || route === '/lesson-plan-management')) {
      return false;
    }
    if (dbColumnName === 'settings_access' && route === '/settings') {
      return false;
    }
    if (dbColumnName === 'leave_management' && route === '/leave-management') {
      return false;
    }

    // 3. Check granular JSONB permissions
    if (teacherPerms.permissions && teacherPerms.permissions[dbColumnName]) {
      const modulePerms = teacherPerms.permissions[dbColumnName];
      return modulePerms.enabled === true && modulePerms.can_view === true;
    }

    // 4. Fallback to legacy boolean columns
    if (teacherPerms[dbColumnName] === true) return true;
    if (teacherPerms[dbColumnName] === false) return false;

    // 5. Default for restricted: allow non-admin modules if globally enabled
    return true;
  }

  // Parents follow center global override
  if (user.role === UserRole.PARENT) {
    const allowedParent = [
      'leave_management',
      'messaging',
      'dashboard_access',
      'homework_management',
      'exams_results',
      'discipline_issues',
      'preschool_activities',
      'lesson_tracking',
      'settings_access',
      'meetings_management',
      'student_report',
      'calendar_events',
      'finance',
      'chapter_performance',
      'about_institution'
    ];
    if (allowedParent.includes(dbColumnName)) {
      return true;
    }
    return false; // Fail-closed for parents
  }

  return false; // Fail-closed by default for any unhandled roles or scenarios
};

/**
 * Checks if a teacher has granular permission for a specific action within a module.
 * Actions: 'view', 'edit', 'approve', 'publish'
 */
export const hasActionPermission = (user: any, featureKey: string, action: 'view' | 'edit' | 'approve' | 'publish'): boolean => {
  if (!user) return false;

  if (action === 'view') return hasPermission(user, featureKey);

  // Super Admin/Center Admin bypass
  if (user.role === UserRole.ADMIN || user.role === UserRole.CENTER) {
    return hasPermission(user, featureKey);
  }

  // Parents can only 'edit' (create) for specific modules
  if (user.role === UserRole.PARENT) {
    const allowedActions = ['leave_management', 'messaging'];
    const dbColumnName = PERMISSION_MAPPING[featureKey] || featureKey;
    return action === 'edit' && allowedActions.includes(dbColumnName);
  }

  if (user.role !== UserRole.TEACHER) return false;

  const dbColumnName = PERMISSION_MAPPING[featureKey] || featureKey;
  const isFullScope = user.teacher_scope_mode === 'full';
  const teacherPerms = user.teacherPermissions || {};

  // FULL SCOPE MODE: Bypasses action checks
  if (isFullScope) {
    return true;
  }

  // RESTRICTED SCOPE MODE
  if (teacherPerms.permissions && teacherPerms.permissions[dbColumnName]) {
    const modulePerms = teacherPerms.permissions[dbColumnName];

    switch (action) {
      case 'edit':
        if (dbColumnName === 'leave_management' || dbColumnName === 'teachers_attendance') return true;

        const readOnlyInRestricted = ['class_routine', 'published_results'];
        if (readOnlyInRestricted.includes(dbColumnName)) return false;

        return modulePerms.can_edit === true;

      case 'approve':
        if (dbColumnName === 'lesson_plans' || dbColumnName === 'leave_management') return false;
        return modulePerms.can_approve === true;

      case 'publish':
        return modulePerms.can_publish === true;

      default:
        return false;
    }
  }

  // Fallback for missing JSONB keys
  if (action === 'edit') {
    if (dbColumnName === 'leave_management' || dbColumnName === 'teachers_attendance') return true;
    return hasPermission(user, featureKey);
  }

  return false;
};
