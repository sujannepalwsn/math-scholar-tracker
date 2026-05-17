import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, ExternalLink, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GlobalPopup = () => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Load dismissed IDs from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('dismissed_system_notifications');
    if (stored) {
      try {
        setDismissedIds(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse dismissed notifications", e);
      }
    }
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['system_notifications_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_notifications')
        .select('*')
        .gt('expiry_date', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Filter out notifications already dismissed in this session
  const activeNotifications = notifications.filter(n => !dismissedIds.includes(n.id));

  useEffect(() => {
    if (activeNotifications.length > 0 && !isOpen) {
      setIsOpen(true);
      setCurrentIndex(0);
    } else if (activeNotifications.length === 0 && isOpen) {
      setIsOpen(false);
    }
  }, [activeNotifications.length, isOpen]);

  const handleDismiss = () => {
    if (activeNotifications.length === 0) return;

    const currentId = activeNotifications[currentIndex].id;
    const newDismissed = [...dismissedIds, currentId];
    setDismissedIds(newDismissed);
    sessionStorage.setItem('dismissed_system_notifications', JSON.stringify(newDismissed));

    if (currentIndex < activeNotifications.length - 1) {
      // Stay open but show next one would be better, but Dialog state is simpler
      // For a better UX, we can just increment index if we don't want to close/reopen
      // But standard shadcn Dialog might flicker if we just change content.
      // Let's try just staying open.
    } else {
      setIsOpen(false);
    }
  };

  const currentNotification = activeNotifications[currentIndex];

  if (!currentNotification) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleDismiss();
    }}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
        >
          {/* Decorative Header */}
          <div className="h-32 bg-gradient-to-br from-primary to-violet-600 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30">
                <Bell className="h-10 w-10 text-white animate-bounce" />
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white leading-tight">
                {currentNotification.title}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Official System Broadcast
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-center">
                {currentNotification.description}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {currentNotification.link && (
                <Button
                  asChild
                  className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-black uppercase tracking-widest text-xs transition-all duration-300 shadow-strong group"
                >
                  <a href={currentNotification.link} target="_blank" rel="noopener noreferrer">
                    Take Action <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
              >
                {activeNotifications.length > 1 ? `Next Notification (${currentIndex + 1}/${activeNotifications.length})` : 'Acknowledge & Close'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress indicators for multiple notifications */}
          {activeNotifications.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-6">
              {activeNotifications.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-primary' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalPopup;
