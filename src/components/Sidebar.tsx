"use client";
import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";

import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
  category?: 'Academic Sections' | 'Administration Section' | 'Reporting and Communication Sections';
}

interface SidebarProps {
  navItems: NavItem[];
  headerContent: React.ReactNode;
  footerContent: React.ReactNode;
  onCollapseChange?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export default function Sidebar({
  navItems,
  headerContent,
  footerContent,
  onCollapseChange,
  isMobileOpen = false,
  onMobileOpenChange
}: SidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Academic Sections', 'Administration Section', 'Reporting and Communication Sections']);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleCollapseToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  };

  const handleMobileClose = () => {
    onMobileOpenChange?.(false);
    if (window.history.state?.sidebarOpen) {
      window.history.back();
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.role && user?.role !== item.role) return false;
    if (item.featureName) {
      if (user?.role === 'center' && user.centerPermissions) {
        return user.centerPermissions[item.featureName] !== false;
      }
      if (user?.role === 'teacher' && user.teacherPermissions) {
        return user.teacherPermissions[item.featureName] !== false;
      }
    }
    return true;
  });

  const renderNavLinks = (items: NavItem[], isMobile: boolean) => {
    const renderedItems: React.ReactNode[] = [];
    let currentCategory: string | undefined = undefined;
    let currentCategoryItems: React.ReactNode[] = [];

    const flushCategory = (category: string, children: React.ReactNode[]) => {
      const isExpanded = expandedCategories.includes(category);
      if (isMobile) {
        return (
          <div key={`mob-cat-group-${category}`} className="space-y-0.5">
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 first:mt-0 hover:text-foreground transition-colors"
            >
              {category}
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {isExpanded && children}
          </div>
        );
      } else {
        return (
          <div key={`cat-group-${category}`} className="space-y-0.5">
            {!isCollapsed ? (
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-5 first:mt-0 hover:text-foreground transition-colors"
              >
                {category}
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            ) : (
              <div className="mx-3 border-t border-border my-3 first:hidden" />
            )}
            {(isExpanded || isCollapsed) && children}
          </div>
        );
      }
    };

    items.forEach((item, index) => {
      if (item.category !== currentCategory) {
        if (currentCategory) {
          renderedItems.push(flushCategory(currentCategory, [...currentCategoryItems]));
          currentCategoryItems = [];
        }
        currentCategory = item.category;
      }

      const Icon = item.icon;
      const isActive = location.pathname === item.to;

      const link = isMobile ? (
        <Link
          key={item.to}
          to={item.to}
          onClick={handleMobileClose}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex items-center justify-between flex-1 truncate">
            {item.label}
            {item.unreadCount && item.unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                {item.unreadCount}
              </Badge>
            )}
          </span>
        </Link>
      ) : (
        <Tooltip key={item.to} delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed ? "justify-center px-0" : ""
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <span className="flex items-center justify-between w-full truncate">
                  {item.label}
                  {item.unreadCount && item.unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                      {item.unreadCount}
                    </Badge>
                  )}
                </span>
              )}
            </Link>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <span className="flex items-center gap-2">
                {item.label}
                {item.unreadCount && item.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {item.unreadCount}
                  </Badge>
                )}
              </span>
            </TooltipContent>
          )}
        </Tooltip>
      );

      if (currentCategory) {
        currentCategoryItems.push(link);
      } else {
        renderedItems.push(link);
      }

      if (index === items.length - 1 && currentCategory) {
        renderedItems.push(flushCategory(currentCategory, [...currentCategoryItems]));
      }
    });

    return renderedItems;
  };

  const desktopSidebar = (
    <TooltipProvider>
      <div
        className={cn(
          "fixed top-0 left-0 h-screen z-20 hidden md:flex flex-col border-r print:hidden",
          "bg-card text-card-foreground",
          mounted ? "transition-all duration-200" : "",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!isCollapsed && <div className="flex-1 min-w-0">{headerContent}</div>}
          <Button variant="ghost" size="icon" onClick={handleCollapseToggle} className="h-8 w-8 shrink-0">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {renderNavLinks(filteredNavItems, false)}
        </nav>
        <div className="mt-auto p-4 border-t">
          {!isCollapsed && <div className="text-sm text-muted-foreground">{footerContent}</div>}
          {isCollapsed && <div className="flex justify-center">{footerContent}</div>}
        </div>
      </div>
    </TooltipProvider>
  );

  const mobileSidebar = (
    <div
      className={cn(
        "fixed inset-0 z-40 md:hidden transition-opacity duration-200",
        isMobileOpen ? "bg-foreground/20 backdrop-blur-sm" : "pointer-events-none opacity-0"
      )}
      onClick={handleMobileClose}
    >
      {isMobileOpen && <style>{`body { overflow: hidden; }`}</style>}
      <div
        className={cn(
          "fixed top-0 left-0 h-screen w-72 bg-card text-card-foreground shadow-elevated flex flex-col transition-transform duration-200 ease-out z-50",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex-1 min-w-0">{headerContent}</div>
          <Button variant="ghost" size="icon" onClick={handleMobileClose} className="h-9 w-9 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {renderNavLinks(filteredNavItems, true)}
        </nav>
        <div className="border-t p-4">
          <div className="text-sm text-muted-foreground">{footerContent}</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {desktopSidebar}
      {mobileSidebar}
    </>
  );
}
