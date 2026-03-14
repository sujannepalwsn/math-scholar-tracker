import React, { useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
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
    queryKey: ["notifications", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("center_id", user.center_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) return;
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("center_id", user.center_id)
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

  const getTypeIcon = (type: string) => {
    const colors: Record<string, string> = {
      student: "bg-blue-100 text-blue-600",
      attendance: "bg-green-100 text-green-600",
      marks: "bg-purple-100 text-purple-600",
      exam: "bg-orange-100 text-orange-600",
      leave_request: "bg-amber-100 text-amber-600",
      leave_status: "bg-emerald-100 text-emerald-600",
      homework: "bg-indigo-100 text-indigo-600",
      lesson_plan: "bg-rose-100 text-rose-600",
      info: "bg-muted text-muted-foreground",
    };
    return colors[type] || colors.info;
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
                notifications.map((n: any) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "w-full text-left p-3 border-b last:border-0 hover:bg-muted/50 transition-colors flex gap-3",
                      !n.is_read && "bg-primary/5"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", getTypeIcon(n.type))}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", !n.is_read && "font-bold")}>{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </button>
                ))
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
