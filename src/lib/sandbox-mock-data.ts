export const sandboxData = {
  centers: [
    { id: 'demo-center-id', name: 'Demo Academy', logo_url: '', address: 'EduFlow HQ' }
  ],
  users: [
    { id: 'demo-user-id', username: 'demo@eduflow.com', role: 'admin', center_id: null, is_active: true, first_name: 'Super', last_name: 'Admin' },
    { id: 'center-user-id', username: 'center@demo.com', role: 'center', center_id: 'demo-center-id', is_active: true, first_name: 'Center', last_name: 'Admin' },
    { id: 'teacher-demo-id', username: 'teacher@demo.com', role: 'teacher', center_id: 'demo-center-id', teacher_id: 't1', is_active: true, first_name: 'Teacher', last_name: 'User', teacher_scope_mode: 'restricted' },
    { id: 'teacher-full-id', username: 'full@demo.com', role: 'teacher', center_id: 'demo-center-id', teacher_id: 't2', is_active: true, first_name: 'Full', last_name: 'Teacher', teacher_scope_mode: 'full' },
    { id: 'parent-demo-id', username: 'parent@demo.com', role: 'parent', center_id: 'demo-center-id', student_id: 's1', linked_students: [{ id: 's1', name: 'John Doe', grade: '10' }, { id: 's2', name: 'Jane Smith', grade: '10' }] }
  ],
  center_feature_permissions: [
    {
      center_id: 'demo-center-id',
      academic: true,
      attendance: true,
      finance: true,
      communication: true,
      inventory: true,
      hr: true,
      lesson_plans: true,
      lesson_tracking: true,
      test_management: true,
      exams_results: true,
      take_attendance: true,
      attendance_summary: true,
      teachers_attendance: true,
      messaging: true,
      meetings_management: true,
      calendar_events: true,
      inventory_assets: true,
      hr_management: true,
      leave_management: true
    }
  ],
  students: [
    { id: 's1', name: 'John Doe', grade: '10', center_id: 'demo-center-id', is_active: true, gender: 'male', photo_url: 'https://broken-link.com/photo1.jpg' },
    { id: 's2', name: 'Jane Smith', grade: '10', center_id: 'demo-center-id', is_active: true, gender: 'female', photo_url: 'https://broken-link.com/photo2.jpg' }
  ],
  teachers: [
    { id: 't1', name: 'Prof. Xavier', center_id: 'demo-center-id' },
    { id: 't2', name: 'Magneto', center_id: 'demo-center-id' }
  ],
  notifications: [
    { id: 'n1', title: 'Welcome to EduFlow', message: 'Explore your new dashboard!', type: 'info', created_at: new Date().toISOString(), is_read: false, center_id: 'demo-center-id', user_id: 'demo-user-id' },
    { id: 'n2', title: 'New Attendance Record', message: 'Attendance for Grade 10 has been marked.', type: 'attendance', created_at: new Date().toISOString(), is_read: true, center_id: 'demo-center-id', user_id: 'demo-user-id' }
  ],
  nav_categories: [
    { id: 'cat1', name: 'Academics', order: 0, center_id: 'demo-center-id' },
    { id: 'cat2', name: 'Administration', order: 1, center_id: 'demo-center-id' },
    { id: 'cat3', name: 'Reports and Communication', order: 2, center_id: 'demo-center-id' }
  ],
  nav_items: [
    { id: 'ni1', name: 'Dashboard', route: '/center-dashboard', icon: 'Home', role: 'center', category_id: 'cat1', order: 0, is_active: true, center_id: 'demo-center-id', feature_name: 'dashboard_access' },
    { id: 'ni2', name: 'Students', route: '/students', icon: 'Users', role: 'center', category_id: 'cat1', order: 1, is_active: true, center_id: 'demo-center-id', feature_name: 'register_student' },
    { id: 'ni3', name: 'Dashboard', route: '/teacher-dashboard', icon: 'Home', role: 'teacher', category_id: 'cat1', order: 0, is_active: true, center_id: 'demo-center-id', feature_name: 'dashboard_access' },
    { id: 'ni4', name: 'Dashboard', route: '/parent-dashboard', icon: 'Home', role: 'parent', category_id: 'cat1', order: 0, is_active: true, center_id: 'demo-center-id', feature_name: 'dashboard_access' },
    { id: 'ni5', name: 'Messages', route: '/messages', icon: 'MessageSquare', role: 'parent', category_id: 'cat3', order: 1, is_active: true, center_id: 'demo-center-id', feature_name: 'messaging' }
  ],
  notices: [],
  activities: [],
  invoices: [],
  class_substitutions: [],
  period_schedules: [],
  student_homework_records: [],
  attendance: [
    { student_id: 's1', center_id: 'demo-center-id', date: new Date().toISOString().split('T')[0], status: 'present', is_locked: true },
  ],
  teacher_feature_permissions: [
    {
      teacher_id: 't1',
      teacher_scope_mode: 'restricted',
      permissions: {
        take_attendance: { enabled: true, can_view: true, can_edit: true },
        class_routine: { enabled: true, can_view: true, can_edit: false },
        finance: { enabled: false, can_view: false, can_edit: false },
        messaging: { enabled: false, can_view: false, can_edit: false },
        leave_management: { enabled: true, can_view: true, can_edit: false },
        teacher_management: { enabled: false, can_view: false, can_edit: false },
        teachers_attendance: { enabled: false, can_view: false, can_edit: false },
        student_id_cards: { enabled: false, can_view: false, can_edit: false },
        inventory_assets: { enabled: false, can_view: false, can_edit: false },
        attendance_summary: { enabled: false, can_view: false, can_edit: false },
        about_institution: { enabled: false, can_view: false, can_edit: false }
      },
      take_attendance: true,
      class_routine: true,
      finance: false,
      messaging: false,
      leave_management: true,
      teacher_management: false,
      teachers_attendance: false,
      student_id_cards: false,
      inventory_assets: false,
      attendance_summary: false,
      about_institution: false
    },
    {
      teacher_id: 't2',
      teacher_scope_mode: 'full',
      permissions: {}, // Inherits center perms
    }
  ],
  class_teacher_assignments: [
    { teacher_id: 't1', grade: '10', center_id: 'demo-center-id' }
  ],
  teacher_attendance: [],
  leave_applications: [],
  book_loans: [],
  books: [],
  academic_performance_history: [],
  predictive_scores: [],
  ai_insights: [],
  fee_default_predictions: [],
  login_page_settings: [
    { page_type: 'admin', title: 'Admin Login', primary_color: '#4f46e5', background_color: '#020617' },
    { page_type: 'center', title: 'Center Login', primary_color: '#4f46e5', background_color: '#020617' },
    { page_type: 'parent', title: 'Parent Login', primary_color: '#4f46e5', background_color: '#020617' },
    { page_type: 'teacher', title: 'Teacher Login', primary_color: '#4f46e5', background_color: '#020617' }
  ]
};
