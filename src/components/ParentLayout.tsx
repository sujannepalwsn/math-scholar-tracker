import React, { useState } from "react";
import { AlertTriangle, BarChart3, Book, BookOpen, Calendar, DollarSign, GraduationCap, Home, KeyRound, LogOut, MessageSquare, Paintbrush, Plane, Settings, Star, User, Video } from "lucide-react";
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
  unreadCount?: number;
  category?: 'Academics' | 'Administration' | 'Reports and Communications';
}> = [
  { to: "/parent-dashboard", label: "Dashboard", icon: Home, role: 'parent' as const },
  { to: "/parent-lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'parent' as const, category: 'Academics' },
  { to: "/parent-student-report", label: "Academic Report", icon: BarChart3, role: 'parent' as const, category: 'Academics' },
  { to: "/parent-results", label: "Exam Results", icon: GraduationCap, role: 'parent' as const, category: 'Academics' },
  { to: "/parent-homework", label: "Homework", icon: Book, role: 'parent' as const, category: 'Academics' },
  { to: "/parent-activities", label: "Activities", icon: Paintbrush, role: 'parent' as const, category: 'Academics' },
  { to: "/parent-discipline", label: "Discipline", icon: AlertTriangle, role: 'parent' as const, category: 'Academics' },
  { to: "/parent-finance", label: "Finance", icon: DollarSign, role: 'parent' as const, category: 'Reports and Communications' },
  { to: "/parent-meetings", label: "Meetings", icon: Video, role: 'parent' as const, category: 'Reports and Communications' },
  { to: "/parent-messages", label: "Messages", icon: MessageSquare, role: 'parent' as const, category: 'Reports and Communications' },
  { to: "/parent-chapter-rating", label: "Chapter Rating", icon: Star, role: 'parent' as const, category: 'Reports and Communications' },
  { to: "/parent-calendar", label: "Calendar", icon: Calendar, role: 'parent' as const, category: 'Reports and Communications' },
  { to: "/parent-leave", label: "Leave Applications", icon: Plane, role: 'parent' as const, category: 'Reports and Communications' },
  { to: "/parent-settings", label: "Settings", icon: Settings, role: 'parent' as const, category: 'Administration' },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login-parent');
  };

  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages-parent", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('parent_user_id', user.id)
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
    enabled: !!user?.id,
    refetchInterval: 10000 });

  const updatedNavItems = navItems.map(item =>
    item.to === "/parent-messages" ? { ...item, unreadCount: unreadMessageCount } : item
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

      <BottomNav navItems={updatedNavItems} />
    </div>
  );
}
