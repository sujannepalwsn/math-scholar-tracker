import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { LogOut, User } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile";
import MobileModuleLauncher from "./MobileModuleLauncher";
import MobileHeader from "./MobileHeader";
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import SchoolBranding from "./dashboard/SchoolBranding";
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useDynamicNavigation } from "@/hooks/useDynamicNavigation";
import { DEFAULT_NAV_ITEMS } from "@/lib/navigation-defaults";

const staticNavItems = DEFAULT_NAV_ITEMS.filter(it => it.role === UserRole.PARENT);

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  const combinedItems = React.useMemo(() => {
    const items = parentDynamicItems.length > 0 ? [...parentDynamicItems] : [...staticNavItems];

    if (parentDynamicItems.length > 0) {
      staticNavItems.forEach(staticItem => {
        if (!items.some(it => it.route === staticItem.route)) {
          items.push({
            ...staticItem,
            id: `static-${staticItem.route}`,
            feature_name: staticItem.feature_name,
            is_active: true,
            category_id: null,
            category_name: staticItem.category
          } as any);
        }
      });
    } else {
       return staticNavItems.map(si => ({
          ...si,
          category_name: si.category
       }));
    }

    return items;
  }, [parentDynamicItems]);

  const updatedNavItems = React.useMemo(() => {
    const processedItems = combinedItems.map(it => {
      const cat = dynamicCategories.find(c => c.id === it.category_id) ||
                  ((it as any).category_name ? { name: (it as any).category_name } : null);

      let route = it.route;
      if (it.name === "Dashboard" || route === "/" || route?.includes('dashboard')) {
        route = "/parent-dashboard";
      }

      return {
        to: route,
        label: it.name,
        icon: getIcon(it.icon),
        role: it.role as any,
        featureName: it.feature_name,
        feature_name: it.feature_name,
        category: cat?.name,
        unreadCount: it.route === "/parent-messages" ? unreadMessageCount : undefined,
        is_active: (it as any).is_active !== false
      };
    });

    const uniqueItemsMap = new Map();
    processedItems.forEach(item => {
      if (!uniqueItemsMap.has(item.to)) {
        uniqueItemsMap.set(item.to, item);
      }
    });

    return Array.from(uniqueItemsMap.values());
  }, [combinedItems, dynamicCategories, getIcon, unreadMessageCount]);


  const headerContent = (
    <SchoolBranding />
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

  const isLauncherPath = location.pathname === "/parent-dashboard" && !searchParams.get("show_stats");
  const currentPageItem = updatedNavItems.find(item => item.to === location.pathname);

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      {!isMobile && (
        <Sidebar
          navItems={updatedNavItems}
          headerContent={headerContent}
          footerContent={footerContent}
          onCollapseChange={setSidebarCollapsed}
          isMobileOpen={mobileMenuOpen}
          onMobileOpenChange={setMobileMenuOpen}
        />
      )}

      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader
          showBackButton={true}
          onLogout={handleLogout}
          isLauncher={isLauncherPath}
          title={currentPageItem?.label}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-y-auto transition-all duration-300 bg-white overflow-x-hidden",
        "md:h-screen",
        isMobile ? "pt-[calc(70px+var(--safe-area-inset-top))]" : "pt-0",
        isMobile ? "px-0 pb-[calc(80px+var(--safe-area-inset-bottom))]" : "px-4 pb-20 md:p-6 lg:p-8",
        !isMobile && (sidebarCollapsed ? "md:ml-24" : "md:ml-72")
      )}>
        {/* Navigation spacer for mobile fixed header */}
        <div className="md:hidden h-4" />

        {/* Desktop Header Overlay */}
        <div className="hidden md:flex sticky top-4 left-0 right-0 h-[76px] glass-surface z-30 items-center justify-between px-8 mb-8 rounded-[2.5rem] shadow-glass mx-auto max-w-7xl border border-white/40">
          <SchoolBranding />
          <div className="flex items-center gap-6 pr-4">
             <div className="h-10 w-[1px] bg-black/5" />
             <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-white shadow-soft overflow-hidden">
                <img src={user?.photo_url || ""} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <User className="h-5 w-5 text-primary" />
             </div>
          </div>
        </div>

        <div className="page-enter max-w-7xl mx-auto">
          {isMobile && isLauncherPath ? (
            <MobileModuleLauncher navItems={updatedNavItems} />
          ) : (
            <div className={cn(isMobile ? "px-4 py-4" : "")}>
              {children}
            </div>
          )}
        </div>
      </main>

      <BottomNav navItems={updatedNavItems} />
    </div>
  );
}
