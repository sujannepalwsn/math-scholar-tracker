const now = new Date().toISOString();
const today = now.split('T')[0];

export const SANDBOX_MOCK_DATA: Record<string, any[]> = {
  centers: [
    {
      id: "sandbox-center-id",
      name: "EduFlow Sandbox Academy",
      logo_url: null,
      address: "123 Innovation Drive, Tech City",
      is_active: true,
      created_at: now
    }
  ],
  users: [
    {
      id: "sandbox-user-id",
      username: "sandbox-admin",
      role: "center",
      center_id: "sandbox-center-id",
      is_active: true,
      active_academic_year: "2024-2025",
      created_at: now,
      last_active_at: now
    }
  ],
  students: [
    { id: "s1", name: "Alice Johnson", grade: "10", section: "A", center_id: "sandbox-center-id", is_active: true, created_at: now },
    { id: "s2", name: "Bob Smith", grade: "10", section: "A", center_id: "sandbox-center-id", is_active: true, created_at: now },
    { id: "s3", name: "Charlie Davis", grade: "9", section: "B", center_id: "sandbox-center-id", is_active: true, created_at: now },
    { id: "s4", name: "Diana Prince", grade: "11", section: "C", center_id: "sandbox-center-id", is_active: true, created_at: now },
    { id: "s5", name: "Edward Norton", grade: "10", section: "B", center_id: "sandbox-center-id", is_active: true, created_at: now }
  ],
  teachers: [
    { id: "t1", name: "John Doe", subject: "Mathematics", role: "Math Teacher", center_id: "sandbox-center-id", is_active: true, created_at: now, expected_check_in: "08:00" },
    { id: "t2", name: "Jane Wilson", subject: "Science", role: "Science Teacher", center_id: "sandbox-center-id", is_active: true, created_at: now, expected_check_in: "08:30" }
  ],
  center_feature_permissions: [
    {
      center_id: "sandbox-center-id",
      dashboard_access: true,
      register_student: true,
      take_attendance: true,
      attendance_summary: true,
      lesson_plans: true,
      lesson_tracking: true,
      homework_management: true,
      finance: true,
      messaging: true,
      exams_results: true,
      hr_management: true,
      inventory_assets: true,
      transport_tracking: true,
      calendar_events: true,
      settings_access: true,
      created_at: now
    }
  ],
  attendance: [
    { id: "a1", student_id: "s1", date: today, status: "present", center_id: "sandbox-center-id", created_at: now },
    { id: "a2", student_id: "s2", date: today, status: "present", center_id: "sandbox-center-id", created_at: now },
    { id: "a3", student_id: "s3", date: today, status: "absent", center_id: "sandbox-center-id", created_at: now }
  ],
  teacher_attendance: [
    { id: "ta1", teacher_id: "t1", date: today, status: "present", center_id: "sandbox-center-id", created_at: now }
  ],
  fee_installments: [
    { id: "f1", student_id: "s1", amount: 5000, due_date: "2024-05-30", status: "unpaid", center_id: "sandbox-center-id", created_at: now },
    { id: "f2", student_id: "s2", amount: 5000, due_date: "2024-05-30", status: "paid", center_id: "sandbox-center-id", created_at: now }
  ],
  payments: [
    { id: "p1", student_id: "s2", amount: 5000, payment_date: "2024-05-15", method: "cash", center_id: "sandbox-center-id", created_at: now }
  ],
  invoices: [
    { id: "i1", student_id: "s2", total_amount: 5000, paid_amount: 5000, invoice_date: today, status: "paid", center_id: "sandbox-center-id", created_at: now }
  ],
  lesson_plans: [
    { id: "l1", title: "Algebra Basics", grade: "10", subject: "Math", status: "published", center_id: "sandbox-center-id", created_at: now, lesson_date: today },
    { id: "l2", title: "Photosynthesis", grade: "9", subject: "Science", status: "draft", center_id: "sandbox-center-id", created_at: now, lesson_date: today }
  ],
  notices: [
    { id: "n1", title: "Summer Holidays", content: "School will be closed from June 1st.", date: today, center_id: "sandbox-center-id", created_at: now }
  ],
  ai_insights: [
    { id: "ai1", insight: "Student Alice Johnson shows a 15% improvement in Math over the last month.", type: "academic", center_id: "sandbox-center-id", created_at: now }
  ],
  predictive_scores: [
    { id: "ps1", student_id: "s3", risk_level: "high", risk_score: 85, factors: ["Low Attendance"], center_id: "sandbox-center-id", created_at: now }
  ],
  center_subscriptions: [
    {
      id: "sub1",
      center_id: "sandbox-center-id",
      status: "Active",
      start_date: now,
      subscription_days: 365,
      subscription_plans: { name: "Premium" },
      created_at: now
    }
  ],
  nav_categories: [
    { id: "cat1", name: "Academics", order: 1, center_id: "sandbox-center-id" },
    { id: "cat2", name: "Administration", order: 2, center_id: "sandbox-center-id" },
    { id: "cat3", name: "Reports and Communication", order: 3, center_id: "sandbox-center-id" }
  ],
  nav_items: [
    { id: "ni1", name: "Dashboard", route: "/center-dashboard", icon: "Home", role: "center", feature_name: "dashboard_access", category_id: null, order: 0, is_active: true, center_id: "sandbox-center-id" },
    { id: "ni2", name: "Take Attendance", route: "/attendance", icon: "CheckSquare", role: "center", feature_name: "take_attendance", category_id: "cat1", order: 1, is_active: true, center_id: "sandbox-center-id" },
    { id: "ni3", name: "Students Registration", route: "/register", icon: "UserPlus", role: "center", feature_name: "register_student", category_id: "cat2", order: 12, is_active: true, center_id: "sandbox-center-id" },
    { id: "ni4", name: "Finance", route: "/finance", icon: "DollarSign", role: "center", feature_name: "finance", category_id: "cat3", order: 31, is_active: true, center_id: "sandbox-center-id" }
  ],
  notifications: [],
  student_homework_records: [],
  student_chapters: [],
  test_results: [],
  period_schedules: [],
  class_substitutions: [],
  leave_applications: []
};
