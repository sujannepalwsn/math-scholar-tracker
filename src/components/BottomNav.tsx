import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, GraduationCap, Home, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
"use client";


interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  unreadCount?: number;
  category?: 'Academics' | 'Administration' | 'Reports and Communications';
}

interface BottomNavProps {
  navItems: NavItem[];
}

export default function BottomNav({ navItems }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<'Academics' | 'Administration' | 'Reports and Communications' | null>(null);

  const dashboardItem = navItems.find(item => item.label === "Dashboard");
  const academicsItems = navItems.filter(item => item.category === 'Academics');
  const administrationItems = navItems.filter(item => item.category === 'Administration');
  const reportsItems = navItems.filter(item => item.category === 'Reports and Communications');

  const handleMenuToggle = (menu: 'Academics' | 'Administration' | 'Reports and Communications') => {
    if (activeMenu === menu) {
      closeMenu();
    } else {
      setActiveMenu(menu);
      window.history.pushState({ menuOpen: true }, "");
    }
  };

  const closeMenu = () => {
    setActiveMenu(null);
    if (window.history.state?.menuOpen) {
      window.history.back();
    }
  };

  const handleNavigation = (to: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveMenu(null);
    if (window.history.state?.menuOpen) {
      window.history.back();
    }
    setTimeout(() => {
      navigate(to);
    }, 10);
  };

  React.useEffect(() => {
    const handlePopState = () => {
      if (activeMenu) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeMenu]);

  const renderSubMenu = (category: string, items: NavItem[]) => (
    <div
      className={cn(
        "fixed inset-x-0 bottom-16 bg-card border-t shadow-elevated p-4 grid grid-cols-4 gap-3 transition-all duration-200 z-30",
        activeMenu === category ? "translate-y-0 opacity-100" : "translate-y-full pointer-events-none opacity-0"
      )}
    >
      <div className="col-span-4 flex justify-between items-center mb-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{category}</span>
        <button onClick={closeMenu} className="p-1 hover:bg-muted rounded-md transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to;
        return (
          <button
            key={item.to}
            onClick={(e) => handleNavigation(item.to, e)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-all active:scale-95",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium text-center leading-tight truncate w-full">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {renderSubMenu('Academics', academicsItems)}
      {renderSubMenu('Administration', administrationItems)}
      {renderSubMenu('Reports and Communications', reportsItems)}

      <div className="fixed bottom-0 inset-x-0 h-16 bg-card border-t flex items-center justify-between px-2 z-40 md:hidden">
        {dashboardItem && (
          <button
            onClick={(e) => handleNavigation(dashboardItem.to, e)}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[64px] transition-all active:scale-95",
              location.pathname === dashboardItem.to ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
        )}

        {academicsItems.length > 0 && (
          <button
            onClick={() => handleMenuToggle('Academics')}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[64px] transition-all relative active:scale-95",
              activeMenu === 'Academics' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <GraduationCap className="h-5 w-5" />
            <span className="text-[10px] font-medium">Academics</span>
            {academicsItems.some(i => i.unreadCount && i.unreadCount > 0) && (
              <span className="absolute top-0 right-4 h-2 w-2 bg-destructive rounded-full" />
            )}
          </button>
        )}

        {administrationItems.length > 0 && (
          <button
            onClick={() => handleMenuToggle('Administration')}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[64px] transition-all relative active:scale-95",
              activeMenu === 'Administration' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        )}

        {reportsItems.length > 0 && (
          <button
            onClick={() => handleMenuToggle('Reports and Communications')}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[64px] transition-all relative active:scale-95",
              activeMenu === 'Reports and Communications' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[10px] font-medium">Reports</span>
            {reportsItems.some(i => i.unreadCount && i.unreadCount > 0) && (
              <span className="absolute top-0 right-4 h-2 w-2 bg-destructive rounded-full" />
            )}
          </button>
        )}
      </div>

      {activeMenu && (
        <div
          className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-20 md:hidden"
          onClick={closeMenu}
        />
      )}
    </>
  );
}
