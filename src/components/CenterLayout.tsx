import React, { useState } from "react";
import { AlertTriangle, Award, BarChart3, Bell, Book, BookOpen, Brain, Calendar, CalendarDays, CheckSquare, ClipboardCheck, Clock, CreditCard, DollarSign, FileText, GraduationCap, Home, IdCard, KeyRound, LayoutList, LogOut, MessageSquare, Paintbrush, PenTool, Plane, Settings, TrendingUp, User, UserCheck, UserPlus, Users, Video } from "lucide-react";
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
  { to: "/", label: "Dashboard", icon: Home, role: 'center' as const },

  // Academics Group
  { to: "/attendance", label: "Take Attendance", icon: CheckSquare, role: 'center' as const, featureName: 'take_attendance', category: 'Academic Sections' },
  { to: "/class-routine", label: "Class Routine", icon: Clock, role: 'center' as const, featureName: 'class_routine', category: 'Academic Sections' },
  { to: "/lesson-plans", label: "Lesson Plans", icon: LayoutList, role: 'center' as const, featureName: 'lesson_plans', category: 'Academic Sections' },
  { to: "/lesson-plan-management", label: "Lesson Plan Management", icon: ClipboardCheck, role: 'center' as const, featureName: 'lesson_plans', category: 'Academic Sections' },
  { to: "/lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'center' as const, featureName: 'lesson_tracking', category: 'Academic Sections' },
  { to: "/homework", label: "Homework", icon: Book, role: 'center' as const, featureName: 'homework_management', category: 'Academic Sections' },
  { to: "/tests", label: "Tests", icon: ClipboardCheck, role: 'center' as const, featureName: 'test_management', category: 'Academic Sections' },
  { to: "/exams", label: "Exams & Results", icon: GraduationCap, role: 'center' as const, featureName: 'test_management', category: 'Academic Sections' },
  { to: "/published-results", label: "Published Results", icon: Award, role: 'center' as const, featureName: 'published_results', category: 'Academic Sections' },
  { to: "/activities", label: "Activities", icon: Paintbrush, role: 'center' as const, featureName: 'preschool_activities', category: 'Academic Sections' },
  { to: "/discipline", label: "Discipline", icon: AlertTriangle, role: 'center' as const, featureName: 'discipline_issues', category: 'Academic Sections' },

  // Reports and Communications Group
  { to: "/ai-insights", label: "AI Insights", icon: Brain, role: 'center' as const, featureName: 'ai_insights', category: 'Reporting and Communication Sections' },
  { to: "/records", label: "View Records", icon: FileText, role: 'center' as const, featureName: 'view_records', category: 'Reporting and Communication Sections' },
  { to: "/summary", label: "Summary", icon: BarChart3, role: 'center' as const, featureName: 'summary', category: 'Reporting and Communication Sections' },
  { to: "/finance", label: "Finance", icon: DollarSign, role: 'center' as const, featureName: 'finance', category: 'Reporting and Communication Sections' },
  { to: "/chapter-performance-overview", label: "Chapter Performance", icon: TrendingUp, role: 'center' as const, featureName: 'chapter_performance', category: 'Reporting and Communication Sections' },
  { to: "/teacher-performance", label: "Teacher Reports", icon: BarChart3, role: 'center' as const, featureName: 'teacher_performance', category: 'Reporting and Communication Sections' },
  { to: "/attendance-summary", label: "Attendance Summary", icon: Calendar, role: 'center' as const, featureName: 'attendance_summary', category: 'Reporting and Communication Sections' },
  { to: "/student-report", label: "Student Report", icon: User, role: 'center' as const, featureName: 'student_report', category: 'Reporting and Communication Sections' },
  { to: "/meetings", label: "Meetings", icon: Video, role: 'center' as const, featureName: 'meetings_management', category: 'Reporting and Communication Sections' },
  { to: "/messages", label: "Messages", icon: MessageSquare, role: 'center' as const, featureName: 'messaging', category: 'Reporting and Communication Sections' },
  { to: "/calendar", label: "Calendar & Events", icon: CalendarDays, role: 'center' as const, featureName: 'calendar_events', category: 'Reporting and Communication Sections' },

  // Administration Group
  { to: "/register", label: "Students Registration", icon: UserPlus, role: 'center' as const, featureName: 'register_student', category: 'Administration Section' },
  { to: "/teachers", label: "Teachers Registration", icon: Users, role: 'center' as const, featureName: 'teacher_management', category: 'Administration Section' },
  { to: "/teacher-attendance", label: "Teachers' Attendance", icon: UserCheck, role: 'center' as const, featureName: 'teacher_management', category: 'Administration Section' },
  { to: "/leave-management", label: "Leave Management", icon: Plane, role: 'center' as const, featureName: 'leave_management', category: 'Administration Section' },
  { to: "/student-id-cards", label: "Student ID Cards", icon: IdCard, role: 'center' as const, featureName: 'student_id_cards', category: 'Administration Section' },
  { to: "/settings", label: "Settings", icon: Settings, role: 'center' as const, category: 'Administration Section' },
];

export default function CenterLayout({ children }: { children: React.ReactNode }) {
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

  const updatedNavItems = navItems.map(item =>
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

  const filteredNavItems = updatedNavItems.filter(item => {
    if (item.featureName && user?.centerPermissions) {
      return user.centerPermissions[item.featureName] !== false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar
        navItems={filteredNavItems}
        headerContent={headerContent}
        footerContent={footerContent}
        onCollapseChange={setSidebarCollapsed}
        isMobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
      />

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b z-20 flex items-center justify-between px-4">
        <CenterLogo size="sm" showName={true} />
        <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Main Content */}
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

      <BottomNav navItems={filteredNavItems} />
    </div>
  );
}
