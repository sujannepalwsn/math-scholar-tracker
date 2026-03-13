import React, { useEffect } from "react";
import { Bell, CheckCheck, Trash2, MessageSquare, BookOpen, GraduationCap, Calendar, CheckCircle2, Info, User, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["all-notifications", user?.center_id, user?.id],
    queryFn: async () => {
      if (!user?.center_id || !user?.id) return [];

      // Fetch user specific notifications
      const { data: userNotifs, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Fetch broadcast messages
      let broadcastQuery = supabase
        .from("broadcast_messages")
        .select("*")
        .eq("center_id", user.center_id);

      if (user.role === 'teacher') {
        broadcastQuery = broadcastQuery.in('target_audience', ['all_teachers']);
      } else if (user.role === 'parent') {
        const studentGrades = user.linked_students?.map(s => `grade_${s.grade}`).filter(Boolean) || [];
        broadcastQuery = broadcastQuery.in('target_audience', ['all_parents', ...studentGrades]);
      }

      const { data: broadcasts, error: bError } = await broadcastQuery
        .order("sent_at", { ascending: false })
        .limit(50);
      if (bError) throw bError;

      const mappedBroadcasts = (broadcasts || []).map(b => ({
        id: b.id,
        center_id: b.center_id,
        user_id: user.id,
        title: "Broadcast Announcement",
        message: b.message_text,
        type: "broadcast",
        is_read: false,
        created_at: b.sent_at || b.created_at,
        link: null
      }));

      const combined = [...(userNotifs || []), ...mappedBroadcasts].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return combined.slice(0, 100);
    },
    enabled: !!user?.center_id && !!user?.id,
    refetchInterval: 10000, // Real-timeish polling
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id || !user?.center_id) return;
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, user?.center_id]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.center_id) return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("center_id", user.center_id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || !user?.id) return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("center_id", user.center_id)
        .eq("user_id", user.id)
        .eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.center_id) return;
      await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("center_id", user.center_id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      student: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: User },
      attendance: { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
      marks: { color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: GraduationCap },
      exam: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: Calendar },
      leave_request: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
      leave_status: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
      broadcast: { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", icon: MessageSquare },
      homework: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: BookOpen },
      meeting: { color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400", icon: Calendar },
      info: { color: "bg-muted text-muted-foreground", icon: Info },
    };
    return configs[type] || configs.info;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Notifications" description={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`} />
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const config = getTypeConfig(n.type);
            const Icon = config.icon;
            return (
              <Card key={n.id} className={cn("transition-all duration-300 hover:shadow-soft", !n.is_read && "border-primary/30 bg-primary/5 shadow-soft")}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", config.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className={cn("text-sm text-foreground font-black tracking-tight", !n.is_read && "text-primary")}>{n.title}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                      </div>
                      <Badge variant="secondary" className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md">
                        {n.type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-muted/20">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                        {!n.is_read && (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10" onClick={() => markReadMutation.mutate(n.id)}>
                            Mark as Read
                          </Button>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
