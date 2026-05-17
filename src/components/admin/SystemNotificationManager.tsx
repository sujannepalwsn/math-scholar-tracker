import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Bell, Calendar as CalendarIcon, Link as LinkIcon, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SystemNotificationManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: "",
    description: "",
    link: "",
    expiry_date: format(new Date(Date.now() + 86400000 * 7), "yyyy-MM-dd"), // Default 1 week
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['system_notifications_admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (notification: any) => {
      const { error } = await supabase
        .from('system_notifications')
        .insert([{
          ...notification,
          expiry_date: new Date(notification.expiry_date).toISOString()
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_notifications_admin'] });
      queryClient.invalidateQueries({ queryKey: ['system_notifications_active'] });
      toast.success("Notification created successfully");
      setIsDialogOpen(false);
      setNewNotification({
        title: "",
        description: "",
        link: "",
        expiry_date: format(new Date(Date.now() + 86400000 * 7), "yyyy-MM-dd"),
      });
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_notifications_admin'] });
      queryClient.invalidateQueries({ queryKey: ['system_notifications_active'] });
      toast.success("Notification deleted");
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Card className="border-none shadow-strong rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 overflow-hidden">
      <CardHeader className="border-b border-muted/20 bg-primary/5 py-6 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            Global System Notifications
          </CardTitle>
          <CardDescription>Broadcast messages to all users across all centers.</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-10 px-6 font-black uppercase text-xs tracking-widest shadow-strong">
              <Plus className="h-4 w-4 mr-2" /> New Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Create Notification</DialogTitle>
              <DialogDescription className="font-medium">
                This will appear as a popup to all users upon their next login.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-bold">Notification Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Scheduled Maintenance"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="font-bold">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information here..."
                  className="min-h-[100px]"
                  value={newNotification.description}
                  onChange={(e) => setNewNotification({ ...newNotification, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link" className="font-bold">Link (Optional)</Label>
                <Input
                  id="link"
                  placeholder="https://..."
                  value={newNotification.link}
                  onChange={(e) => setNewNotification({ ...newNotification, link: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry" className="font-bold">Expiry Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="expiry"
                    type="date"
                    className="pl-10"
                    value={newNotification.expiry_date}
                    onChange={(e) => setNewNotification({ ...newNotification, expiry_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl px-8 font-black uppercase text-xs tracking-widest"
                onClick={() => createMutation.mutate(newNotification)}
                disabled={!newNotification.title || !newNotification.description || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Broadcast
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-muted/10">
          {notifications?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic font-medium">
              No system notifications found.
            </div>
          ) : (
            notifications?.map((notification) => {
              const isExpired = new Date(notification.expiry_date) < new Date();
              return (
                <div key={notification.id} className="p-6 flex items-start justify-between hover:bg-muted/5 transition-colors">
                  <div className="flex gap-4">
                    <div className={`mt-1 p-2 rounded-xl ${isExpired ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-lg text-slate-800 leading-tight">{notification.title}</h4>
                        {isExpired && (
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
                        {notification.description}
                      </p>
                      <div className="flex flex-wrap gap-4 pt-2">
                        {notification.link && (
                          <div className="flex items-center text-[10px] font-black text-primary uppercase tracking-widest">
                            <LinkIcon className="h-3 w-3 mr-1.5" />
                            <a href={notification.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              External Link
                            </a>
                          </div>
                        )}
                        <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <CalendarIcon className="h-3 w-3 mr-1.5" />
                          Expires: {format(new Date(notification.expiry_date), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 rounded-xl"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this notification?")) {
                        deleteMutation.mutate(notification.id);
                      }
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemNotificationManager;
