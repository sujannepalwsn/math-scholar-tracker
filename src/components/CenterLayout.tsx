import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, UserPlus, CheckSquare, FileText, BarChart3, BookOpen, ClipboardCheck, User, Brain, LogOut, Shield, Calendar, DollarSign, LayoutList, Book, Paintbrush, AlertTriangle, Users, UserCheck, KeyRound, Video, MessageSquare, Clock, TrendingUp, Settings, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Sidebar from "./Sidebar";
import CenterLogo from "./CenterLogo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
}> = [
  { to: "/", label: "Dashboard", icon: Home, role: 'center' as const },
  { to: "/register", label: "Register Student", icon: UserPlus, role: 'center' as const, featureName: 'register_student' },
  { to: "/attendance", label: "Take Attendance", icon: CheckSquare, role: 'center' as const, featureName: 'take_attendance' },
  { to: "/attendance-summary", label: "Attendance Summary", icon: Calendar, role: 'center' as const, featureName: 'attendance_summary' },
  { to: "/lesson-plans", label: "Lesson Plans", icon: LayoutList, role: 'center' as const, featureName: 'lesson_plans' },
  { to: "/lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'center' as const, featureName: 'lesson_tracking' },
  { to: "/homework", label: "Homework", icon: Book, role: 'center' as const, featureName: 'homework' },
  { to: "/activities", label: "Activities", icon: Paintbrush, role: 'center' as const, featureName: 'activities' },
  { to: "/discipline", label: "Discipline", icon: AlertTriangle, role: 'center' as const, featureName: 'discipline' },
  { to: "/teachers", label: "Teachers", icon: Users, role: 'center' as const, featureName: 'teachers' },
  { to: "/teacher-attendance", label: "Teacher Attendance", icon: UserCheck, role: 'center' as const, featureName: 'teacher_attendance' },
  { to: "/tests", label: "Tests", icon: ClipboardCheck, role: 'center' as const, featureName: 'tests' },
  { to: "/student-report", label: "Student Report", icon: User, role: 'center' as const, featureName: 'student_report' },
  { to: "/chapter-performance-overview", label: "Chapter Performance", icon: TrendingUp, role: 'center' as const, featureName: 'lesson_tracking' },
  { to: "/ai-insights", label: "AI Insights", icon: Brain, role: 'center' as const, featureName: 'ai_insights' },
  { to: "/records", label: "View Records", icon: FileText, role: 'center' as const, featureName: 'view_records' },
  { to: "/summary", label: "Summary", icon: BarChart3, role: 'center' as const, featureName: 'summary' },
  { to: "/finance", label: "Finance", icon: DollarSign, role: 'center' as const, featureName: 'finance' },
  { to: "/meetings", label: "Meetings", icon: Video, role: 'center' as const, featureName: 'meetings_management' },
  { to: "/messages", label: "Messages", icon: MessageSquare, role: 'center' as const },
  { to: "/class-routine", label: "Class Routine", icon: Clock, role: 'center' as const },
  { to: "/calendar", label: "Calendar & Events", icon: CalendarDays, role: 'center' as const },
  { to: "/settings", label: "Settings", icon: Settings, role: 'center' as const },
  { to: "/change-password", label: "Change Password", icon: KeyRound, role: 'center' as const },
];

export default function CenterLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch unread message count for center
  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages-center", user?.id, user?.center_id],
    queryFn: async () => {
      if (!user?.id || !user?.center_id) return 0;
      const { data: conversations, error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('center_id', user.center_id);
      if (convError) {
        console.error("Error fetching center conversations:", convError);
        return 0;
      }
      const conversationIds = conversations.map(c => c.id);
      if (conversationIds.length === 0) return 0;

      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_user_id', user.id); // Messages NOT sent by the current center user
      if (error) {
        console.error("Error fetching unread messages for center:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user?.id && !!user?.center_id,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const updatedNavItems = navItems.map(item => 
    item.to === "/messages" ? { ...item, unreadCount: unreadMessageCount } : item
  );

  const headerContent = (
    <CenterLogo size="md" showName={true} />
  );

  const footerContent = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{user?.username}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  // Filter nav items based on center's permissions
  const filteredNavItems = updatedNavItems.filter(item => {
    if (item.featureName && user?.centerPermissions) {
      return user.centerPermissions[item.featureName] !== false;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <div className="sticky top-0 h-screen">
        <Sidebar
          navItems={filteredNavItems}
          headerContent={headerContent}
          footerContent={footerContent}
        />
      </div>

      {/* Main Content - Scrollable */}
      <main className="flex-1 p-6 overflow-y-auto h-screen">
        {children}
      </main>
    </div>
  );
}