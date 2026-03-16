import { cn } from "@/lib/utils"
import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCcw, ShieldAlert, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_NAV_ITEMS, DEFAULT_NAV_CATEGORIES } from "@/lib/navigation-defaults";

export default function AdminRecovery() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const centerId = user?.center_id;

  const resetNavigationMutation = useMutation({
    mutationFn: async () => {
      if (!centerId) throw new Error("Unauthorized");

      // 1. Clear existing
      await supabase.from("nav_items").delete().eq("center_id", centerId);
      await supabase.from("nav_categories").delete().eq("center_id", centerId);

      // 2. Insert Categories
      const { data: cats, error: catError } = await supabase
        .from("nav_categories")
        .insert(DEFAULT_NAV_CATEGORIES.map(c => ({ ...c, center_id: centerId })))
        .select();

      if (catError) throw catError;

      // 3. Insert Items
      const itemsToInsert = DEFAULT_NAV_ITEMS.map(item => {
        const cat = cats.find(c => c.name === item.category);
        return {
          center_id: centerId,
          category_id: cat?.id || null,
          name: item.name,
          route: item.route,
          icon: item.icon,
          order: item.order,
          is_active: true,
          role: "center"
        };
      });

      const { error: itemError } = await supabase.from("nav_items").insert(itemsToInsert);
      if (itemError) throw itemError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nav-categories"] });
      queryClient.invalidateQueries({ queryKey: ["nav-items"] });
      toast.success("Navigation system has been reset to defaults");
    },
    onError: (error: any) => {
      toast.error("Recovery failed: " + error.message);
    }
  });

  if (user?.role !== 'center' && user?.role !== 'admin') {
    return <div className="p-20 text-center">Unauthorized Access</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full rounded-[2.5rem] border-none shadow-strong overflow-hidden">
        <CardHeader className="bg-rose-500 p-8 text-center text-white">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">System Recovery</CardTitle>
          <p className="text-rose-100 text-sm font-medium mt-2">Emergency Navigation Restoration Protocol</p>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="space-y-4">
            <p className="text-slate-600 text-sm leading-relaxed">
              If your sidebar navigation has disappeared or is corrupted, use this tool to reseed the default institutional architecture.
            </p>
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Actions to be performed:</h4>
              <ul className="text-[10px] font-bold text-slate-700 space-y-1">
                <li className="flex items-center gap-2">• Purge existing navigation records</li>
                <li className="flex items-center gap-2">• Reseed 7 default categories</li>
                <li className="flex items-center gap-2">• Restore 13 core navigation items</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => resetNavigationMutation.mutate()}
              disabled={resetNavigationMutation.isPending}
              className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest shadow-strong"
            >
              {resetNavigationMutation.isPending ? "Restoring..." : "Execute Reseed Protocol"}
              <RefreshCcw className={cn("ml-2 h-4 w-4", resetNavigationMutation.isPending && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full h-12 rounded-2xl font-bold text-slate-400"
            >
              <Home className="mr-2 h-4 w-4" /> Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
