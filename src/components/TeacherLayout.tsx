import React, { useState } from "react";
import { AlertTriangle, BarChart3, Book, BookOpen, Brain, Calendar, CalendarDays, CheckSquare, ClipboardCheck, Clock, DollarSign, FileText, Home, KeyRound, LayoutList, LogOut, MessageSquare, Paintbrush, Settings, TrendingUp, User, Video } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import CenterLogo from "./CenterLogo";
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
  category?: 'Academics' | 'Administration' | 'Reports and Communications';
}> = [
  { to: "/teacher-dashboard", label: "Dashboard", icon: Home, role: 'teacher' as const },
  { to: "/teacher/take-attendance", label: "Take Attendance", icon: CheckSquare, role: 'teacher' as const, featureName: 'take_attendance', category: 'Academics' },
  { to: "/teacher/lesson-plans", label: "Lesson Plans", icon: LayoutList, role: 'teacher' as const, featureName: 'lesson_plans', category: 'Academics' },
  { to: "/teacher/lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'teacher' as const, featureName: 'lesson_tracking', category: 'Academics' },
  { to: "/teacher/homework-management", label: "Homework", icon: Book, role: 'teacher' as const, featureName: 'homework_management', category: 'Academics' },
  { to: "/teacher/test-management", label: "Tests", icon: ClipboardCheck, role: 'teacher' as const, featureName: 'test_management', category: 'Academics' },
  { to: "/teacher/activities", label: "Activities", icon: Paintbrush, role: 'teacher' as const, featureName: 'activities', category: 'Academics' },
  { to: "/teacher/discipline-issues", label: "Discipline", icon: AlertTriangle, role: 'teacher' as const, featureName: 'discipline_issues', category: 'Academics' },
  { to: "/teacher/chapter-performance", label: "Chapter Performance", icon: TrendingUp, role: 'teacher' as const, featureName: 'chapter_performance', category: 'Administration' },
  { to: "/teacher/settings", label: "Settings", icon: Settings, role: 'teacher' as const, category: 'Administration' },

  { to: "/teacher/ai-insights", label: "AI Insights", icon: Brain, role: 'teacher' as const, featureName: 'ai_insights', category: 'Reports and Communications' },
  { to: "/teacher/view-records", label: "View Records", icon: FileText, role: 'teacher' as const, featureName: 'view_records', category: 'Reports and Communications' },
  { to: "/teacher/summary", label: "Summary", icon: BarChart3, role: 'teacher' as const, featureName: 'summary', category: 'Reports and Communications' },
  { to: "/teacher/finance", label: "Finance", icon: DollarSign, role: 'teacher' as const, featureName: 'finance', category: 'Reports and Communications' },
  { to: "/teacher-meetings", label: "Meetings", icon: Video, role: 'teacher' as const, featureName: 'meetings_management', category: 'Reports and Communications' },
  { to: "/teacher-messages", label: "Messages", icon: MessageSquare, role: 'teacher' as const, featureName: 'messaging', category: 'Reports and Communications' },
  { to: "/teacher/class-routine", label: "Class Routine", icon: Clock, role: 'teacher' as const, featureName: 'class_routine', category: 'Reports and Communications' },
  { to: "/teacher/calendar", label: "Calendar", icon: Calendar, role: 'teacher' as const, featureName: 'calendar_events', category: 'Reports and Communications' },
  { to: "/teacher/attendance-summary", label: "Attendance Summary", icon: CalendarDays, role: 'teacher' as const, featureName: 'attendance_summary', category: 'Reports and Communications' },
  { to: "/teacher/student-report", label: "Student Report", icon: User, role: 'teacher' as const, featureName: 'student_report_access', category: 'Reports and Communications' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages-teacher", user?.id, user?.center_id],
    queryFn: async () => {
      if (!user?.id || !user?.center_id) return 0;
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('parent_user_id', user.id)
        .eq('center_id', user.center_id)
        .maybeSingle();
      if (convError || !conversation) return 0;

      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conversation.id)
        .eq('is_read', false)
        .neq('sender_user_id', user.id);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id && !!user?.center_id,
    refetchInterval: 10000 });

  const updatedNavItems = navItems.map(item =>
    item.to === "/teacher-messages" ? { ...item, unreadCount: unreadMessageCount } : item
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

  const filteredTeacherNavItems = updatedNavItems.filter(item => {
    if (item.featureName && user?.teacherPermissions) {
      const permission = user.teacherPermissions[item.featureName];
      return permission !== false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar
        navItems={filteredTeacherNavItems}
        headerContent={headerContent}
        footerContent={footerContent}
        onCollapseChange={setSidebarCollapsed}
        isMobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />

      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-20 flex items-center justify-between px-4">
        <CenterLogo size="sm" showName={true} />
        <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

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

      <BottomNav navItems={filteredTeacherNavItems} />
    </div>
  );
}
