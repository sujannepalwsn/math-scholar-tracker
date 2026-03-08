import React, { useState } from "react";
import { AlertTriangle, BarChart3, Book, BookOpen, Brain, Calendar, CalendarDays, CheckSquare, ClipboardCheck, Clock, DollarSign, FileText, Home, KeyRound, LayoutList, LogOut, MessageSquare, Paintbrush, Settings, TrendingUp, User, UserCheck, UserPlus, Users, Video } from "lucide-react";
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
  { to: "/", label: "Dashboard", icon: Home, role: 'center' as const },

  // Academics Group
  { to: "/attendance", label: "Take Attendance", icon: CheckSquare, role: 'center' as const, featureName: 'take_attendance', category: 'Academics' },
  { to: "/lesson-plans", label: "Lesson Plans", icon: LayoutList, role: 'center' as const, featureName: 'lesson_plans', category: 'Academics' },
  { to: "/lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'center' as const, featureName: 'lesson_tracking', category: 'Academics' },
  { to: "/homework", label: "Homework", icon: Book, role: 'center' as const, featureName: 'homework_management', category: 'Academics' },
  { to: "/tests", label: "Tests", icon: ClipboardCheck, role: 'center' as const, featureName: 'test_management', category: 'Academics' },
  { to: "/activities", label: "Activities", icon: Paintbrush, role: 'center' as const, featureName: 'preschool_activities', category: 'Academics' },
  { to: "/discipline", label: "Discipline", icon: AlertTriangle, role: 'center' as const, featureName: 'discipline_issues', category: 'Academics' },

  // Administration Group
  { to: "/register", label: "Students Registration", icon: UserPlus, role: 'center' as const, featureName: 'register_student', category: 'Administration' },
  { to: "/teachers", label: "Teachers Registration", icon: Users, role: 'center' as const, featureName: 'teacher_management', category: 'Administration' },
  { to: "/teacher-attendance", label: "Teachers' Attendance", icon: UserCheck, role: 'center' as const, featureName: 'teacher_management', category: 'Administration' },
  { to: "/chapter-performance-overview", label: "Chapter Performance", icon: TrendingUp, role: 'center' as const, featureName: 'lesson_tracking', category: 'Administration' },
  { to: "/teacher-performance", label: "Teacher Reports", icon: BarChart3, role: 'center' as const, category: 'Administration' },
  { to: "/settings", label: "Settings", icon: Settings, role: 'center' as const, category: 'Administration' },

  // Reports and Communications Group
  { to: "/ai-insights", label: "AI Insights", icon: Brain, role: 'center' as const, featureName: 'ai_insights', category: 'Reports and Communications' },
  { to: "/records", label: "View Records", icon: FileText, role: 'center' as const, featureName: 'view_records', category: 'Reports and Communications' },
  { to: "/summary", label: "Summary", icon: BarChart3, role: 'center' as const, featureName: 'summary', category: 'Reports and Communications' },
  { to: "/finance", label: "Finance", icon: DollarSign, role: 'center' as const, featureName: 'finance', category: 'Reports and Communications' },
  { to: "/meetings", label: "Meetings", icon: Video, role: 'center' as const, featureName: 'meetings_management', category: 'Reports and Communications' },
  { to: "/messages", label: "Messages", icon: MessageSquare, role: 'center' as const, featureName: 'messaging', category: 'Reports and Communications' },
  { to: "/class-routine", label: "Class Routine", icon: Clock, role: 'center' as const, featureName: 'class_routine', category: 'Reports and Communications' },
  { to: "/calendar", label: "Calendar & Events", icon: CalendarDays, role: 'center' as const, featureName: 'calendar_events', category: 'Reports and Communications' },
  { to: "/attendance-summary", label: "Attendance Summary", icon: Calendar, role: 'center' as const, featureName: 'attendance_summary', category: 'Reports and Communications' },
  { to: "/student-report", label: "Student Report", icon: User, role: 'center' as const, featureName: 'student_report', category: 'Reports and Communications' },
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

      <BottomNav navItems={filteredNavItems} />
    </div>
  );
}
