import React from "react";
import { ArrowRight, Bell, X, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export interface AlertItem {
  id: string;
  title: string;
  description?: string;
  type: "success" | "warning" | "info" | "error";
  timestamp: string;
}

interface AlertListProps {
  alerts: AlertItem[];
  title?: string;
  className?: string;
  onItemClick?: (alert: AlertItem) => void;
  onViewAll?: () => void;
}

export const AlertList = ({
  alerts,
  title = "Recent Alerts",
  className,
  onItemClick,
  onViewAll: externalOnViewAll
}: AlertListProps) => {
  const [showAll, setShowAll] = React.useState(false);

  const typeIcons: Record<string, LucideIcon> = {
    success: Bell,
    warning: Bell,
    info: Bell,
    error: Bell };

  const typeStyles: Record<string, string> = {
    success: "bg-green-500/10 text-green-600 border-green-600/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-600/20",
    info: "bg-blue-500/10 text-blue-600 border-blue-600/20",
    error: "bg-rose-500/10 text-rose-600 border-rose-600/20" };

  return (
    <Card className={cn("overflow-hidden border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl border border-border/20", className)}>
      <CardHeader className="py-4 border-b border-muted/20 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          {title}
        </CardTitle>

        <Dialog open={showAll} onOpenChange={setShowAll}>
          <DialogTrigger asChild>
            {alerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl px-3 h-8"
              >
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-card/90 backdrop-blur-xl border-none shadow-strong rounded-[2rem] p-0 overflow-hidden">
            <DialogHeader className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-black text-foreground/90 tracking-tight flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  System Notifications
                </DialogTitle>
                <DialogDescription className="sr-only">List of all recent notifications and alerts</DialogDescription>
              </div>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 rounded-2xl bg-white border border-slate-100 flex gap-4 hover:shadow-md transition-all group"
                >
                  <div className={cn("p-3 rounded-xl shrink-0 h-fit group-hover:scale-110 transition-transform", typeStyles[alert.type])}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground/90">{alert.title}</h4>
                    {alert.description && (
                      <p className="text-sm text-slate-500 font-medium">{alert.description}</p>
                    )}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1">
                      {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {externalOnViewAll && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-center">
                <Button
                  onClick={() => {
                    setShowAll(false);
                    externalOnViewAll();
                  }}
                  className="rounded-xl font-black uppercase text-xs tracking-widest px-8"
                >
                  Go to Message Center
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground italic text-sm">
            No recent alerts.
          </div>
        ) : (
          <div className="divide-y divide-muted/10 max-h-[400px] overflow-y-auto custom-scrollbar">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => onItemClick?.(alert)}
                className={cn(
                  "p-4 flex gap-4 hover:bg-muted/5 transition-colors",
                  onItemClick && "cursor-pointer"
                )}
              >
                <div className={cn("p-2 rounded-full shrink-0 h-fit", typeStyles[alert.type])}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground/90 leading-none">{alert.title}</h4>
                  {alert.description && (
                    <p className="text-xs text-muted-foreground leading-tight">{alert.description}</p>
                  )}
                  <p className="text-[10px] font-medium text-muted-foreground/60 uppercase">
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
