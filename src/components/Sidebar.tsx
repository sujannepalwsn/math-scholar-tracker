"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AlertTriangle, BookOpen, Brain, ChevronLeft, ChevronRight, ClipboardCheck, Clock, DollarSign, FileText, Home, KeyRound, LayoutList, Menu, MessageSquare, Paintbrush, Settings, Star, User, UserCheck, UserPlus, Users, Video, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import React, { useState } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
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
  const { user } = useAuth();

  const handleCollapseToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  };

  const handleMobileClose = () => {
    onMobileOpenChange?.(false);
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.role && user?.role !== item.role) {
      return false;
    }

    if (item.featureName) {
      if (user?.role === 'center' && user.centerPermissions) {
        return user.centerPermissions[item.featureName];
      }
      if (user?.role === 'teacher' && user.teacherPermissions) {
        return user.teacherPermissions[item.featureName];
      }
    }
    return true;
  });

  // Desktop sidebar
  const desktopSidebar = (
    <TooltipProvider>
      <div
        className={cn(
          "hidden md:flex flex-col h-full border-r transition-all duration-300",
          "bg-card text-card-foreground shadow-soft",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-20 px-4">
          {!isCollapsed && <div className="flex-1 animate-in fade-in slide-in-from-left-4">{headerContent}</div>}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCollapseToggle}
            className="h-8 w-8 hover:bg-muted"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Tooltip key={item.to} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-medium scale-[1.02]"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-[1.02]",
                      isCollapsed ? "justify-center px-0" : ""
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {!isCollapsed && (
                      <span className="flex items-center justify-between w-full">
                        {item.label}
                        {item.unreadCount && item.unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-auto px-2 py-0.5 text-xs">
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
                        <Badge variant="destructive" className="px-2 py-0.5 text-xs">
                          {item.unreadCount}
                        </Badge>
                      )}
                    </span>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto p-4 bg-muted/30">
          {!isCollapsed && <div className="text-sm text-muted-foreground animate-in fade-in">{footerContent}</div>}
          {isCollapsed && (
            <div className="flex justify-center">
              {footerContent}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  // Mobile drawer (appears when opened)
  const mobileSidebar = (
    <div
      className={cn(
        "fixed inset-0 z-40 md:hidden transition-all duration-300",
        isMobileOpen ? "bg-black/60 backdrop-blur-sm" : "pointer-events-none bg-black/0"
      )}
      onClick={handleMobileClose}
    >
      <div
        className={cn(
          "fixed top-0 left-0 h-screen w-72 bg-card text-card-foreground shadow-strong flex flex-col transition-transform duration-500 ease-out z-50",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-20 px-6">
          <div className="flex-1">{headerContent}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMobileClose}
            className="h-10 w-10 rounded-full hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleMobileClose}
                className={cn(
                  "flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="flex items-center justify-between flex-1">
                  {item.label}
                  {item.unreadCount && item.unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-auto px-2 py-0.5 text-xs">
                      {item.unreadCount}
                    </Badge>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
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
