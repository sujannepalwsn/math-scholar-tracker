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
  { name: "Dashboard", route: "/", icon: "Home", category: null, order: 0, feature_name: "dashboard_access" },

  { name: "Students Registration", route: "/register", icon: "UserPlus", category: "Student Management", order: 0, feature_name: "can_manage_students" },
  { name: "Student ID Cards", route: "/student-id-cards", icon: "IdCard", category: "Student Management", order: 1, feature_name: "can_manage_id_cards" },

  { name: "Teachers Registration", route: "/teachers", icon: "Users", category: "Teacher Management", order: 0, feature_name: "can_manage_teachers" },
  { name: "Teachers Attendance", route: "/teacher-attendance", icon: "CheckSquare", category: "Teacher Management", order: 1, feature_name: "can_manage_attendance" },

  { name: "Leave Management", route: "/leave-management", icon: "Calendar", category: "HR Management", order: 0, feature_name: "can_manage_leave" },
  { name: "Payroll", route: "/hr-management", icon: "DollarSign", category: "HR Management", order: 1, feature_name: "can_manage_hr" },

  { name: "School Days", route: "/school-days", icon: "CalendarDays", category: "Academic", order: 0, feature_name: "can_manage_school_days" },
  { name: "Exams", route: "/exams", icon: "GraduationCap", category: "Academic", order: 1, feature_name: "exams_results" },
  { name: "Lesson Plans", route: "/lesson-plans", icon: "BookOpen", category: "Academic", order: 2, feature_name: "lesson_plans" },

  { name: "Transport & Tracking", route: "/transport", icon: "Bus", category: "Transport", order: 0, feature_name: "can_manage_transport" },

  { name: "Inventory & Assets", route: "/inventory", icon: "Archive", category: "Finance", order: 0, feature_name: "can_manage_inventory" },

  { name: "Settings", route: "/settings", icon: "Settings", category: "Administration", order: 0, feature_name: "can_manage_settings" },
];
