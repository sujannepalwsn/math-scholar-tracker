import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, CheckCircle2, Clock, Filter, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CenterSuggestions({ centerId }: { centerId: string }) {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["center-suggestions", centerId, roleFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("suggestions")
        .select("*, users(first_name, last_name)")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });

      if (roleFilter !== "all") query = query.eq("role_type", roleFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("suggestions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-suggestions"] });
      toast.success("Suggestion status updated");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suggestions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["center-suggestions"] });
      toast.success("Suggestion deleted");
    },
    onError: (error: any) => toast.error(error.message),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-strong rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 overflow-hidden">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            Suggestions from Teachers & Parents
          </CardTitle>
          <CardDescription>Review and manage suggestions submitted by institutional users.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter by Role</p>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl bg-card/50">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="parent">Parents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter by Status</p>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl bg-card/50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {suggestions.map((sug: any) => (
              <div key={sug.id} className="p-4 rounded-2xl border border-border/10 bg-white/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">{sug.title}</h4>
                      {sug.status === 'resolved' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Resolved
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{sug.users ? `${sug.users.first_name} ${sug.users.last_name}` : 'Unknown User'} ({sug.role_type})</span>
                      </div>
                      <span>•</span>
                      <span>{format(new Date(sug.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {sug.status === 'pending' ? (
                      <Button size="sm" onClick={() => resolveMutation.mutate({ id: sug.id, status: 'resolved' })} className="rounded-xl h-8 text-[10px] font-black uppercase tracking-widest">
                        RESOLVE
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ id: sug.id, status: 'pending' })} className="rounded-xl h-8 text-[10px] font-black uppercase tracking-widest border-2">
                        REOPEN
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(sug.id)} className="h-8 w-8 p-0 rounded-xl hover:bg-destructive/10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed italic border-l-4 border-primary/20 pl-4 py-2">"{sug.message}"</p>
              </div>
            ))}

            {suggestions.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-3xl">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">No suggestions matching filters found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
