import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LeaveCategoryManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newApplicableTo, setNewApplicableTo] = useState<"student" | "teacher" | "both">("both");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["leave-categories", user?.center_id, user?.role],
    queryFn: async () => {
      let query = supabase
        .from("leave_categories")
        .select("*");

      if (user?.role === 'admin') {
        // Superadmin sees only global ones
        query = query.is("center_id", null);
      } else if (user?.center_id) {
        // Regular centers see global + their own
        query = query.or(`center_id.is.null,center_id.eq.${user.center_id}`);
      } else {
        query = query.is("center_id", null);
      }

      const { data, error } = await query.order("created_at");
      if (error) throw error;
      return data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("leave_categories")
        .insert({
          name: newName,
          center_id: user?.center_id,
          applicable_to: newApplicableTo
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
      setNewName("");
      toast.success("Category added");
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active, applicable_to }: { id: string; is_active?: boolean; applicable_to?: string }) => {
      const payload: any = {};
      if (is_active !== undefined) payload.is_active = is_active;
      if (applicable_to !== undefined) payload.applicable_to = applicable_to;

      const { error } = await supabase
        .from("leave_categories")
        .update(payload)
        .eq("id", id)
        .eq("center_id", user?.center_id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      let query = supabase.from("leave_categories").delete().eq("id", id);

      if (user?.role === 'admin') {
        query = query.is("center_id", null);
      } else {
        query = query.eq("center_id", user?.center_id!);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
      toast.success("Category deleted");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Category Name</Label>
            <Input
              placeholder="e.g. Medical, Casual, Sabbatical"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-11 rounded-xl bg-card/50"
            />
          </div>
          <div className="w-[180px] space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-1">Applicable To</Label>
            <Select value={newApplicableTo} onValueChange={(v: any) => setNewApplicableTo(v)}>
              <SelectTrigger className="h-11 rounded-xl bg-card/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="teacher">Teachers Only</SelectItem>
                <SelectItem value="student">Students Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={() => addMutation.mutate()}
          disabled={!newName || addMutation.isPending}
          className="w-full rounded-xl h-12 font-black text-xs tracking-widest bg-primary shadow-soft"
        >
          <Plus className="w-4 h-4 mr-2" /> REGISTER NEW LEAVE CATEGORY
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-8 col-span-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-muted-foreground italic py-8 col-span-2">No categories defined.</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-muted-foreground/10 group shadow-soft hover:shadow-medium transition-all">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className={cn("font-bold text-sm", !cat.is_active && "text-muted-foreground line-through")}>{cat.name}</p>
                  <div className="flex gap-2">
                    <Badge variant={cat.is_active ? "secondary" : "outline"} className="text-[8px] uppercase font-black px-1.5 py-0">
                      {cat.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-[8px] uppercase font-black px-1.5 py-0 border-primary/20 text-primary bg-primary/5">
                      {cat.applicable_to}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("Delete this category?")) deleteMutation.mutate(cat.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-muted-foreground/5">
                <Select
                  value={cat.applicable_to}
                  onValueChange={(v) => toggleMutation.mutate({ id: cat.id, applicable_to: v })}
                >
                  <SelectTrigger className="h-8 text-[10px] font-bold rounded-lg bg-white/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] font-bold rounded-lg px-3 bg-white/50"
                  onClick={() => toggleMutation.mutate({ id: cat.id, is_active: !cat.is_active })}
                >
                  {cat.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
