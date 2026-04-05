export interface SystemModule {
  id: number;
  name: string;
  description: string;
  key_functionalities: string[];
  completeness: 'Fully implemented' | 'In Progress';
  feature_mapping: string[];
  icon: string;
}

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: 1,
    name: "Authentication & Authorization",
    description: "Manages user login, registration, and role-based access control across the system.",
    key_functionalities: ["User registration (Admin, Teacher, Parent)", "Secure login for different user roles", "Role-based access control (RBAC)", "Password management"],
    completeness: "Fully implemented",
    feature_mapping: ["dashboard_access"],
    icon: "Shield"
  },
  {
    id: 2,
    name: "Dashboard",
    description: "Provides an overview and quick access to key information and functionalities relevant to each user role (Admin, Center, Teacher, Parent).",
    key_functionalities: ["Role-specific data summaries", "Quick links to frequently used modules", "Notifications display"],
    completeness: "Fully implemented",
    feature_mapping: ["dashboard_access"],
    icon: "LayoutDashboard"
  },
  {
    id: 3,
    name: "Student Management",
    description: "Handles the registration, record-keeping, and general management of student information.",
    key_functionalities: ["Student registration", "Viewing and managing student records", "Generating student ID cards", "Linking students to parents"],
    completeness: "Fully implemented",
    feature_mapping: ["register_student", "student_id_cards", "view_records"],
    icon: "Users"
  },
  {
    id: 4,
    name: "Teacher Management",
    description: "Manages teacher profiles, assignments, and performance tracking.",
    key_functionalities: ["Teacher registration/onboarding", "Viewing teacher profiles", "Tracking teacher performance", "Managing teacher leave applications"],
    completeness: "Fully implemented",
    feature_mapping: ["teacher_management", "hr_management"],
    icon: "Briefcase"
  },
  {
    id: 5,
    name: "Class & Subject Management",
    description: "Organizes academic classes, subjects, and their associated routines.",
    key_functionalities: ["Creation and management of classes", "Assignment of subjects to classes", "Management of class routines/timetables", "Academic year and grade level configuration"],
    completeness: "Fully implemented",
    feature_mapping: ["class_routine"],
    icon: "BookOpen"
  },
  {
    id: 6,
    name: "Attendance Management",
    description: "Facilitates the recording and tracking of student and teacher attendance.",
    key_functionalities: ["Recording daily attendance for students", "Viewing attendance summaries", "Teacher attendance tracking"],
    completeness: "Fully implemented",
    feature_mapping: ["take_attendance", "teachers_attendance", "attendance_summary"],
    icon: "ClipboardCheck"
  },
  {
    id: 7,
    name: "Exam & Results Management",
    description: "Manages the entire examination process, from scheduling to result publication.",
    key_functionalities: ["Exam scheduling and management", "Marks entry for students", "Publication of results", "Student marksheets and results dashboards"],
    completeness: "Fully implemented",
    feature_mapping: ["exams_results", "published_results"],
    icon: "GraduationCap"
  },
  {
    id: 8,
    name: "Lesson Plan & Tracking",
    description: "Allows teachers to create and manage lesson plans and track student progress against them.",
    key_functionalities: ["Creation and management of lesson plans", "Tracking student progress on lessons", "OCR for lesson plans"],
    completeness: "Fully implemented",
    feature_mapping: ["lesson_plans", "lesson_tracking"],
    icon: "Target"
  },
  {
    id: 9,
    name: "Homework Management",
    description: "Enables teachers to assign and manage homework for students.",
    key_functionalities: ["Assigning homework to classes/students", "Tracking homework submission"],
    completeness: "Fully implemented",
    feature_mapping: ["homework_management"],
    icon: "Pencil"
  },
  {
    id: 10,
    name: "Discipline Management",
    description: "Records and manages student discipline issues.",
    key_functionalities: ["Logging discipline incidents", "Viewing discipline records for students"],
    completeness: "Fully implemented",
    feature_mapping: ["discipline_issues"],
    icon: "AlertTriangle"
  },
  {
    id: 11,
    name: "Finance Management",
    description: "Handles fee collection, invoicing, and financial reporting.",
    key_functionalities: ["Fee category and structure management", "Invoice generation", "Payment tracking and processing", "Late fee calculation"],
    completeness: "Fully implemented",
    feature_mapping: ["finance"],
    icon: "DollarSign"
  },
  {
    id: 12,
    name: "HR Management",
    description: "Manages human resources aspects, specifically teacher leave applications and staff documents.",
    key_functionalities: ["Teacher leave application workflow", "Staff document management"],
    completeness: "Fully implemented",
    feature_mapping: ["hr_management", "leave_management"],
    icon: "UserCheck"
  },
  {
    id: 13,
    name: "Inventory Management",
    description: "Manages school inventory and assets.",
    key_functionalities: ["Tracking inventory items", "Asset management"],
    completeness: "Fully implemented",
    feature_mapping: ["inventory_assets"],
    icon: "Package"
  },
  {
    id: 14,
    name: "Transport Management",
    description: "Manages school transportation logistics.",
    key_functionalities: ["Vehicle management", "Route planning", "Student transport assignments"],
    completeness: "Fully implemented",
    feature_mapping: ["transport_tracking"],
    icon: "Bus"
  },
  {
    id: 15,
    name: "Messaging & Meetings",
    description: "Provides internal communication tools for users, including messaging and meeting scheduling.",
    key_functionalities: ["Internal messaging system (chat)", "Meeting scheduling and management", "Broadcast messages"],
    completeness: "Fully implemented",
    feature_mapping: ["messaging", "meetings_management"],
    icon: "MessageSquare"
  },
  {
    id: 16,
    name: "Notifications",
    description: "Delivers important alerts and updates to users.",
    key_functionalities: ["Real-time notifications", "Notification history"],
    completeness: "Fully implemented",
    feature_mapping: ["messaging"],
    icon: "Bell"
  },
  {
    id: 17,
    name: "Calendar Events",
    description: "Displays school-wide events and personal schedules.",
    key_functionalities: ["Event display", "Personal schedule integration", "Holiday & School Day Management"],
    completeness: "Fully implemented",
    feature_mapping: ["calendar_events"],
    icon: "Calendar"
  },
  {
    id: 18,
    name: "Settings & Customization",
    description: "Allows administrators to configure various aspects of the system and customize the school's profile.",
    key_functionalities: ["General system settings", "Login page customization", "About institution details", "Navigation management"],
    completeness: "Fully implemented",
    feature_mapping: ["settings_access", "about_institution"],
    icon: "Settings"
  },
  {
    id: 19,
    name: "AI Insights",
    description: "Provides data-driven insights and analytics using AI for deeper performance analysis.",
    key_functionalities: ["Data analysis and reporting", "AI-powered recommendations", "Predictive performance tracking"],
    completeness: "Fully implemented",
    feature_mapping: ["ai_insights"],
    icon: "Sparkles"
  },
  {
    id: 20,
    name: "Error Tracking",
    description: "Monitors and logs system errors for debugging and maintenance.",
    key_functionalities: ["Error logging", "Error reporting dashboard"],
    completeness: "Fully implemented",
    feature_mapping: ["settings_access"],
    icon: "Bug"
  },
  {
    id: 21,
    name: "Public Admission",
    description: "Allows external users to register students for admission.",
    key_functionalities: ["Public student registration form", "Admission application tracking"],
    completeness: "Fully implemented",
    feature_mapping: ["register_student"],
    icon: "UserPlus"
  },
  {
    id: 23,
    name: "Preschool Activities",
    description: "Manages activities specifically for preschool students.",
    key_functionalities: ["Activity scheduling", "Parent view of activities"],
    completeness: "Fully implemented",
    feature_mapping: ["preschool_activities"],
    icon: "Palette"
  },
  {
    id: 24,
    name: "Chapter Performance Overview",
    description: "Provides an overview of student performance at a chapter level.",
    key_functionalities: ["Chapter-wise performance reports", "Parent view of chapter ratings"],
    completeness: "Fully implemented",
    feature_mapping: ["chapter_performance"],
    icon: "BarChart"
  },
  {
    id: 25,
    name: "View Records",
    description: "A general module for viewing various records within the system.",
    key_functionalities: ["Access to student/teacher/finance records", "Audit trail visibility"],
    completeness: "Fully implemented",
    feature_mapping: ["view_records"],
    icon: "Database"
  },
  {
    id: 26,
    name: "Summary",
    description: "Provides summarized information across different modules.",
    key_functionalities: ["Consolidated reports", "Overview of key metrics"],
    completeness: "Fully implemented",
    feature_mapping: ["summary"],
    icon: "PieChart"
  },
  {
    id: 27,
    name: "About Institution",
    description: "Displays information about the educational institution.",
    key_functionalities: ["School profile details", "Contact information"],
    completeness: "Fully implemented",
    feature_mapping: ["about_institution"],
    icon: "School"
  },
  {
    id: 28,
    name: "Student Report",
    description: "Generates and displays comprehensive reports for individual students.",
    key_functionalities: ["Academic performance reports", "Attendance reports", "Discipline reports"],
    completeness: "Fully implemented",
    feature_mapping: ["student_report"],
    icon: "FileText"
  },
  {
    id: 29,
    name: "User Preferences",
    description: "Allows users to customize their application settings and preferences.",
    key_functionalities: ["Theme selection", "Notification preferences"],
    completeness: "Fully implemented",
    feature_mapping: ["settings_access"],
    icon: "Sliders"
  },
  {
    id: 30,
    name: "Audit Logs",
    description: "Records system activities and changes for security and compliance.",
    key_functionalities: ["Logging user actions", "Tracking data modifications", "Admin audit logging"],
    completeness: "Fully implemented",
    feature_mapping: ["settings_access"],
    icon: "History"
  }
];
