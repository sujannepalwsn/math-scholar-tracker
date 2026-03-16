import React, { useState } from "react";
import { AlertTriangle, Archive, Award, BarChart3, Bell, Book, BookOpen, Brain, Bus, Calendar, CalendarDays, CheckSquare, ClipboardCheck, Clock, CreditCard, DollarSign, FileText, GraduationCap, Home, IdCard, KeyRound, LayoutList, LogOut, Menu, MessageSquare, Paintbrush, PenTool, Plane, Settings, TrendingUp, User, UserCheck, UserPlus, Users, Video } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import CenterLogo from "./CenterLogo";
import NotificationBell from "./NotificationBell";
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useDynamicNavigation } from "@/hooks/useDynamicNavigation";

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
  category?: 'Academics' | 'Administration' | 'Reports and Communications';
}> = [
  { to: "/", label: "Dashboard", icon: Home, role: 'center' as const, featureName: 'dashboard_access' },

  // Academics Group
  { to: "/attendance", label: "Take Attendance", icon: CheckSquare, role: 'center' as const, featureName: 'take_attendance', category: 'Academics' },
  { to: "/class-routine", label: "Class Routine", icon: Clock, role: 'center' as const, featureName: 'class_routine', category: 'Academics' },
  { to: "/lesson-plan-management", label: "Lesson Plan Management", icon: LayoutList, role: 'center' as const, featureName: 'lesson_plans', category: 'Academics' },
  { to: "/lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'center' as const, featureName: 'lesson_tracking', category: 'Academics' },
  { to: "/homework", label: "Homework", icon: Book, role: 'center' as const, featureName: 'homework_management', category: 'Academics' },
  { to: "/tests", label: "Tests", icon: ClipboardCheck, role: 'center' as const, featureName: 'test_management', category: 'Academics' },
  { to: "/exams", label: "Exams & Results", icon: GraduationCap, role: 'center' as const, featureName: 'exams_results', category: 'Academics' },
  { to: "/published-results", label: "Published Results", icon: Award, role: 'center' as const, featureName: 'published_results', category: 'Academics' },
  { to: "/activities", label: "Activities", icon: Paintbrush, role: 'center' as const, featureName: 'preschool_activities', category: 'Academics' },
  { to: "/discipline", label: "Discipline", icon: AlertTriangle, role: 'center' as const, featureName: 'discipline_issues', category: 'Academics' },

  // Administration Group
  { to: "/register", label: "Students Registration", icon: UserPlus, role: 'center' as const, featureName: 'students_registration', category: 'Administration' },
  { to: "/teachers", label: "Teachers Registration", icon: Users, role: 'center' as const, featureName: 'teacher_management', category: 'Administration' },
  { to: "/teacher-attendance", label: "Teachers' Attendance", icon: UserCheck, role: 'center' as const, featureName: 'teachers_attendance', category: 'Administration' },
  { to: "/hr-management", label: "HR Management", icon: Award, role: 'center' as const, featureName: 'hr_management', category: 'Administration' },
  { to: "/leave-management", label: "Leave Management", icon: Plane, role: 'center' as const, featureName: 'leave_management', category: 'Administration' },
  { to: "/student-id-cards", label: "Student ID Cards", icon: IdCard, role: 'center' as const, featureName: 'student_id_cards', category: 'Administration' },
  { to: "/inventory", label: "Inventory & Assets", icon: Archive, role: 'center' as const, featureName: 'inventory_assets', category: 'Administration' },
  { to: "/transport", label: "Transport & Tracking", icon: Bus, role: 'center' as const, featureName: 'transport_tracking', category: 'Administration' },
  { to: "/school-days", label: "School Days", icon: CalendarDays, role: 'center' as const, featureName: 'school_days', category: 'Administration' },
  { to: "/settings", label: "Settings", icon: Settings, role: 'center' as const, featureName: 'settings_access', category: 'Administration' },

  // Reports and Communication Group
  { to: "/messages", label: "Messages", icon: MessageSquare, role: 'center' as const, featureName: 'messaging', category: 'Reports and Communication' },
  { to: "/meetings", label: "Meetings", icon: Video, role: 'center' as const, featureName: 'meetings_management', category: 'Reports and Communication' },
  { to: "/calendar", label: "Calendar & Events", icon: CalendarDays, role: 'center' as const, featureName: 'calendar_events', category: 'Reports and Communication' },
  { to: "/student-report", label: "Student Report", icon: User, role: 'center' as const, featureName: 'student_report', category: 'Reports and Communication' },
  { to: "/attendance-summary", label: "Attendance Summary", icon: Calendar, role: 'center' as const, featureName: 'attendance_summary', category: 'Reports and Communication' },
  { to: "/summary", label: "Summary", icon: BarChart3, role: 'center' as const, featureName: 'summary', category: 'Reports and Communication' },
  { to: "/teacher-performance", label: "Teacher Reports", icon: BarChart3, role: 'center' as const, featureName: 'teacher_reports', category: 'Reports and Communication' },
  { to: "/chapter-performance-overview", label: "Chapter Performance", icon: TrendingUp, role: 'center' as const, featureName: 'chapter_performance', category: 'Reports and Communication' },
  { to: "/records", label: "View Records", icon: FileText, role: 'center' as const, featureName: 'view_records', category: 'Reports and Communication' },
  { to: "/finance", label: "Finance", icon: DollarSign, role: 'center' as const, featureName: 'finance', category: 'Reports and Communication' },
];

export default function CenterLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { dynamicCategories, dynamicItems, getIcon } = useDynamicNavigation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages-center", user?.id, user?.center_id],
    queryFn: async () => {
      if (!user?.id || !user?.center_id) return 0;
      const { data: conversations, error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('center_id', user.center_id);
      if (convError) return 0;
      const conversationIds = conversations.map(c => c.id);
      if (conversationIds.length === 0) return 0;

      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_user_id', user.id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id && !!user?.center_id,
    refetchInterval: 10000 });

  const updatedNavItems = dynamicItems.length > 0
    ? dynamicItems.map(it => {
        const cat = dynamicCategories.find(c => c.id === it.category_id);
        return {
          to: it.route,
          label: it.name,
          icon: getIcon(it.icon),
          role: (it.role || 'center') as any,
          featureName: it.feature_name,
          category: cat?.name,
          unreadCount: it.route === "/messages" ? unreadMessageCount : undefined,
          is_active: it.is_active
        };
      })
    : navItems.map(item =>
        item.to === "/messages" ? { ...item, unreadCount: unreadMessageCount } : item
      );

  const headerContent = (
    <CenterLogo size="md" showName={true} />
  );

  const footerContent = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground truncate">{user?.username}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar
        navItems={updatedNavItems}
        headerContent={headerContent}
        footerContent={footerContent}
        onCollapseChange={setSidebarCollapsed}
        isMobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
          <CenterLogo size="sm" showName={true} />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto bg-background transition-all duration-200",
        "md:h-screen",
        "pt-16 md:pt-0",
        "px-4 pb-20 md:p-6 lg:p-8",
        sidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <div className="page-enter max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <BottomNav navItems={updatedNavItems} />
    </div>
  );
}
