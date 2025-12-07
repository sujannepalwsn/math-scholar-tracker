import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, DollarSign, LogOut, User, Book, Paintbrush, AlertTriangle, KeyRound, Video, MessageSquare, Star, BookOpen, Calendar } from "lucide-react";
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
  unreadCount?: number; // Added unreadCount
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

  const handleLogout = () => {
    logout();
    navigate('/login-parent');
  };

  // Fetch unread message count for parent
  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages-parent", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('parent_user_id', user.id)
        .maybeSingle();
      
      if (convError || !conversation) {
        // console.log("No conversation found for parent:", user.id, convError);
        return 0;
      }

      const { count, error } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', conversation.id)
        .eq('is_read', false)
        .neq('sender_user_id', user.id); // Messages NOT sent by the current parent user
      if (error) {
        console.error("Error fetching unread messages for parent:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const updatedNavItems = navItems.map(item => 
    item.to === "/parent-messages" ? { ...item, unreadCount: unreadMessageCount } : item
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <div className="fixed top-0 left-0 h-screen z-10">
        <Sidebar
          navItems={updatedNavItems}
          headerContent={headerContent}
          footerContent={footerContent}
        />
      </div>

      {/* Main Content - Scrollable */}
      <main className="flex-1 p-6 overflow-y-auto h-screen ml-64">
        {children}
      </main>
    </div>
  );
}