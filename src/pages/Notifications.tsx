import React from "react";
import { Bell, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["all-notifications", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("center_id", user.center_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
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
      await supabase.from("notifications").update({ is_read: true }).eq("center_id", user.center_id).eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").delete().eq("id", id);
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
          {notifications.map((n: any) => (
            <Card
              key={n.id}
              className={cn(
                "transition-all duration-200 cursor-pointer hover:shadow-md",
                !n.is_read ? "border-primary/30 bg-primary/5" : "hover:bg-muted/50"
              )}
              onClick={() => handleNotificationClick(n)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", getTypeColor(n.type))}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn("text-sm text-foreground", !n.is_read && "font-bold")}>{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {n.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                    {n.link && (
                      <div className="flex items-center text-[11px] font-bold text-primary uppercase tracking-tighter">
                        <ExternalLink className="h-3 w-3 mr-1" /> View Detail
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(n.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
