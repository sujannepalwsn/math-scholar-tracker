import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, DollarSign, Home, KeyRound, LogOut, Menu, MessageSquare, Paintbrush, Star, User, Video } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Sidebar from "./Sidebar";
import CenterLogo from "./CenterLogo";

const navItems: Array<{
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  unreadCount?: number;
}> = [
  { to: "/parent-dashboard", label: "Dashboard", icon: Home, role: 'parent' as const },
  { to: "/parent-finance", label: "Finance", icon: DollarSign, role: 'parent' as const },
  { to: "/parent-homework", label: "Homework", icon: Book, role: 'parent' as const },
  { to: "/parent-activities", label: "Activities", icon: Paintbrush, role: 'parent' as const },
  { to: "/parent-discipline", label: "Discipline", icon: AlertTriangle, role: 'parent' as const },
  { to: "/parent-meetings", label: "Meetings", icon: Video, role: 'parent' as const },
  { to: "/parent-messages", label: "Messages", icon: MessageSquare, role: 'parent' as const },
  { to: "/parent-chapter-rating", label: "Chapter Rating", icon: Star, role: 'parent' as const },
  { to: "/parent-lesson-tracking", label: "Lesson Tracking", icon: BookOpen, role: 'parent' as const },
  { to: "/parent-calendar", label: "Calendar", icon: Calendar, role: 'parent' as const },
  { to: "/change-password", label: "Change Password", icon: KeyRound, role: 'parent' as const },
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
    refetchInterval: 10000,
  });

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
        <span className="text-muted-foreground">{user?.username}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="fixed top-0 left-0 h-screen z-10 hidden md:block">
        <Sidebar
          navItems={updatedNavItems}
          headerContent={headerContent}
          footerContent={footerContent}
          onCollapseChange={setSidebarCollapsed}
          isMobileOpen={mobileMenuOpen}
          onMobileOpenChange={setMobileMenuOpen}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        navItems={updatedNavItems}
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
