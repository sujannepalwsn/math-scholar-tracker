export interface ModuleMapping {
  id: string;
  name: string;
  category: 'Academics' | 'Administration' | 'Reports & Communication';
  tables: string[];
  type: 'read-heavy' | 'write-heavy' | 'balanced';
  resourceIntensity: 'bandwidth-heavy' | 'compute-heavy' | 'storage-heavy' | 'standard';
  avgPayloadSizeKb: number;
  estRowsPerRequest: number;
}

export const MODULE_MAPPINGS: ModuleMapping[] = [
  // Academics
  {
    id: 'dashboard',
    name: 'Dashboard',
    category: 'Academics',
    tables: ['visitors', 'sessions', 'events', 'centers'],
    type: 'read-heavy',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 15,
    estRowsPerRequest: 50
  },
  {
    id: 'class_routine',
    name: 'Class Routine',
    category: 'Academics',
    tables: ['class_periods', 'classes', 'period_schedules'],
    type: 'read-heavy',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 10,
    estRowsPerRequest: 20
  },
  {
    id: 'attendance',
    name: 'Attendance',
    category: 'Academics',
    tables: ['attendance'],
    type: 'write-heavy',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 5,
    estRowsPerRequest: 40
  },
  {
    id: 'lesson_plans',
    name: 'Lesson Plans',
    category: 'Academics',
    tables: ['lesson_plans'],
    type: 'balanced',
    resourceIntensity: 'storage-heavy',
    avgPayloadSizeKb: 25,
    estRowsPerRequest: 5
  },
  {
    id: 'lesson_tracking',
    name: 'Lesson Tracking',
    category: 'Academics',
    tables: ['lesson_plans', 'student_chapters'],
    type: 'balanced',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 15,
    estRowsPerRequest: 15
  },
  {
    id: 'homework',
    name: 'Homework',
    category: 'Academics',
    tables: ['homework', 'student_homework_records'],
    type: 'balanced',
    resourceIntensity: 'storage-heavy',
    avgPayloadSizeKb: 20,
    estRowsPerRequest: 10
  },
  {
    id: 'tests',
    name: 'Tests',
    category: 'Academics',
    tables: ['tests', 'test_results', 'test_marks'],
    type: 'balanced',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 12,
    estRowsPerRequest: 30
  },
  {
    id: 'exams',
    name: 'Exams & Results',
    category: 'Academics',
    tables: ['exams', 'exam_results', 'exam_marks', 'exam_subjects'],
    type: 'read-heavy',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 30,
    estRowsPerRequest: 100
  },
  {
    id: 'published_results',
    name: 'Published Results',
    category: 'Academics',
    tables: ['exam_results', 'exams'],
    type: 'read-heavy',
    resourceIntensity: 'bandwidth-heavy',
    avgPayloadSizeKb: 40,
    estRowsPerRequest: 50
  },
  {
    id: 'activities',
    name: 'Activities',
    category: 'Academics',
    tables: ['preschool_activities', 'activities', 'student_activities'],
    type: 'balanced',
    resourceIntensity: 'storage-heavy',
    avgPayloadSizeKb: 40,
    estRowsPerRequest: 15
  },
  {
    id: 'discipline',
    name: 'Discipline',
    category: 'Academics',
    tables: ['discipline_issues', 'discipline_categories'],
    type: 'balanced',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 8,
    estRowsPerRequest: 5
  },

  // Administration
  {
    id: 'student_registration',
    name: 'Student Registration',
    category: 'Administration',
    tables: ['students', 'users', 'parents', 'student_parents'],
    type: 'write-heavy',
    resourceIntensity: 'storage-heavy',
    avgPayloadSizeKb: 15,
    estRowsPerRequest: 10
  },
  {
    id: 'teacher_registration',
    name: 'Teacher Registration',
    category: 'Administration',
    tables: ['teachers', 'users', 'teacher_feature_permissions'],
    type: 'write-heavy',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 10,
    estRowsPerRequest: 5
  },
  {
    id: 'teacher_attendance',
    name: 'Teacher Attendance',
    category: 'Administration',
    tables: ['teacher_attendance'],
    type: 'write-heavy',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 4,
    estRowsPerRequest: 10
  },
  {
    id: 'hr_management',
    name: 'HR Management',
    category: 'Administration',
    tables: ['staff_contracts', 'staff_documents', 'payroll_logs'],
    type: 'balanced',
    resourceIntensity: 'storage-heavy',
    avgPayloadSizeKb: 50,
    estRowsPerRequest: 10
  },
  {
    id: 'leave_management',
    name: 'Leave Management',
    category: 'Administration',
    tables: ['leave_applications', 'leave_categories'],
    type: 'balanced',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 8,
    estRowsPerRequest: 5
  },
  {
    id: 'id_cards',
    name: 'ID Cards',
    category: 'Administration',
    tables: ['id_card_designs', 'students'],
    type: 'read-heavy',
    resourceIntensity: 'bandwidth-heavy',
    avgPayloadSizeKb: 200,
    estRowsPerRequest: 1
  },
  {
    id: 'inventory',
    name: 'Inventory & Assets',
    category: 'Administration',
    tables: ['assets', 'consumables', 'consumable_logs'],
    type: 'balanced',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 12,
    estRowsPerRequest: 20
  },
  {
    id: 'transport',
    name: 'Transport & Tracking',
    category: 'Administration',
    tables: ['vehicles', 'bus_routes', 'transport_assignments'],
    type: 'read-heavy',
    resourceIntensity: 'bandwidth-heavy',
    avgPayloadSizeKb: 15,
    estRowsPerRequest: 50
  },
  {
    id: 'finance',
    name: 'Finance',
    category: 'Administration',
    tables: ['invoices', 'invoice_items', 'payments', 'payment_transactions', 'fee_structures', 'fee_headings'],
    type: 'balanced',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 20,
    estRowsPerRequest: 40
  },
  {
    id: 'school_days',
    name: 'School Days',
    category: 'Administration',
    tables: ['calendar_events'],
    type: 'read-heavy',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 5,
    estRowsPerRequest: 30
  },
  {
    id: 'settings',
    name: 'Settings',
    category: 'Administration',
    tables: ['centers', 'center_feature_permissions', 'login_page_settings'],
    type: 'balanced',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 10,
    estRowsPerRequest: 10
  },

  // Reports & Communication
  {
    id: 'records',
    name: 'Records',
    category: 'Reports & Communication',
    tables: ['audit_logs', 'activity_logs'],
    type: 'read-heavy',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 150,
    estRowsPerRequest: 100
  },
  {
    id: 'messages',
    name: 'Messages',
    category: 'Reports & Communication',
    tables: ['messages', 'message_threads', 'message_participants', 'broadcast_messages', 'chat_messages'],
    type: 'write-heavy',
    resourceIntensity: 'bandwidth-heavy',
    avgPayloadSizeKb: 5,
    estRowsPerRequest: 20
  },
  {
    id: 'meetings',
    name: 'Meetings',
    category: 'Reports & Communication',
    tables: ['meetings', 'meeting_attendees', 'meeting_conclusions'],
    type: 'balanced',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 12,
    estRowsPerRequest: 15
  },
  {
    id: 'calendar_events',
    name: 'Calendar & Events',
    category: 'Reports & Communication',
    tables: ['calendar_events', 'center_events'],
    type: 'read-heavy',
    resourceIntensity: 'standard',
    avgPayloadSizeKb: 10,
    estRowsPerRequest: 20
  },
  {
    id: 'student_reports',
    name: 'Student Reports',
    category: 'Reports & Communication',
    tables: ['exam_results', 'attendance', 'academic_performance_history'],
    type: 'read-heavy',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 100,
    estRowsPerRequest: 500
  },
  {
    id: 'attendance_summary',
    name: 'Attendance Summary',
    category: 'Reports & Communication',
    tables: ['attendance'],
    type: 'read-heavy',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 30,
    estRowsPerRequest: 200
  },
  {
    id: 'summary_dashboard',
    name: 'Summary Dashboard',
    category: 'Reports & Communication',
    tables: ['visitors', 'sessions', 'events', 'center_usage_stats'],
    type: 'read-heavy',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 20,
    estRowsPerRequest: 100
  },
  {
    id: 'teacher_reports',
    name: 'Teacher Reports',
    category: 'Reports & Communication',
    tables: ['teachers', 'performance_evaluations', 'attendance'],
    type: 'read-heavy',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 40,
    estRowsPerRequest: 50
  },
  {
    id: 'chapter_performance',
    name: 'Chapter Performance',
    category: 'Reports & Communication',
    tables: ['student_chapters', 'chapters', 'test_results'],
    type: 'read-heavy',
    resourceIntensity: 'compute-heavy',
    avgPayloadSizeKb: 50,
    estRowsPerRequest: 100
  }
];
