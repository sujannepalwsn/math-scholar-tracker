export const sandboxData = {
  centers: [
    { id: 'demo-center-id', name: 'Demo Academy', logo_url: '', address: 'EduFlow HQ' }
  ],
  users: [
    { id: 'demo-user-id', username: 'demo@eduflow.com', role: 'center', center_id: 'demo-center-id' }
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
