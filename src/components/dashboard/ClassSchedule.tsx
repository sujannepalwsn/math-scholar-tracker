import { ArrowRight, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"

interface ClassItem {
  id: string;
  time: string;
  grade: string;
  teacher: string;
  subject: string;
  status: "completed" | "running" | "upcoming";
  lesson_plan_id?: string;
  isVacant?: boolean;
  isSubstitution?: boolean;
}

interface ClassScheduleProps {
  classes: ClassItem[];
  title?: string;
  className?: string;
  onItemClick?: (item: ClassItem) => void;
  onViewPlan?: (item: ClassItem) => void;
  onViewRoutine?: () => void;
}

export const ClassSchedule = ({
  classes,
  title = "Today's Classes",
  className,
  onItemClick,
  onViewPlan,
  onViewRoutine
}: ClassScheduleProps) => {
  const statusStyles: Record<string, string> = {
    completed: "bg-green-500/10 text-green-600 border-green-600/20",
    running: "bg-amber-500/10 text-amber-600 border-amber-600/20",
    upcoming: "bg-blue-500/10 text-blue-600 border-blue-600/20" };

  return (
    <Card className={cn("overflow-hidden border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl border border-border/20", className)}>
      <CardHeader className="py-4 border-b border-muted/20 bg-muted/5 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            {title}
          </div>
        </CardTitle>
        {onViewRoutine && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewRoutine}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl px-3 h-8"
          >
            Routine <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 max-h-[400px] overflow-y-auto">
        {classes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground italic text-sm">
            No classes scheduled for today.
          </div>
        ) : (
          <div className="divide-y divide-muted/10">
            {classes.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className={cn(
                  "p-4 flex justify-between items-center hover:bg-muted/5 transition-colors",
                  onItemClick && "cursor-pointer"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground/90 tracking-tight">{item.time}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-sm font-bold text-slate-700">Grade {item.grade}</span>
                    {item.isVacant && (
                      <Badge variant="destructive" className="h-4 px-1.5 text-[8px] font-black uppercase">Vacant</Badge>
                    )}
                    {item.isSubstitution && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 border-indigo-200">Covered</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{item.teacher} · {item.subject}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      statusStyles[item.status]
                    )}
                  >
                    {item.status}
                  </Badge>
                  {item.lesson_plan_id && onViewPlan && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[9px] font-black uppercase tracking-tighter text-primary bg-primary/5 hover:bg-primary/10 rounded-lg flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPlan(item);
                      }}
                    >
                      <FileText className="h-3 w-3" /> Plan
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
