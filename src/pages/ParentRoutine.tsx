import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar, Info, BookOpen, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

export default function ParentRoutine() {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(user?.student_id || null);

  const activeStudentId = selectedStudentId || user?.student_id;

  const { data: student } = useQuery({
    queryKey: ['student-routine-detail', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return null;
      const { data, error } = await supabase.from("students").select("id, name, grade").eq('id', activeStudentId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["period-schedules-parent", student?.grade, student?.center_id],
    queryFn: async () => {
      if (!student?.grade || !student?.center_id) return [];
      const { data, error } = await supabase
        .from("period_schedules")
        .select(`
          *,
          class_periods:class_periods(id, name, start_time, end_time, period_number, is_published)
        `)
        .eq("center_id", student.center_id)
        .eq("grade", student.grade)
        .order("day_of_week");
      if (error) throw error;
      return data;
    },
    enabled: !!student?.grade
  });

  const routineByDay = useMemo(() => {
    return DAYS_OF_WEEK.map(day => ({
      ...day,
      items: schedules
        .filter((s: any) => s.day_of_week === day.value)
        .sort((a: any, b: any) => (a.class_periods?.period_number || 0) - (b.class_periods?.period_number || 0))
    }));
  }, [schedules]);

  if (!activeStudentId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-slate-100/50 backdrop-blur-sm border border-slate-200">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">Please select a student to view their routine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 bg-white min-h-screen p-4 md:p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Class Routine
          </h1>
          <p className="text-slate-500 font-medium text-lg">
            Weekly instructional schedule for <span className="text-primary font-bold">{student?.name}</span> (Grade {student?.grade}).
          </p>
          <ChildSwitcher selectedId={activeStudentId} onSelect={setSelectedStudentId} />
        </div>
      </div>

      {schedulesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-50 animate-pulse rounded-[2rem]" />)}
        </div>
      ) : schedules.length === 0 ? (
        <div className="p-20 text-center flex flex-col items-center gap-4 bg-slate-50 rounded-[2.5rem] border-2 border-dashed">
          <Clock className="h-12 w-12 text-slate-300" />
          <p className="text-slate-400 font-medium italic">No routine has been published for this grade yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {routineByDay.map(day => (
            <Card key={day.value} className="border-none shadow-strong rounded-[2.5rem] overflow-hidden bg-white hover:shadow-medium transition-all">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                <CardTitle className="text-lg font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> {day.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {day.items.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No Classes</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {day.items.map((item: any) => (
                      <div key={item.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="space-y-1">
                            <p className="text-base font-black text-slate-800 group-hover:text-primary transition-colors">{item.subject}</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <Clock className="h-3 w-3" /> {item.class_periods?.start_time} - {item.class_periods?.end_time}
                            </div>
                          </div>
                          <Badge className="bg-primary/5 text-primary border-none rounded-lg text-[9px] font-black uppercase tracking-tighter">
                            Period {item.class_periods?.period_number}
                          </Badge>
                        </div>
                        {item.teacher_name && (
                          <div className="flex items-center gap-2 mt-3">
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                              <User className="h-3 w-3 text-slate-400" />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{item.teacher_name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
