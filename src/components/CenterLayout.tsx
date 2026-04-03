import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { AlertTriangle, Archive, Award, BarChart3, Bell, Book, BookOpen, Sparkles, Bus, Calendar, CalendarDays, CheckSquare, ClipboardCheck, Clock, CreditCard, DollarSign, FileText, GraduationCap, Home, IdCard, KeyRound, LayoutList, LogOut, Menu, MessageSquare, Paintbrush, PenTool, Plane, Settings, Star, TrendingUp, User, UserCheck, UserPlus, Users, Video } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
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
import { logger } from "@/utils/logger";
import { addDays, differenceInDays } from "date-fns";

const staticNavItems = DEFAULT_NAV_ITEMS.filter(it => it.role === UserRole.CENTER);

export default function CenterLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
  let updatedNavItems = centerDynamicItems.length > 1
    ? centerDynamicItems.map(it => {
        const cat = dynamicCategories.find(c => c.id === it.category_id);
        return {
          to: it.route,
          label: it.name,
          icon: getIcon(it.icon),
          role: it.role as any,
          featureName: it.feature_name,
          feature_name: it.feature_name,
          category: cat?.name,
          unreadCount: it.route === "/messages" ? unreadMessageCount : undefined,
          is_active: it.is_active
        };
      })
    : staticNavItems.map(item => ({
        to: item.route,
        label: item.name,
        icon: getIcon(item.icon),
        role: item.role as any,
        featureName: item.feature_name,
        feature_name: item.feature_name,
        category: item.category as any,
        unreadCount: item.route === "/messages" ? unreadMessageCount : undefined
      }));

  // Ensure mandatory items from defaults are always present (fixing issue for existing customized navigation)
  React.useEffect(() => {
    if (centerDynamicItems.length > 1) {
      const hasMissing = staticNavItems.some(
        staticItem => !centerDynamicItems.some(it => it.route === staticItem.route)
      );
      if (hasMissing) {
        logger.debug("CenterLayout: Detected missing navigation items, syncing...");
        syncMissingItems.mutate();
      }
    }
  }, [centerDynamicItems.length, staticNavItems.length]);

  if (centerDynamicItems.length > 1) {
    const missingItems = staticNavItems.filter(
      staticItem => !centerDynamicItems.some(it => it.route === staticItem.route)
    );

    if (missingItems.length > 0) {
      const additionalItems = missingItems.map(item => ({
        to: item.route,
        label: item.name,
        icon: getIcon(item.icon),
        role: item.role as any,
        featureName: item.feature_name,
        feature_name: item.feature_name,
        category: item.category as any,
        unreadCount: item.route === "/messages" ? unreadMessageCount : undefined
      }));
      updatedNavItems = [...updatedNavItems, ...additionalItems];
    }
  }

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
