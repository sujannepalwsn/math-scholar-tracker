import React, { useState } from "react";
import { AlertTriangle, Award, BarChart3, Book, BookOpen, Brain, Calendar, CalendarDays, CheckSquare, ClipboardCheck, Clock, DollarSign, FileText, GraduationCap, Home, KeyRound, LayoutList, LogOut, MessageSquare, Paintbrush, PenTool, Plane, Settings, TrendingUp, User, Video } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import CenterLogo from "./CenterLogo";
import { Footer } from "./Footer";
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
  category?: 'Academic Sections' | 'Administration Section' | 'Reporting and Communication Sections';
}> = [
  { to: "/teacher-dashboard", label: "Dashboard", icon: Home, role: 'teacher' as const },

  // Academics Group
  { to: "/teacher/take-attendance", label: "Take Attendance", icon: CheckSquare, role: 'teacher' as const, featureName: 'take_attendance', category: 'Academic Sections' },
  { to: "/teacher/class-routine", label: "Class Routine", icon: Clock, role: 'teacher' as const, featureName: 'class_routine', category: 'Academic Sections' },
  { to: "/teacher/lesson-plans", label: "Lesson Plans", icon: LayoutList, role: 'teacher' as const, featureName: 'lesson_plans', category: 'Academic Sections' },
  { to: "/teacher/lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'teacher' as const, featureName: 'lesson_tracking', category: 'Academic Sections' },
  { to: "/teacher/homework-management", label: "Homework", icon: Book, role: 'teacher' as const, featureName: 'homework_management', category: 'Academic Sections' },
  { to: "/teacher/test-management", label: "Tests", icon: ClipboardCheck, role: 'teacher' as const, featureName: 'test_management', category: 'Academic Sections' },
  { to: "/teacher/exams", label: "Exams & Results", icon: GraduationCap, role: 'teacher' as const, featureName: 'test_management', category: 'Academic Sections' },
  { to: "/teacher/published-results", label: "Published Results", icon: Award, role: 'teacher' as const, featureName: 'published_results', category: 'Academic Sections' },
  { to: "/teacher/marks-entry", label: "Marks Entry", icon: PenTool, role: 'teacher' as const, featureName: 'test_management', category: 'Academic Sections' },
  { to: "/teacher/activities", label: "Activities", icon: Paintbrush, role: 'teacher' as const, featureName: 'preschool_activities', category: 'Academic Sections' },
  { to: "/teacher/preschool-activities", label: "Preschool Activities", icon: Paintbrush, role: 'teacher' as const, featureName: 'preschool_activities', category: 'Academic Sections' },
  { to: "/teacher/discipline-issues", label: "Discipline", icon: AlertTriangle, role: 'teacher' as const, featureName: 'discipline_issues', category: 'Academic Sections' },

  // Reports and Communications Group
  { to: "/teacher/ai-insights", label: "AI Insights", icon: Brain, role: 'teacher' as const, featureName: 'ai_insights', category: 'Reporting and Communication Sections' },
  { to: "/teacher/view-records", label: "View Records", icon: FileText, role: 'teacher' as const, featureName: 'view_records', category: 'Reporting and Communication Sections' },
  { to: "/teacher/summary", label: "Summary", icon: BarChart3, role: 'teacher' as const, featureName: 'summary', category: 'Reporting and Communication Sections' },
  { to: "/teacher/finance", label: "Finance", icon: DollarSign, role: 'teacher' as const, featureName: 'finance', category: 'Reporting and Communication Sections' },
  { to: "/teacher/chapter-performance", label: "Chapter Performance", icon: TrendingUp, role: 'teacher' as const, featureName: 'chapter_performance', category: 'Reporting and Communication Sections' },
  { to: "/teacher/attendance-summary", label: "Attendance Summary", icon: CalendarDays, role: 'teacher' as const, featureName: 'attendance_summary', category: 'Reporting and Communication Sections' },
  { to: "/teacher/student-report", label: "Student Report", icon: User, role: 'teacher' as const, featureName: 'student_report_access', category: 'Reporting and Communication Sections' },
  { to: "/teacher-meetings", label: "Meetings", icon: Video, role: 'teacher' as const, featureName: 'meetings_management', category: 'Reporting and Communication Sections' },
  { to: "/teacher-messages", label: "Messages", icon: MessageSquare, role: 'teacher' as const, featureName: 'messaging', category: 'Reporting and Communication Sections' },
  { to: "/teacher/calendar", label: "Calendar", icon: Calendar, role: 'teacher' as const, featureName: 'calendar_events', category: 'Reporting and Communication Sections' },

  // Administration Group
  { to: "/teacher/leave", label: "Leave Applications", icon: Plane, role: 'teacher' as const, featureName: 'leave_management', category: 'Administration Section' },
  { to: "/teacher/settings", label: "Settings", icon: Settings, role: 'teacher' as const, category: 'Administration Section' },
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
    // Teachers must respect both their individual permissions AND the center's permissions
    if (item.featureName) {
      if (user?.centerPermissions && user.centerPermissions[item.featureName] === false) {
        return false;
      }
      if (user?.teacherPermissions && user.teacherPermissions[item.featureName] === false) {
        return false;
      }
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
        "flex-1 overflow-y-auto bg-background transition-all duration-200 flex flex-col",
        "md:h-screen",
        "pt-16 md:pt-0",
        sidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <div className="flex-1 px-4 pb-20 md:p-6 lg:p-8">
          <div className="page-enter max-w-7xl mx-auto">
            {children}
          </div>
        </div>
        <div className="px-4 md:px-6 lg:px-8 pb-20 md:pb-6">
          <Footer />
        </div>
      </main>

      <BottomNav navItems={filteredTeacherNavItems} />
    </div>
  );
}
