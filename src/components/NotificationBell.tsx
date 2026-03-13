import React, { useState, useEffect } from "react";
import { Bell, CheckCheck, ExternalLink, Calendar, GraduationCap, BookOpen, Clock, MessageSquare, Info } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.center_id, user?.id],
    queryFn: async () => {
      if (!user?.center_id || !user?.id) return [];

      const { data: userNotifs, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

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
        .limit(10);
      if (bError) throw bError;

      const mappedBroadcasts = (broadcasts || []).map(b => ({
        id: b.id,
        center_id: b.center_id,
        user_id: user.id,
        title: "Announcement",
        message: b.message_text,
        type: "broadcast",
        is_read: false,
        created_at: b.sent_at || b.created_at,
        link: null
      }));

      const combined = [...(userNotifs || []), ...mappedBroadcasts].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return combined.slice(0, 20);
    },
    enabled: !!user?.center_id && !!user?.id,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!user?.id || !user?.center_id) return;
    const channel = supabase
      .channel('notif-bell-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, user?.center_id]);

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.center_id) return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("center_id", user.center_id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) markReadMutation.mutate(notification.id);
    if (notification.link) navigate(notification.link);
    setOpen(false);
  };

  const getNotificationsRoute = () => {
    if (user?.role === 'parent') return '/parent-notifications';
    if (user?.role === 'teacher') return '/teacher/notifications';
    return '/notifications';
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      student: { color: "bg-blue-100 text-blue-600", icon: Bell },
      attendance: { color: "bg-green-100 text-green-600", icon: Bell },
      marks: { color: "bg-purple-100 text-purple-600", icon: GraduationCap },
      exam: { color: "bg-orange-100 text-orange-600", icon: Calendar },
      leave_request: { color: "bg-amber-100 text-amber-600", icon: Clock },
      leave_status: { color: "bg-emerald-100 text-emerald-600", icon: Bell },
      broadcast: { color: "bg-indigo-100 text-indigo-600", icon: MessageSquare },
      homework: { color: "bg-rose-100 text-rose-600", icon: BookOpen },
      meeting: { color: "bg-cyan-100 text-cyan-600", icon: Calendar },
      info: { color: "bg-muted text-muted-foreground", icon: Info },
    };
    return configs[type] || configs.info;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative bg-card shadow-soft rounded-xl hover:bg-card/80"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-card border rounded-2xl shadow-elevated z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => markAllReadMutation.mutate()}
                >
                  <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n: any) => {
                  const config = getTypeConfig(n.type);
                  const Icon = config.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "w-full text-left p-3 border-b last:border-0 hover:bg-muted/50 transition-colors flex gap-3",
                        !n.is_read && "bg-primary/5"
                      )}
                    >
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-black tracking-tight truncate", !n.is_read && "text-primary")}>{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2 animate-pulse" />}
                    </button>
                  );
                })
              )}
            </ScrollArea>
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { navigate(getNotificationsRoute()); setOpen(false); }}>
                View All Notifications
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
