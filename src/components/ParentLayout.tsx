import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { AlertTriangle, Archive, Award, BarChart3, Book, BookOpen, Sparkles, Bus, Calendar, CalendarDays, CheckSquare, ClipboardCheck, Clock, DollarSign, FileText, GraduationCap, Home, IdCard, KeyRound, LayoutList, LogOut, Menu, MessageSquare, Paintbrush, PenTool, Plane, Settings, Star, TrendingUp, User, UserCheck, UserPlus, Users, Video } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import CenterLogo from "./CenterLogo";
import NotificationBell from "./NotificationBell";
import SchoolBranding from "./dashboard/SchoolBranding";
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useDynamicNavigation } from "@/hooks/useDynamicNavigation";
import { DEFAULT_NAV_ITEMS } from "@/lib/navigation-defaults";

const staticNavItems = DEFAULT_NAV_ITEMS.filter(it => it.role === UserRole.PARENT);

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const { dynamicCategories, dynamicItems, getIcon, syncDefaults, syncMissingItems } = useDynamicNavigation();

  const queryClient = useQueryClient();
  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages-parent", user?.id, user?.center_id],
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
    enabled: !!user?.id && !!user?.center_id
  });

  // Supabase Realtime for unread messages
  React.useEffect(() => {
    if (!user?.id || !user?.center_id) return;

    const channel = supabase
      .channel('parent-messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-messages-parent", user?.id, user?.center_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.center_id, queryClient]);

  const parentDynamicItems = dynamicItems.filter(it => it.role === UserRole.PARENT);

  // Combine dynamic items and missing static items
  const combinedItems = React.useMemo(() => {
    const items = [...parentDynamicItems];

    staticNavItems.forEach(staticItem => {
      if (!items.some(it => it.route === staticItem.route)) {
        items.push({
          id: `static-${staticItem.route}`,
          route: staticItem.route,
          name: staticItem.name,
          icon: staticItem.icon,
          role: staticItem.role,
          feature_name: staticItem.feature_name,
          is_active: true,
          category_id: null,
          category_name: staticItem.category // Temporary for mapping
        } as any);
      }
    });

    return items;
  }, [parentDynamicItems]);

  const updatedNavItems = React.useMemo(() => {
    return combinedItems.map(it => {
      const cat = dynamicCategories.find(c => c.id === it.category_id) ||
                  dynamicCategories.find(c => c.name === (it as any).category_name);

      return {
        to: it.route,
        label: it.name,
        icon: getIcon(it.icon),
        role: it.role as any,
        featureName: it.feature_name,
        feature_name: it.feature_name,
        category: cat?.name,
        unreadCount: it.route === "/parent-messages" ? unreadMessageCount : undefined,
        is_active: it.is_active
      };
    });
  }, [combinedItems, dynamicCategories, getIcon, unreadMessageCount]);


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

      {/* Mobile Header - Optimized for narrow screens */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-[50px] bg-white/90 backdrop-blur-xl border-b z-40 flex items-center justify-between px-2 sm:px-4 shadow-sm">
        <div className="flex items-center shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/5 text-primary">
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 min-w-0 px-2 flex justify-center overflow-hidden">
          <SchoolBranding className="max-w-full" isMobileCompact={true} />
        </div>

        <div className="flex items-center shrink-0">
          <NotificationBell />
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto mesh-gradient transition-all duration-300",
        "md:h-screen",
        "pt-14 md:pt-0",
        "px-4 pb-20 md:p-6 lg:p-8",
        sidebarCollapsed ? "md:ml-24" : "md:ml-72"
      )}>
        {/* Navigation spacer for mobile fixed header */}
        <div className="md:hidden h-4" />

        {/* Desktop Header Overlay with Branding - Premium Glass Design */}
        <div className="hidden md:flex sticky top-4 left-0 right-0 h-[76px] glass-surface z-30 items-center justify-between px-8 mb-8 rounded-[2.5rem] shadow-glass mx-auto max-w-7xl border border-white/40">
          <SchoolBranding />
          <div className="flex items-center gap-6 pr-4">
             <div className="h-10 w-[1px] bg-black/5" />
             <NotificationBell />
             <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-soft">
                <User className="h-5 w-5 text-primary" />
             </div>
          </div>
        </div>

        <div className="page-enter max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <BottomNav navItems={updatedNavItems} />
    </div>
  );
}
