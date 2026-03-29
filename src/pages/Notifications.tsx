import React from "react";
import { Bell, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServerPagination } from "@/components/ui/server-pagination";
import { usePagination } from "@/hooks/use-pagination";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { page, setPage, pageSize, setPageSize } = usePagination();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["all-notifications", user?.id, user?.center_id, page, pageSize],
    queryFn: async () => {
      if (!user?.id) return { data: [], count: 0 };

      let query = supabase
        .from("notifications")
        .select("*", { count: "exact" });

      if (user.role === 'admin') {
        // Super admin sees all
      } else {
        // Center admin, Teachers and Parents see their own and center-wide broadcasts
        query = query.or(`user_id.eq.${user.id},and(user_id.is.null,center_id.eq.${user.center_id})`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.id,
    placeholderData: (previousData) => previousData
  });

  const notifications = notificationsData?.data || [];
  const totalRows = notificationsData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const handleNotificationClick = (n: any) => {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("center_id", user.center_id).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      student: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      attendance: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      marks: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      exam: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      leave_request: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      leave_status: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      homework: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
      lesson_plan: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
      info: "bg-muted text-muted-foreground",
    };
    return colors[type] || colors.info;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Bell className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Alert Nexus
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">{unreadCount} Pending Transmissions</p>
              </div>
            </div>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button onClick={() => markAllReadMutation.mutate()} className="rounded-2xl shadow-strong h-12 px-6 text-sm font-black tracking-tight bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all duration-300">
            <CheckCheck className="h-5 w-5 mr-2" />
            ACKNOWLEDGE ALL
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="border-none shadow-strong bg-card/40 backdrop-blur-md rounded-3xl"><CardContent className="p-12 text-center text-muted-foreground font-medium italic">Synchronizing alert registry...</CardContent></Card>
      ) : notifications.length === 0 ? (
        <Card className="border-none shadow-strong bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden border border-white/20">
          <CardContent className="p-16 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
               <Bell className="h-10 w-10 text-primary opacity-40" />
            </div>
            <div className="space-y-2">
               <h3 className="text-2xl font-black uppercase tracking-tight text-foreground">All Clear</h3>
               <p className="text-muted-foreground font-medium italic max-w-sm mx-auto">Your institutional alert feed is currently empty. We'll notify you when new events occur.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((n: any) => (
            <Card
              key={n.id}
              className={cn(
                "transition-all duration-300 cursor-pointer border-none shadow-medium bg-card/40 backdrop-blur-md rounded-[1.5rem] overflow-hidden group hover:shadow-strong border border-white/20",
                !n.is_read && "bg-primary/5 border-primary/10 shadow-soft"
              )}
              onClick={() => handleNotificationClick(n)}
            >
              <CardContent className="p-6 flex items-start gap-5">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500", getTypeColor(n.type))}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className={cn("text-lg font-black text-slate-700 leading-tight", !n.is_read && "text-primary")}>{n.title}</p>
                      <p className="text-sm font-medium text-slate-500 leading-relaxed">{n.message}</p>
                    </div>
                    <Badge variant="secondary" className="bg-white/50 text-slate-500 border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5 shadow-soft shrink-0">
                      {n.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-5 mt-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                       <div className="h-1 w-1 rounded-full bg-slate-300" />
                       {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                    {n.link && (
                      <div className="flex items-center text-[10px] font-black text-primary uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                        <ExternalLink className="h-3 w-3 mr-1.5" /> ACCESS PROTOCOL
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive hover:bg-destructive/10 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(n.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <ServerPagination
            currentPage={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
