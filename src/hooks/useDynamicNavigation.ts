import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, CheckSquare, Clock, LayoutList, BookOpen, Book,
  ClipboardCheck, GraduationCap, Award, Paintbrush, AlertTriangle,
  UserPlus, Users, UserCheck, Plane, IdCard, Archive, Bus,
  CalendarDays, Settings, MessageSquare, Video, Calendar,
  User, BarChart3, TrendingUp, FileText, DollarSign, PenTool, Brain
} from "lucide-react";
import React, { useMemo } from "react";
import { DEFAULT_NAV_ITEMS, DEFAULT_NAV_CATEGORIES } from "@/lib/navigation-defaults";

export function useDynamicNavigation() {
  const { user } = useAuth();

  const getIcon = (name: string) => {
    const icons: Record<string, React.ElementType> = {
      Home, CheckSquare, Clock, LayoutList, BookOpen, Book,
      ClipboardCheck, GraduationCap, Award, Paintbrush, AlertTriangle,
      UserPlus, Users, UserCheck, Plane, IdCard, Archive, Bus,
      CalendarDays, Settings, MessageSquare, Video, Calendar,
      User, BarChart3, TrendingUp, FileText, DollarSign, PenTool, Brain
    };
    return icons[name] || Home;
  };

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["nav-categories", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("nav_categories")
        .select("*")
        .eq("center_id", user.center_id)
        .order("order");
      if (error) return [];
      return data;
    },
    enabled: !!user?.center_id,
  });

  const { data: dbItems = [] } = useQuery({
    queryKey: ["nav-items", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("nav_items")
        .select("*")
        .eq("center_id", user.center_id)
        .order("order");
      if (error) return [];
      return data;
    },
    enabled: !!user?.center_id,
  });

  const dynamicCategories = useMemo(() => {
    if (dbCategories.length > 0) return dbCategories;
    // Map default categories to look like DB records
    return DEFAULT_NAV_CATEGORIES.map((cat, i) => ({
      id: `def-cat-${i}`,
      name: cat.name,
      order: cat.order
    }));
  }, [dbCategories]);

  const dynamicItems = useMemo(() => {
    if (dbItems.length > 0) return dbItems;
    // Map default items to look like DB records
    return DEFAULT_NAV_ITEMS.map((item, i) => {
      const cat = DEFAULT_NAV_CATEGORIES.find(c => c.name === item.category);
      return {
        id: `def-item-${i}`,
        name: item.name,
        route: item.route,
        icon: item.icon,
        order: item.order,
        feature_name: (item as any).feature_name,
        role: (item as any).role || 'center',
        category_id: cat ? dynamicCategories.find(dc => dc.name === cat.name)?.id : null,
        is_active: true
      };
    });
  }, [dbItems, dynamicCategories]);

  return {
    dynamicCategories,
    dynamicItems,
    getIcon
  };
}
