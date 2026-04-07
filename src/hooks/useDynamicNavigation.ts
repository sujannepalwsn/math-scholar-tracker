import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, CheckSquare, Clock, LayoutList, BookOpen, Book,
  ClipboardCheck, GraduationCap, Award, Paintbrush, AlertTriangle,
  UserPlus, Users, UserCheck, Plane, IdCard, Archive, Bus,
  CalendarDays, Settings, MessageSquare, Video, Calendar,
  User, BarChart3, TrendingUp, FileText, DollarSign, PenTool, Sparkles, Star, Building,
  CalendarCheck
} from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { DEFAULT_NAV_CATEGORIES, DEFAULT_NAV_ITEMS } from "@/lib/navigation-defaults";

export function useDynamicNavigation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getIcon = (name: string) => {
    const icons: Record<string, React.ElementType> = {
      Home, CheckSquare, Clock, LayoutList, BookOpen, Book,
      ClipboardCheck, GraduationCap, Award, Paintbrush, AlertTriangle,
      UserPlus, Users, UserCheck, Plane, IdCard, Archive, Bus,
      CalendarDays, Settings, MessageSquare, Video, Calendar,
      User, BarChart3, TrendingUp, FileText, DollarSign, PenTool, Sparkles, Star, Building,
      CalendarCheck
    };
    return icons[name] || Home;
  };

  const { data: dynamicCategories = [] } = useQuery({
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

  const { data: dynamicItems = [] } = useQuery({
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

  const updateCategoryName = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const { error } = await supabase.from("nav_categories").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
      toast.success("Category updated");
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nav_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
      queryClient.invalidateQueries({ queryKey: ["nav-items"] });
      toast.success("Category deleted");
    },
  });

  const updateOrders = useMutation({
    mutationFn: async ({ type, updates }: { type: 'categories' | 'items', updates: any[] }) => {
      const table = type === 'categories' ? 'nav_categories' : 'nav_items';
      const { error } = await supabase.from(table).upsert(updates, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.type === 'categories' ? "nav-categories" : "nav-items"] });
    },
  });

  const toggleItemActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase.from("nav_items").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-items"] });
    },
  });

  const syncDefaults = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) return;

      // 1. Categories
      const categoriesToSync = DEFAULT_NAV_CATEGORIES;
      for (const cat of categoriesToSync) {
        const existing = dynamicCategories.find(c => c.name === cat.name);
        if (!existing) {
          const { error: catError } = await supabase.from("nav_categories").insert({
            center_id: user.center_id,
            name: cat.name,
            order: cat.order
          });
          if (catError) throw catError;
        }
      }

      // Re-fetch to get IDs
      const { data: latestCats, error: fetchCatsError } = await supabase
        .from("nav_categories")
        .select("*")
        .eq("center_id", user.center_id);

      if (fetchCatsError) throw fetchCatsError;

      // 2. Items
      const itemsToInsert = [];
      for (const it of DEFAULT_NAV_ITEMS) {
        // Filter by role for sync to avoid cross-role contamination if preferred,
        // but here we sync all for the center's ecosystem.
        const existing = dynamicItems.find(existingItem =>
          existingItem.route === it.route && existingItem.role === it.role
        );

        if (!existing) {
          const category = it.category ? latestCats?.find(c => c.name === it.category) : null;
          itemsToInsert.push({
            center_id: user.center_id,
            category_id: category?.id || null,
            name: it.name,
            route: it.route,
            icon: it.icon,
            role: it.role,
            feature_name: it.feature_name,
            order: it.order,
            is_active: true
          });
        }
      }

      if (itemsToInsert.length > 0) {
        const { error } = await supabase.from("nav_items").insert(itemsToInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
      queryClient.invalidateQueries({ queryKey: ["nav-items"] });
      toast.success("Navigation synchronized");
    },
  });

  const syncMissingItems = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || dynamicItems.length === 0) return;

      const itemsToInsert = [];
      for (const it of DEFAULT_NAV_ITEMS) {
        const existing = dynamicItems.find(existingItem =>
          existingItem.route === it.route && existingItem.role === it.role
        );

        if (!existing) {
          const category = it.category ? dynamicCategories?.find(c => c.name === it.category) : null;
          itemsToInsert.push({
            center_id: user.center_id,
            category_id: category?.id || null,
            name: it.name,
            route: it.route,
            icon: it.icon,
            role: it.role,
            feature_name: it.feature_name,
            order: it.order,
            is_active: true
          });
        }
      }

      if (itemsToInsert.length > 0) {
        const { error } = await supabase.from("nav_items").insert(itemsToInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-items"] });
    },
  });

  return {
    dynamicCategories,
    dynamicItems,
    getIcon,
    updateCategoryName,
    deleteCategory,
    updateOrders,
    toggleItemActive,
    syncDefaults,
    syncMissingItems
  };
}
