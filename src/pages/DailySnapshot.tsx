import React, { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  TrendingUp,
  Star,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useNavigate } from "react-router-dom";

export default function DailySnapshot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const activeStudentId = useMemo(() => {
    if (user?.student_id) return user.student_id;
    const linked = user?.linked_students;
    if (Array.isArray(linked) && linked.length > 0) {
      return typeof linked[0] === 'string' ? linked[0] : linked[0].id;
    }
    return null;
  }, [user?.student_id, user?.linked_students]);

  const { data: student } = useQuery({
    queryKey: ['student-snapshot', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return null;
      const { data } = await supabase.from('students').select('*').eq('id', activeStudentId).single();
      return data;
    },
    enabled: !!activeStudentId
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance-today', activeStudentId],
    queryFn: async () => {
      const { data } = await supabase.from('attendance').select('*').eq('student_id', activeStudentId).eq('date', today).maybeSingle();
      return data;
    },
    enabled: !!activeStudentId
  });

  const { data: homework } = useQuery({
    queryKey: ['homework-today', activeStudentId],
    queryFn: async () => {
      const { data } = await supabase.from('student_homework_records').select('*, homework(*)').eq('student_id', activeStudentId).limit(3);
      return data;
    }
  });

  const { data: aiForecast } = useQuery({
    queryKey: ['ai-forecast-snapshot', activeStudentId],
    queryFn: async () => {
      const { data } = await supabase.from('predictive_scores').select('*').eq('student_id', activeStudentId).maybeSingle();
      return data;
    }
  });

  if (!activeStudentId) return <div className="p-8 text-center font-bold">No linked student found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="p-4 md:p-8 space-y-6 max-w-lg mx-auto">
        <DashboardHeader />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daily Snapshot</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(new Date(), "EEEE, MMMM do")}</p>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] px-3 py-1">
            Grade {student?.grade}
          </Badge>
        </div>

        {/* AI Insight Card */}
        {aiForecast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-none shadow-strong bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-3xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">AI Learning Forecast</p>
                    <h3 className="text-lg font-black">{aiForecast.risk_level === 'Low' ? 'Excellence Projected' : 'Attention Recommended'}</h3>
                  </div>
                </div>
                <p className="text-xs font-medium text-indigo-50 leading-relaxed">
                  {aiForecast.risk_level === 'Low'
                    ? "Based on recent consistency, your child is projected to maintain high performance this week."
                    : "Some performance variations detected. A quick review of today's topics might be beneficial."}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Today's Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-soft rounded-3xl bg-white p-5 flex flex-col items-center justify-center text-center space-y-2">
            <div className={cn("p-3 rounded-2xl", attendance?.status === 'present' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              {attendance?.status === 'present' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attendance</p>
            <p className="text-sm font-black text-slate-700">{attendance?.status === 'present' ? 'In Class' : 'Awaiting'}</p>
          </Card>

          <Card className="border-none shadow-soft rounded-3xl bg-white p-5 flex flex-col items-center justify-center text-center space-y-2" onClick={() => navigate('/parent-homework')}>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Homework</p>
            <p className="text-sm font-black text-slate-700">{homework?.filter(h => h.status !== 'completed').length || 0} Pending</p>
          </Card>
        </div>

        {/* Recent Performance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Milestones</h3>
            <TrendingUp className="h-4 w-4 text-slate-300" />
          </div>
          <div className="space-y-3">
            {homework?.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-primary text-xs">
                    {item.homework?.subject?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{item.homework?.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.status}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </motion.div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/parent-dashboard')}
          className="w-full py-4 bg-white border-2 border-slate-100 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 hover:bg-slate-50 transition-all shadow-soft"
        >
          View Full Dashboard
        </button>
      </div>
    </div>
  );
}
