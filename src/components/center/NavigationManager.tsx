import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, Save, FolderPlus, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface NavCategory {
  id: string;
  name: string;
  order: number;
}

interface NavItem {
  id: string;
  category_id: string | null;
  name: string;
  route: string;
  order: number;
  is_active: boolean;
  icon: string;
  role: string;
}

export default function NavigationManager({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [draggedItem, setDraggedItem] = useState<{ type: 'category' | 'item', id: string } | null>(null);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["nav-categories", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nav_categories")
        .select("*")
        .eq("center_id", centerId)
        .order("order");
      if (error) throw error;
      return data as NavCategory[];
    },
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["nav-items", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nav_items")
        .select("*")
        .eq("center_id", centerId)
        .order("order");
      if (error) throw error;
      return data as NavItem[];
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("nav_categories").insert({
        center_id: centerId,
        name,
        order: categories.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
      setNewCategoryName("");
      toast.success("Category added");
    },
  });

  const updateOrdersMutation = useMutation({
    mutationFn: async ({ type, updates }: { type: 'categories' | 'items', updates: any[] }) => {
      const table = type === 'categories' ? 'nav_categories' : 'nav_items';
      const { error } = await supabase.from(table).upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
      queryClient.invalidateQueries({ queryKey: ["nav-items"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nav_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
      toast.success("Category deleted");
    },
  });

  const handleDragStart = (e: React.DragEvent, type: 'category' | 'item', id: string) => {
    setDraggedItem({ type, id });
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetType: 'category' | 'item', targetId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === 'category' && targetType === 'category') {
      // Reorder categories
      const newCategories = [...categories];
      const draggedIdx = newCategories.findIndex(c => c.id === draggedItem.id);
      const targetIdx = newCategories.findIndex(c => c.id === targetId);

      const [removed] = newCategories.splice(draggedIdx, 1);
      newCategories.splice(targetIdx, 0, removed);

      const updates = newCategories.map((c, i) => ({ id: c.id, order: i, name: c.name, center_id: centerId }));
      updateOrdersMutation.mutate({ type: 'categories', updates });
    } else if (draggedItem.type === 'item') {
      if (targetType === 'category') {
        // Move item to category
        const updatedItem = items.find(it => it.id === draggedItem.id);
        if (updatedItem) {
          const updates = [{ ...updatedItem, category_id: targetId }];
          updateOrdersMutation.mutate({ type: 'items', updates });
        }
      } else if (targetType === 'item') {
        // Reorder items within or between categories
        const targetItem = items.find(it => it.id === targetId);
        const draggedItemObj = items.find(it => it.id === draggedItem.id);
        if (!targetItem || !draggedItemObj) return;

        const newItems = [...items];
        const draggedIdx = newItems.findIndex(it => it.id === draggedItem.id);
        const targetIdx = newItems.findIndex(it => it.id === targetId);

        const [removed] = newItems.splice(draggedIdx, 1);
        removed.category_id = targetItem.category_id; // Set same category as target
        newItems.splice(targetIdx, 0, removed);

        const updates = newItems.map((it, i) => ({
          id: it.id,
          order: i,
          category_id: it.category_id,
          center_id: centerId,
          name: it.name,
          route: it.route
        }));
        updateOrdersMutation.mutate({ type: 'items', updates });
      }
    }
    setDraggedItem(null);
  };

  const seedNavItemsMutation = useMutation({
    mutationFn: async () => {
      // Basic seed data from CenterLayout
      const defaultItems = [
        { name: "Dashboard", route: "/", icon: "Home", role: "center", feature_name: "dashboard_access" },
        { name: "Take Attendance", route: "/attendance", icon: "CheckSquare", role: "center", feature_name: "take_attendance" },
        { name: "Class Routine", route: "/class-routine", icon: "Clock", role: "center", feature_name: "class_routine" },
        { name: "Students Registration", route: "/register", icon: "UserPlus", role: "center", feature_name: "students_registration" },
        { name: "HR Management", route: "/hr-management", icon: "Award", role: "center", feature_name: "hr_management" },
        { name: "Inventory & Assets", route: "/inventory", icon: "Archive", role: "center", feature_name: "inventory_assets" },
        { name: "Transport & Tracking", route: "/transport", icon: "Bus", role: "center", feature_name: "transport_tracking" },
        { name: "Settings", route: "/settings", icon: "Settings", role: "center", feature_name: "settings_access" },
      ];

      const { error } = await supabase.from("nav_items").insert(
        defaultItems.map((it, i) => ({ ...it, center_id: centerId, order: i }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-items"] });
      toast.success("Default items seeded");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black uppercase tracking-tight">Navigation Architecture</h3>
        <div className="flex gap-3">
          <Input
            placeholder="New Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="h-10 w-48 rounded-xl"
          />
          <Button onClick={() => addCategoryMutation.mutate(newCategoryName)} disabled={!newCategoryName} size="sm" className="rounded-xl">
            <FolderPlus className="h-4 w-4 mr-2" /> Add Category
          </Button>
          {items.length === 0 && (
            <Button variant="outline" onClick={() => seedNavItemsMutation.mutate()} size="sm" className="rounded-xl">
              Seed Defaults
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Uncategorized Items */}
        <Card className="rounded-2xl border-dashed border-2 border-slate-200 bg-slate-50/30">
          <CardHeader className="py-3 px-6 border-b border-slate-100">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uncategorized Items</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {items.filter(it => !it.category_id).map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'item', item.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'item', item.id)}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border shadow-sm group hover:border-primary transition-all"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-slate-300 cursor-grab active:cursor-grabbing" />
                    <span className="font-bold text-sm text-slate-700">{item.name}</span>
                    <Badge variant="outline" className="text-[8px] uppercase">{item.role}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-slate-400 font-medium">{item.route}</span>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) => toggleItemActiveMutation.mutate({ id: item.id, is_active: checked })}
                    />
                  </div>
                </div>
              ))}
              {items.filter(it => !it.category_id).length === 0 && (
                <p className="text-center py-4 text-xs italic text-slate-400">No uncategorized items.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        {categories.map(cat => (
          <Card
            key={cat.id}
            className="rounded-2xl border shadow-soft overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'category', cat.id)}
          >
            <CardHeader className="bg-slate-50 py-3 px-6 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <GripVertical
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'category', cat.id)}
                  className="h-4 w-4 text-slate-400 cursor-grab"
                />
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-600">{cat.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 bg-white">
              <div className="space-y-1 min-h-[40px]">
                {items.filter(it => it.category_id === cat.id).map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'item', item.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'item', item.id)}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-primary transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-slate-300 cursor-grab" />
                      <span className="font-bold text-sm text-slate-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-400 font-medium">{item.route}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Badge({ children, variant = "default", className }: { children: React.ReactNode, variant?: "default" | "outline", className?: string }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full font-bold",
      variant === "outline" ? "border border-slate-200 text-slate-500" : "bg-primary/10 text-primary",
      className
    )}>
      {children}
    </span>
  );
}
