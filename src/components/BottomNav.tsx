"use client";
import React, { useMemo } from "react";
import { Home, Users, BarChart3, Receipt, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext";
import { getDashboardPath, hasPermission } from "@/utils/permissions"
import { UserRole } from "@/types/roles";
import { hapticFeedback } from "@/utils/haptic-feedback";

export default function BottomNav({ navItems }: { navItems?: any[] }) {
  const { user } = useAuth();
  const { userPreferences } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPath = useMemo(() => getDashboardPath(user?.role), [user?.role]);

  const mobileNavItems = useMemo(() => {
    const items = [
      { to: dashboardPath, label: "Home", icon: Home, feature: 'dashboard_access' },
      {
        to: user?.role === UserRole.PARENT ? "/parent/attendance" : "/attendance",
        label: "Attendance",
        icon: Users,
        feature: 'take_attendance'
      },
      {
        to: user?.role === UserRole.PARENT ? "/parent/performance" : "/student-report",
        label: "Reports",
        icon: BarChart3,
        feature: 'student_report'
      },
      {
        to: user?.role === UserRole.PARENT ? "/parent/finance" : "/finance",
        label: "Finance",
        icon: Receipt,
        feature: 'finance_management'
      },
      {
        to: user?.role === UserRole.ADMIN ? "/admin/settings" : "/settings",
        label: "Profile",
        icon: User,
        feature: 'settings_access'
      },
    ];

    return items.filter(item => {
      if (item.label === 'Home' || item.label === 'Profile') return true;
      return hasPermission(user, item.feature, item.to);
    });
  }, [dashboardPath, user]);

  if (userPreferences.modernMobileUI) {
    return (
      <div className="fixed bottom-[max(1.5rem,var(--safe-area-inset-bottom))] inset-x-6 h-[72px] bg-white/90 backdrop-blur-lg border border-white/20 flex items-center justify-between px-6 z-40 md:hidden rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.label === 'Home' && location.pathname.includes('dashboard'));

          return (
            <button
              key={item.label}
              onClick={() => {
                hapticFeedback.light();
                navigate(item.to);
              }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-90 relative",
                isActive ? "text-blue-600" : "text-slate-400"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                isActive ? "bg-blue-50" : ""
              )}>
                <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              </div>
              <span className={cn(
                "text-[9px] font-bold tracking-tight uppercase",
                isActive ? "text-blue-600" : "text-slate-400"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Legacy Classic UI
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[calc(4rem+var(--safe-area-inset-bottom))] bg-background border-t flex items-center justify-around z-40 md:hidden pb-safe">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to || (item.label === 'Home' && location.pathname.includes('dashboard'));

        return (
          <button
            key={item.label}
            onClick={() => {
              hapticFeedback.light();
              navigate(item.to);
            }}
            className={cn(
              "flex flex-col items-center gap-1",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
