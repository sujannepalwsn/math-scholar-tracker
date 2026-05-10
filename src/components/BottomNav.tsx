"use client";
import React, { useMemo } from "react";
import { Home, Users, BookOpen, Bell, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { getDashboardPath, hasPermission } from "@/utils/permissions"
import { UserRole } from "@/types/roles";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface BottomNavProps {
  navItems: any[];
}

export default function BottomNav({ navItems }: BottomNavProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPath = useMemo(() => getDashboardPath(user?.role), [user?.role]);

  const mobileNavItems = useMemo(() => {
    // Standardized items as per the image, but now checking permissions
    const items = [
      { to: dashboardPath, label: "Home", icon: Home, feature: 'dashboard_access' },
      {
        to: user?.role === UserRole.PARENT ? "/parent/attendance" : "/attendance",
        label: "Attendance",
        icon: Users,
        feature: 'take_attendance'
      },
      {
        to: user?.role === UserRole.PARENT ? "/parent/routine" : "/class-routine",
        label: "Classes",
        icon: BookOpen,
        feature: 'class_routine'
      },
      { to: "/notifications", label: "Notifications", icon: Bell, feature: 'messaging' },
      {
        to: user?.role === UserRole.ADMIN ? "/admin/settings" : "/settings",
        label: "Profile",
        icon: User,
        feature: 'settings_access'
      },
    ];

    // Profile and Home are usually safe, but let's check others
    return items.filter(item => {
      if (item.label === 'Home') return true;
      if (item.label === 'Notifications') return true; // Always allow notifications view
      if (item.label === 'Profile') return true; // Always allow profile/settings view

      return hasPermission(user, item.feature, item.to);
    });
  }, [dashboardPath, user]);

  return (
    <div className="fixed bottom-0 inset-x-0 h-[80px] bg-white border-t border-slate-100 flex items-center justify-between px-6 z-40 md:hidden pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to || (item.label === 'Home' && location.pathname.includes('dashboard'));

        return (
          <button
            key={item.label}
            onClick={() => navigate(item.to)}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all active:scale-90",
              isActive ? "text-primary" : "text-slate-400"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-2xl transition-all",
              isActive ? "bg-primary/10" : ""
            )}>
              <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
            </div>
            <span className={cn(
              "text-[10px] font-bold tracking-tight",
              isActive ? "text-primary" : "text-slate-500"
            )}>
              {item.label}
            </span>
            {isActive && <div className="h-1 w-1 rounded-full bg-primary absolute -bottom-1" />}
          </button>
        );
      })}
    </div>
  );
}
