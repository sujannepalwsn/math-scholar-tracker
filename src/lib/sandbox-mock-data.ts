export const sandboxData = {
  centers: [
    { id: 'demo-center-id', name: 'Demo Academy', logo_url: '', address: 'EduFlow HQ' }
  ],
  users: [
    { id: 'demo-user-id', username: 'demo@eduflow.com', role: 'admin', center_id: 'demo-center-id' }
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
    { id: 's1', name: 'John Doe', grade: '10', center_id: 'demo-center-id', is_active: true },
    { id: 's2', name: 'Jane Smith', grade: '10', center_id: 'demo-center-id', is_active: true }
  ],
  teachers: [
    { id: 't1', name: 'Prof. Xavier', center_id: 'demo-center-id' }
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
  teacher_attendance: [],
  leave_applications: [],
  book_loans: [],
  books: [],
  academic_performance_history: [],
  predictive_scores: [],
  ai_insights: [],
  fee_default_predictions: []
};
