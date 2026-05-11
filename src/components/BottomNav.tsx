"use client";
import React, { useMemo } from "react";
import { Home, Check, TrendingUp, DollarSign, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext";
import { getDashboardPath, hasPermission } from "@/utils/permissions"
import { UserRole } from "@/types/roles";

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
        icon: Check,
        feature: 'take_attendance'
      },
      {
        to: user?.role === UserRole.PARENT ? "/parent/performance" : "/student-report",
        label: "Reports",
        icon: TrendingUp,
        feature: 'student_report'
      },
      {
        to: user?.role === UserRole.PARENT ? "/parent/finance" : "/finance",
        label: "Finance",
        icon: DollarSign,
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
      <div className="fixed bottom-0 left-0 right-0 h-[80px] bg-slate-100/95 backdrop-blur-lg border-t border-slate-200 flex items-center justify-between px-6 z-40 md:hidden pb-4">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.label === 'Home' && location.pathname.includes('dashboard'));

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.to)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-90 relative px-2",
                isActive ? "text-slate-900" : "text-slate-500"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              <span className={cn(
                "text-[10px] font-bold tracking-tight",
                isActive ? "text-slate-900" : "text-slate-500"
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
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around z-40 md:hidden">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to || (item.label === 'Home' && location.pathname.includes('dashboard'));

        return (
          <button
            key={item.label}
            onClick={() => navigate(item.to)}
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
