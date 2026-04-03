"use client";
import React, { useEffect, useState } from "react";
import { UserRole } from "@/types/roles";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X, Settings, GripVertical, Trash2, RefreshCcw, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/utils/logger";

import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useDynamicNavigation } from "@/hooks/useDynamicNavigation";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { hasPermission } from "@/utils/permissions";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
  category?: 'Academics' | 'Administration' | 'Reports and Communication' | 'More';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [draggedItem, setDraggedItem] = useState<{ type: 'category' | 'item', id: string, role?: string } | null>(null);

  const {
    dynamicCategories,
    dynamicItems,
    getIcon,
    updateCategoryName,
    deleteCategory,
    updateOrders,
    toggleItemActive,
    syncDefaults
  } = useDynamicNavigation();

  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'Academics',
    'Administration',
    'Reports and Communication',
    'More'
  ]);

  // Ensure categories are expanded when they change or for specific roles
  useEffect(() => {
    if (user?.role === UserRole.PARENT) {
      setExpandedCategories(['Academics', 'Administration', 'Reports and Communication', 'More']);
    }
  }, [user?.role]);
  const [mounted, setMounted] = useState(false);
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isDemoSession = user?.username === 'demo@eduflow.com' || user?.username === 'demo';

  const switchRole = (role: UserRole) => {
    if (!user) return;
    const updatedUser = { ...user, role };
    setUser(updatedUser);
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));

    // Redirect to the appropriate dashboard
    if (role === UserRole.ADMIN) navigate('/admin-dashboard');
    else if (role === UserRole.CENTER) navigate('/center-dashboard');
    else if (role === UserRole.TEACHER) navigate('/teacher-dashboard');
    else if (role === UserRole.PARENT) navigate('/parent-dashboard');
  };

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

  const handleDragStart = (e: React.DragEvent, type: 'category' | 'item', id: string, role?: string) => {
    if (!isEditMode) return;
    setDraggedItem({ type, id, role });
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetType: 'category' | 'item', targetId: string, targetCategoryName?: string) => {
    if (!isEditMode || !draggedItem) return;
    e.preventDefault();

    const role = draggedItem.role || user?.role;
    const itemsForRole = dynamicItems.filter(it => it.role === role);

    if (draggedItem.type === 'category' && targetType === 'category') {
      const newCategories = [...dynamicCategories];
      const draggedIdx = newCategories.findIndex(c => c.id === draggedItem.id);
      const targetIdx = newCategories.findIndex(c => c.id === targetId);
      const [removed] = newCategories.splice(draggedIdx, 1);
      newCategories.splice(targetIdx, 0, removed);
      updateOrders.mutate({
        type: 'categories',
        updates: newCategories.map((c, i) => ({ id: c.id, order: i, name: c.name, center_id: user?.center_id }))
      });
    } else if (draggedItem.type === 'item') {
      const draggedItemObj = dynamicItems.find(it => it.id === draggedItem.id);
      if (!draggedItemObj) return;

      if (targetType === 'category') {
        updateOrders.mutate({
          type: 'items',
          updates: [{ ...draggedItemObj, category_id: targetId }]
        });
      } else if (targetType === 'item') {
        const targetItem = dynamicItems.find(it => it.id === targetId);
        if (!targetItem) return;

        const newItems = [...itemsForRole];
        const draggedIdx = newItems.findIndex(it => it.id === draggedItem.id);
        const targetIdx = newItems.findIndex(it => it.id === targetId);
        const [removed] = newItems.splice(draggedIdx, 1);
        removed.category_id = targetItem.category_id;
        newItems.splice(targetIdx, 0, removed);

        updateOrders.mutate({
          type: 'items',
          updates: newItems.map((it, i) => ({
            id: it.id,
            order: i,
            category_id: it.category_id,
            center_id: user?.center_id,
            name: it.name,
            route: it.route
          }))
        });
      }
    }
    setDraggedItem(null);
  };

  const filteredNavItems = navItems.filter(item => {
    try {
      if ((item as any).is_active === false && !isEditMode) return false;

      const featureKey = item.featureName || (item as any).feature_name;
      // Sidebar relies on the centralized hasPermission logic for visibility filtering.
      return hasPermission(user, featureKey || 'unknown', item.to);
    } catch (err) {
      logger.error("Error filtering nav item:", item, err);
      return false;
    }
  });

  const renderNavLinks = (items: NavItem[], isMobile: boolean) => {
    if (items.length === 0) return null;

    // Ensure "Dashboard" is always first, then sort by category
    const sortedItems = [...items].filter(it => it.to).sort((a, b) => {
      const isDashboardA = a.to?.includes('dashboard') || a.to === '/';
      const isDashboardB = b.to?.includes('dashboard') || b.to === '/';

      if (isDashboardA && !isDashboardB) return -1;
      if (!isDashboardA && isDashboardB) return 1;

      const catA = a.category || "Uncategorized";
      const catB = b.category || "Uncategorized";
      if (catA === catB) return 0;
      return catA > catB ? 1 : -1;
    });

    const renderedItems: React.ReactNode[] = [];

    // Separate items into categorized and uncategorized
    const uncategorizedItems = sortedItems.filter(it => !it.category && !(it.to?.includes('dashboard') || it.to === '/'));
    const dashboardItems = sortedItems.filter(it => it.to?.includes('dashboard') || it.to === '/');
    const categorizedItems = sortedItems.filter(it => it.category);

    const flushCategory = (category: string, children: React.ReactNode[]) => {
      if (!children || children.length === 0) return null;
      const isExpanded = expandedCategories.includes(category);
      const catObj = dynamicCategories.find(c => c.name === category);

      const categoryHeader = (
        <div
          className="flex items-center group/cat"
          draggable={isEditMode && !!catObj}
          onDragStart={(e) => catObj && handleDragStart(e, 'category', catObj.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => {
            if (catObj) {
              handleDrop(e, 'category', catObj.id);
            } else if (isEditMode) {
              e.preventDefault();
            }
          }}
        >
          {isEditMode && catObj && (
            <GripVertical className="h-3 w-3 text-muted-foreground/30 mr-1 cursor-grab active:cursor-grabbing" />
          )}
          <button
            onClick={() => toggleCategory(category)}
            className="flex items-center justify-between flex-1 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            {isEditMode && catObj && editingCategoryId === catObj.id ? (
              <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                <Input
                  autoFocus
                  className="h-6 text-[10px] py-0 px-2 uppercase font-black"
                  value={categoryNameInput}
                  onChange={e => setCategoryNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      updateCategoryName.mutate({ id: catObj.id, name: categoryNameInput });
                      setEditingCategoryId(null);
                    }
                  }}
                  onBlur={() => setEditingCategoryId(null)}
                />
              </div>
            ) : (
              <span className="flex items-center gap-2">
                {category}
                {isEditMode && catObj && (
                  <Edit2
                    className="h-2.5 w-2.5 opacity-0 group-hover/cat:opacity-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategoryId(catObj.id);
                      setCategoryNameInput(catObj.name);
                    }}
                  />
                )}
              </span>
            )}
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {isEditMode && catObj && (
            <button
              onClick={() => catObj && deleteCategory.mutate(catObj.id)}
              className="p-1 opacity-0 group-hover/cat:opacity-100 text-rose-500 hover:text-rose-600"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      );

      return (
        <div key={isMobile ? `mob-cat-group-${category}` : `cat-group-${category}`} className={cn("space-y-0.5 first:mt-0", isMobile ? "mt-4" : "mt-5")}>
          {!isCollapsed || isMobile ? (
            categoryHeader
          ) : (
            <div className="mx-3 border-t border-border my-3 first:hidden" />
          )}
          {(isExpanded || isCollapsed || isMobile) && children}
        </div>
      );
    };

    const renderLink = (item: NavItem) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.to;
      const dItem = dynamicItems.find(it => it.route === item.to && it.role === (item.role || user?.role));
      const isItemActive = (item as any).is_active !== false;

      if (isMobile) {
        return (
          <motion.div
            key={item.to}
            whileTap={{ scale: 0.98 }}
            className="flex items-center group/item"
            draggable={isEditMode && !!dItem}
            onDragStart={(e) => dItem && handleDragStart(e, 'item', dItem.id, dItem.role)}
            onDragOver={handleDragOver}
            onDrop={(e) => dItem && handleDrop(e, 'item', dItem.id)}
          >
            {isEditMode && dItem && (
              <div className="flex flex-col gap-1 mr-2" onClick={e => e.stopPropagation()}>
                <GripVertical className="h-3 w-3 text-muted-foreground/30 cursor-grab" />
                <Switch
                  className="scale-50 h-3 w-6"
                  checked={isItemActive}
                  onCheckedChange={(checked) => toggleItemActive.mutate({ id: dItem.id, is_active: checked })}
                />
              </div>
            )}
            <Link
              to={item.to}
              onClick={handleMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all flex-1 relative overflow-hidden",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                !isItemActive && "opacity-50 grayscale"
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
          </motion.div>
        );
      }

      return (
        <Tooltip key={item.to} delayDuration={0}>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ x: isCollapsed ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center group/item"
              draggable={isEditMode && !!dItem}
              onDragStart={(e) => dItem && handleDragStart(e, 'item', dItem.id, dItem.role)}
              onDragOver={handleDragOver}
              onDrop={(e) => dItem && handleDrop(e, 'item', dItem.id)}
            >
              {isEditMode && dItem && !isCollapsed && (
                <div className="flex flex-col gap-1 mr-2" onClick={e => e.stopPropagation()}>
                  <GripVertical className="h-3 w-3 text-muted-foreground/30 cursor-grab" />
                  <Switch
                    className="scale-50 h-3 w-6"
                    checked={isItemActive}
                    onCheckedChange={(checked) => toggleItemActive.mutate({ id: dItem.id, is_active: checked })}
                  />
                </div>
              )}
              <Link
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all flex-1 relative overflow-hidden group/link",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-primary",
                  isCollapsed ? "justify-center px-0" : "",
                  !isItemActive && "opacity-50 grayscale"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-300",
                  isActive ? "scale-110" : "group-hover/link:scale-110"
                )} />
                {!isCollapsed && (
                  <span className="flex items-center justify-between w-full truncate relative z-10">
                    {item.label}
                    {item.unreadCount && item.unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                        {item.unreadCount}
                      </Badge>
                    )}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-primary shadow-lg shadow-primary/20 -z-0"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </Link>
            </motion.div>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="glass-overlay border-primary/20">
              <span className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
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
    };

    // 1. Dashboard items first (no category)
    dashboardItems.forEach(item => renderedItems.push(renderLink(item)));

    // 2. Map categorized items
    const categoriesMap = new Map<string, React.ReactNode[]>();
    categorizedItems.forEach(item => {
      const cat = item.category!;
      if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
      categoriesMap.get(cat)!.push(renderLink(item));
    });

    categoriesMap.forEach((links, catName) => {
      renderedItems.push(flushCategory(catName, links));
    });

    // 3. More items last
    if (uncategorizedItems.length > 0) {
      renderedItems.push(flushCategory('More', uncategorizedItems.map(item => renderLink(item))));
    }

    return renderedItems;
  };

  const desktopSidebar = (
    <TooltipProvider>
      <div
        className={cn(
          "fixed top-4 left-4 bottom-4 z-20 hidden md:flex flex-col print:hidden",
          "glass-surface rounded-3xl overflow-hidden",
          mounted ? "transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)" : "",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex flex-col h-auto pt-4 pb-2 px-4 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            {!isCollapsed && <div className="flex-1 min-w-0">{headerContent}</div>}
            <Button variant="ghost" size="icon" onClick={handleCollapseToggle} className="h-8 w-8 shrink-0">
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {isDemoSession && !isCollapsed && (
             <div className="p-1.5 rounded-2xl bg-white/5 border border-white/10 flex gap-1">
                {[
                  { r: UserRole.CENTER, l: 'Adm' },
                  { r: UserRole.TEACHER, l: 'Tea' },
                  { r: UserRole.PARENT, l: 'Par' }
                ].map(item => (
                  <button
                    key={item.r}
                    onClick={() => switchRole(item.r)}
                    className={cn(
                      "flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      user.role === item.r ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    {item.l}
                  </button>
                ))}
             </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1 custom-scrollbar">
          {renderNavLinks(filteredNavItems, false)}
        </nav>
        <div className="mt-auto p-4 space-y-4">
          {(user?.role === UserRole.CENTER || (user?.role === UserRole.TEACHER && user.teacher_scope_mode === 'full' && (hasPermission(user, 'settings_access') || hasPermission(user, 'test_management')))) && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn(
                  "w-full justify-start gap-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all",
                  isEditMode ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Settings className={cn("h-4 w-4", isEditMode && "animate-spin-slow")} />
                {!isCollapsed && (isEditMode ? "LOCK NAVIGATION" : "EDIT NAVIGATION")}
              </Button>
              {isEditMode && !isCollapsed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncDefaults.mutate()}
                  disabled={syncDefaults.isPending}
                  className="w-full justify-start gap-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                >
                  <RefreshCcw className={cn("h-3 w-3", syncDefaults.isPending && "animate-spin")} />
                  SYNC DEFAULTS
                </Button>
              )}
            </div>
          )}
          {!isCollapsed && <div className="text-sm text-muted-foreground">{footerContent}</div>}
          {isCollapsed && <div className="flex justify-center">{footerContent}</div>}
        </div>
      </div>
    </TooltipProvider>
  );

  const mobileSidebar = (
    <div
      className={cn(
        "fixed inset-0 z-[200] md:hidden transition-opacity duration-200",
        isMobileOpen ? "bg-foreground/40 backdrop-blur-md" : "pointer-events-none opacity-0"
      )}
      onClick={handleMobileClose}
    >
      {isMobileOpen && <style>{`body { overflow: hidden; }`}</style>}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-[80%] max-w-[300px] bg-card text-card-foreground shadow-[0_0_40px_rgba(0,0,0,0.3)] flex flex-col transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) z-[210]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b shrink-0">
          <div className="flex-1 min-w-0">{headerContent}</div>
          <Button variant="ghost" size="icon" onClick={handleMobileClose} className="h-9 w-9 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-0.5 min-h-0 touch-pan-y">
          {renderNavLinks(filteredNavItems, true)}
        </nav>
        <div className="border-t p-4 shrink-0 bg-card">
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
