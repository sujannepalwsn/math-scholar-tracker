import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { AlertTriangle, LogOut, User } from "lucide-react";
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
import { logger } from "@/utils/logger";
import { addDays, differenceInDays } from "date-fns";

const staticNavItems = DEFAULT_NAV_ITEMS.filter(it => it.role === UserRole.CENTER);

export default function CenterLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { dynamicCategories, dynamicItems, getIcon, syncMissingItems } = useDynamicNavigation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const queryClient = useQueryClient();
  const { data: currentSub } = useQuery({
    queryKey: ["center-active-subscription", user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_subscriptions")
        .select("*, subscription_plans(name)")
        .eq("center_id", user?.center_id)
        .eq("status", "Active")
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.center_id,
  });

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
    enabled: !!user?.id && !!user?.center_id
  });

  // Supabase Realtime for unread messages
  React.useEffect(() => {
    if (!user?.id || !user?.center_id) return;

    const channel = supabase
      .channel('center-messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-messages-center", user?.id, user?.center_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.center_id, queryClient]);

  const centerDynamicItems = dynamicItems.filter(it => it.role === UserRole.CENTER);

  const updatedNavItems = React.useMemo(() => {
    const items = centerDynamicItems.length > 0 ? [...centerDynamicItems] : [...staticNavItems];

    if (centerDynamicItems.length > 0) {
      staticNavItems.forEach(staticItem => {
        if (!items.some(it => it.route === staticItem.route)) {
          items.push({
            ...staticItem,
            id: `static-${staticItem.route}`,
            feature_name: staticItem.feature_name,
            is_active: true,
            category_id: null
          } as any);
        }
      });
    }

    const processedItems = items.map(it => {
      const cat = dynamicCategories.find(c => c.id === it.category_id) ||
                  ((it as any).category ? { name: (it as any).category } : null);

      let route = it.route;
      if (it.name === "Dashboard" || route === "/" || route?.includes("dashboard")) {
        route = "/center-dashboard";
      }

      return {
        to: route,
        label: it.name,
        icon: getIcon(it.icon),
        role: it.role as any,
        featureName: it.feature_name,
        feature_name: it.feature_name,
        category: cat?.name,
        unreadCount: it.route === "/messages" ? unreadMessageCount : undefined,
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
  }, [centerDynamicItems, staticNavItems, dynamicCategories, getIcon, unreadMessageCount]);

  React.useEffect(() => {
    if (centerDynamicItems.length > 0) {
      const hasMissing = staticNavItems.some(
        staticItem => !centerDynamicItems.some(it => it.route === staticItem.route)
      );
      if (hasMissing) {
        logger.debug("CenterLayout: Detected missing navigation items, syncing...");
        syncMissingItems.mutate();
      }
    }
  }, [centerDynamicItems.length, staticNavItems.length]);

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

  const isLauncherPath = location.pathname === "/center-dashboard" && !searchParams.get("show_stats");
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
        "flex-1 overflow-y-auto mesh-gradient transition-all duration-300",
        "md:h-screen",
        isMobile ? "pt-[70px]" : "pt-0",
        isMobile ? "px-0 pb-[80px]" : "px-4 pb-20 md:p-6 lg:p-8",
        !isMobile && (sidebarCollapsed ? "md:ml-24" : "md:ml-72")
      )}>
        {/* Subscription Alert */}
        {currentSub && user?.role === UserRole.CENTER && (
          (() => {
            const expiryDate = addDays(new Date(currentSub.start_date), currentSub.subscription_days || 30);
            const daysLeft = differenceInDays(expiryDate, new Date());

            if (daysLeft <= 7) {
              return (
                <div className={cn(
                  "sticky top-0 z-50 px-4 py-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest",
                  daysLeft <= 0 ? "bg-rose-600 text-white" : "bg-amber-400 text-amber-950"
                )}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>
                      {daysLeft <= 0
                        ? `Institutional access expired on ${expiryDate.toLocaleDateString()}. Renew immediately to prevent service interruption.`
                        : `Institutional subscription expires in ${daysLeft} days. Please renew your plan.`
                      }
                    </span>
                  </div>
                  <Button
                    variant="link"
                    onClick={() => navigate('/settings?tab=subscription')}
                    className="h-auto p-0 text-[10px] font-black uppercase text-inherit underline underline-offset-2"
                  >
                    Renew Now
                  </Button>
                </div>
              );
            }
            return null;
          })()
        )}

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
