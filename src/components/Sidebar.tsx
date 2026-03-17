"use client";
import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X, Settings, GripVertical, Trash2, RefreshCcw, Edit2 } from "lucide-react";

import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useDynamicNavigation } from "@/hooks/useDynamicNavigation";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  role?: 'admin' | 'center' | 'parent' | 'teacher';
  featureName?: string;
  unreadCount?: number;
  category?: 'Academics' | 'Administration' | 'Reports and Communication';
}

interface SidebarProps {
  navItems: NavItem[];
  headerContent: React.ReactNode;
  footerContent: React.ReactNode;
  onCollapseChange?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

function SortableItem({ id, children, isEditMode }: { id: string, children: React.ReactNode, isEditMode: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    'Reports and Communication'
  ]);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Check if we are dragging a category or an item
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCat = dynamicCategories.find(c => c.id === activeId);
    const overCat = dynamicCategories.find(c => c.id === overId);

    if (activeCat && overCat) {
      // Reordering categories
      const oldIndex = dynamicCategories.findIndex(c => c.id === activeId);
      const newIndex = dynamicCategories.findIndex(c => c.id === overId);
      const newCategories = arrayMove(dynamicCategories, oldIndex, newIndex);
      updateOrders.mutate({
        type: 'categories',
        updates: newCategories.map((c, i) => ({ id: c.id, order: i, name: c.name, center_id: user?.center_id }))
      });
    } else {
      // Reordering items
      const activeItem = dynamicItems.find(it => it.id === activeId);
      const overItem = dynamicItems.find(it => it.id === overId);

      if (activeItem && overItem) {
        const itemsForRole = dynamicItems.filter(it => it.role === activeItem.role);
        const oldIndex = itemsForRole.findIndex(it => it.id === activeId);
        const newIndex = itemsForRole.findIndex(it => it.id === overId);

        const newItems = arrayMove(itemsForRole, oldIndex, newIndex);
        // Also update category_id if it changed
        const updatedItem = { ...activeItem, category_id: overItem.category_id };
        const finalItems = newItems.map(it => it.id === activeId ? updatedItem : it);

        updateOrders.mutate({
          type: 'items',
          updates: finalItems.map((it, i) => ({
            id: it.id,
            order: i,
            category_id: it.category_id,
            center_id: user?.center_id,
            name: it.name,
            route: it.route
          }))
        });
      } else if (activeItem && overCat) {
        // Moving item to category (drop on header)
        updateOrders.mutate({
          type: 'items',
          updates: [{ ...activeItem, category_id: overCat.id }]
        });
      }
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if ((item as any).is_active === false && !isEditMode) return false;
    if (item.role && user?.role !== item.role) return false;
    if (item.featureName) {
      if (user?.role === 'center' && user.centerPermissions) {
        return user.centerPermissions[item.featureName] !== false;
      }
      if (user?.role === 'teacher') {
        // Teachers can have their own specific feature permissions (administrative toggles)
        if (user.teacherPermissions && user.teacherPermissions[item.featureName] !== undefined) {
          return user.teacherPermissions[item.featureName] === true;
        }
        // Fallback to default teacher permissions if not explicitly set
        return user.teacherPermissions?.[item.featureName] !== false;
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
      const catObj = dynamicCategories.find(c => c.name === category);

      const categoryHeader = (
        <div className="flex items-center group/cat">
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

      const content = (
        <div key={`cat-group-${category}`} className="space-y-0.5 mt-5 first:mt-0">
          {!isCollapsed ? (
            catObj ? (
              <SortableItem id={catObj.id} isEditMode={isEditMode}>
                {categoryHeader}
              </SortableItem>
            ) : categoryHeader
          ) : (
            <div className="mx-3 border-t border-border my-3 first:hidden" />
          )}
          <SortableContext
            items={dynamicItems.filter(it => it.category_id === catObj?.id).map(it => it.id)}
            strategy={verticalListSortingStrategy}
          >
            {(isExpanded || isCollapsed) && children}
          </SortableContext>
        </div>
      );

      return content;
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

      const dItem = dynamicItems.find(it => it.route === item.to && it.role === (item.role || user?.role));
      const isItemActive = (item as any).is_active !== false;

      const itemContent = (
        <div className="flex items-center group/item w-full">
          {isEditMode && dItem && !isCollapsed && (
            <div className="flex flex-col gap-1 mr-2" onClick={e => e.stopPropagation()}>
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 cursor-grab" />
              <Switch
                className="scale-50 h-3 w-6"
                checked={isItemActive}
                onCheckedChange={(checked) => toggleItemActive.mutate({ id: dItem.id, is_active: checked })}
              />
            </div>
          )}
          <Link
            to={item.to}
            onClick={isMobile ? handleMobileClose : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors flex-1",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              isCollapsed && !isMobile ? "justify-center px-0" : "",
              !isItemActive && "opacity-50 grayscale"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!isCollapsed || isMobile ? (
              <span className="flex items-center justify-between flex-1 truncate">
                {item.label}
                {item.unreadCount && item.unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                    {item.unreadCount}
                  </Badge>
                )}
              </span>
            ) : null}
          </Link>
        </div>
      );

      const link = isMobile ? (
        dItem ? (
          <SortableItem key={item.to} id={dItem.id} isEditMode={isEditMode}>
            {itemContent}
          </SortableItem>
        ) : <div key={item.to}>{itemContent}</div>
      ) : (
        <Tooltip key={item.to} delayDuration={0}>
          <TooltipTrigger asChild>
            {dItem ? (
              <SortableItem id={dItem.id} isEditMode={isEditMode}>
                {itemContent}
              </SortableItem>
            ) : itemContent}
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

  const sidebarNav = (isMobile: boolean) => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
    >
      <SortableContext
        items={dynamicCategories.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {renderNavLinks(filteredNavItems, isMobile)}
        </nav>
      </SortableContext>
    </DndContext>
  );

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
        {sidebarNav(false)}
        <div className="mt-auto p-4 border-t space-y-4">
          {user?.role === 'center' && (
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
        {sidebarNav(true)}
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
