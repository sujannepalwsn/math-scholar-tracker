import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, BrainDays, ClipboardCheck, Clock, DollarSign, FileText, Home, KeyRound, LayoutList, LogOut, Menu, MessageSquare, Paintbrush, TrendingUp, User, Video } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Sidebar from "./Sidebar";
import CenterLogo from "./CenterLogo";

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
}> = [
  { to: "/teacher-dashboard", label: "Dashboard", icon: Home, role: 'teacher' as const },
  { to: "/teacher/take-attendance", label: "Take Attendance", icon: CheckSquare, role: 'teacher' as const, featureName: 'take_attendance' },
  { to: "/teacher/attendance-summary", label: "Attendance Summary", icon: CalendarDays, role: 'teacher' as const, featureName: 'attendance_summary' },
  { to: "/teacher/lesson-plans", label: "Lesson Plans", icon: LayoutList, role: 'teacher' as const, featureName: 'lesson_plans' },
  { to: "/teacher/lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'teacher' as const, featureName: 'lesson_tracking' },
  { to: "/teacher/homework-management", label: "Homework Management", icon: Book, role: 'teacher' as const, featureName: 'homework_management' },
  { to: "/teacher/activities", label: "Activities", icon: Paintbrush, role: 'teacher' as const, featureName: 'activities' },
  { to: "/teacher/preschool-activities", label: "Preschool Activities", icon: Paintbrush, role: 'teacher' as const, featureName: 'preschool_activities' },
  { to: "/teacher/discipline-issues", label: "Discipline Issues", icon: AlertTriangle, role: 'teacher' as const, featureName: 'discipline_issues' },
  { to: "/teacher/test-management", label: "Test Management", icon: ClipboardCheck, role: 'teacher' as const, featureName: 'test_management' },
  { to: "/teacher/student-report", label: "Student Report", icon: User, role: 'teacher' as const, featureName: 'student_report_access' },
  { to: "/teacher/chapter-performance", label: "Chapter Performance", icon: TrendingUp, role: 'teacher' as const, featureName: 'chapter_performance' },
  { to: "/teacher/ai-insights", label: "AI Insights", icon: Brain, role: 'teacher' as const, featureName: 'ai_insights' },
  { to: "/teacher/view-records", label: "View Records", icon: FileText, role: 'teacher' as const, featureName: 'view_records' },
  { to: "/teacher/summary", label: "Summary", icon: BarChart3, role: 'teacher' as const, featureName: 'summary' },
  { to: "/teacher/finance", label: "Finance", icon: DollarSign, role: 'teacher' as const, featureName: 'finance' },
  { to: "/teacher-meetings", label: "Meetings", icon: Video, role: 'teacher' as const, featureName: 'meetings_management' },
  { to: "/teacher-messages", label: "Messages", icon: MessageSquare, role: 'teacher' as const, featureName: 'messaging' },
  { to: "/teacher/class-routine", label: "Class Routine", icon: Clock, role: 'teacher' as const, featureName: 'class_routine' },
  { to: "/teacher/calendar", label: "Calendar", icon: Calendar, role: 'teacher' as const, featureName: 'calendar_events' },
  { to: "/change-password", label: "Change Password", icon: KeyRound, role: 'teacher' as const },
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
    refetchInterval: 10000,
  });

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
        <span className="text-muted-foreground">{user?.username}</span>
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
      {/* Desktop Sidebar */}
      <div className="fixed top-0 left-0 h-screen z-10 hidden md:block">
        <Sidebar
          navItems={filteredTeacherNavItems}
          headerContent={headerContent}
          footerContent={footerContent}
          onCollapseChange={setSidebarCollapsed}
          isMobileOpen={mobileMenuOpen}
          onMobileOpenChange={setMobileMenuOpen}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        navItems={filteredTeacherNavItems}
        headerContent={headerContent}
        footerContent={footerContent}
        isMobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b z-20 flex items-center justify-between px-4">
        <div className="flex-1">
          <CenterLogo size="sm" showName={false} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto bg-background transition-all duration-300",
        "md:h-screen",
        "pt-20 md:pt-0",
        "px-4 pb-8 md:p-8",
        sidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}
