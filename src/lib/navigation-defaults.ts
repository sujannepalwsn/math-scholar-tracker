import {
  Home, CheckSquare, Clock, LayoutList, BookOpen, Book,
  ClipboardCheck, GraduationCap, Award, Paintbrush, AlertTriangle,
  UserPlus, Users, UserCheck, Plane, IdCard, Archive, Bus,
  CalendarDays, Settings, MessageSquare, Video, Calendar,
  User, BarChart3, TrendingUp, FileText, DollarSign, PenTool, Brain
} from "lucide-react";

export const DEFAULT_NAV_CATEGORIES = [
  { name: "Student Management", order: 1 },
  { name: "Teacher Management", order: 2 },
  { name: "HR Management", order: 3 },
  { name: "Academic", order: 4 },
  { name: "Transport", order: 5 },
  { name: "Finance", order: 6 },
  { name: "Administration", order: 7 },
];

export const DEFAULT_NAV_ITEMS = [
  { name: "Dashboard", route: "/", icon: "Home", category: null, order: 0, feature_name: "dashboard_access", role: "center" },

  { name: "Students Registration", route: "/register", icon: "UserPlus", category: "Student Management", order: 0, feature_name: "can_manage_students", role: "center" },
  { name: "Student ID Cards", route: "/student-id-cards", icon: "IdCard", category: "Student Management", order: 1, feature_name: "can_manage_id_cards", role: "center" },

  { name: "Teachers Registration", route: "/teachers", icon: "Users", category: "Teacher Management", order: 0, feature_name: "can_manage_teachers", role: "center" },
  { name: "Teachers Attendance", route: "/teacher-attendance", icon: "CheckSquare", category: "Teacher Management", order: 1, feature_name: "can_manage_attendance", role: "center" },

  { name: "Leave Management", route: "/leave-management", icon: "Calendar", category: "HR Management", order: 0, feature_name: "can_manage_leave", role: "center" },
  { name: "Payroll", route: "/hr-management", icon: "DollarSign", category: "HR Management", order: 1, feature_name: "can_manage_hr", role: "center" },

  { name: "School Days", route: "/school-days", icon: "CalendarDays", category: "Academic", order: 0, feature_name: "can_manage_school_days", role: "center" },
  { name: "Exams", route: "/exams", icon: "GraduationCap", category: "Academic", order: 1, feature_name: "exams_results", role: "center" },
  { name: "Lesson Plans", route: "/lesson-plans", icon: "BookOpen", category: "Academic", order: 2, feature_name: "lesson_plans", role: "center" },

  { name: "Transport & Tracking", route: "/transport", icon: "Bus", category: "Transport", order: 0, feature_name: "can_manage_transport", role: "center" },

  { name: "Inventory & Assets", route: "/inventory", icon: "Archive", category: "Finance", order: 0, feature_name: "can_manage_inventory", role: "center" },

  { name: "Settings", route: "/settings", icon: "Settings", category: "Administration", order: 0, feature_name: "can_manage_settings", role: "center" },
];
