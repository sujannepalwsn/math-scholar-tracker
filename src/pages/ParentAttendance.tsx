import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, isMonday, isTuesday, isWednesday, isThursday, isFriday } from "date-fns";
import { Calendar, Clock, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, safeFormatDate } from "@/lib/utils";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";

export default function ParentAttendance() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(user?.student_id || null);

  const activeStudentId = selectedStudentId || user?.student_id;

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ['parent-attendance-detail', activeStudentId, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', activeStudentId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId
  });

  const stats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const excused = attendance.filter(a => a.status === 'excused').length;
    const rate = total > 0 ? (present / total) * 100 : 0;

    // Pattern Detection
    const dayCounts: Record<string, number> = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0 };
    attendance.filter(a => a.status === 'absent').forEach(a => {
      const d = new Date(a.date);
      if (isMonday(d)) dayCounts['Mon']++;
      if (isTuesday(d)) dayCounts['Tue']++;
      if (isWednesday(d)) dayCounts['Wed']++;
      if (isThursday(d)) dayCounts['Thu']++;
      if (isFriday(d)) dayCounts['Fri']++;
    });

    let worstDay = null;
    let maxAbsences = 0;
    Object.entries(dayCounts).forEach(([day, count]) => {
      if (count > maxAbsences) {
        maxAbsences = count;
        worstDay = day;
      }
    });

    return { total, present, absent, late, excused, rate, worstDay, maxAbsences };
  }, [attendance]);

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getDayStatus = (date: Date) => {
    return attendance.find(a => isSameDay(new Date(a.date), date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return "bg-emerald-500 text-white";
      case 'absent': return "bg-rose-500 text-white";
      case 'late': return "bg-amber-500 text-white";
      case 'excused': return "bg-blue-500 text-white";
      default: return "bg-slate-100 text-slate-400";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 mb-2">Attendance Insights</h1>
          <p className="text-slate-500 font-medium">Detailed presence monitoring and participation patterns.</p>
          <div className="mt-4">
            <ChildSwitcher selectedId={activeStudentId} onSelect={setSelectedStudentId} />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-black uppercase tracking-widest px-4">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setCurrentMonth(subMonths(currentMonth, -1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Stats & Patterns */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Clock className="h-4 w-4" /> Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="text-center py-4">
                <p className="text-2xl md:text-4xl font-black text-slate-900">{Math.round(stats.rate)}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attendance Rate</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-xl font-black text-emerald-600">{stats.present}</p>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Present</p>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                  <p className="text-xl font-black text-rose-600">{stats.absent}</p>
                  <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">Absent</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-xl font-black text-amber-600">{stats.late}</p>
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter">Late</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-xl font-black text-blue-600">{stats.excused}</p>
                  <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Excused</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {stats.maxAbsences > 0 && (
            <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white border-l-4 border-l-amber-500">
              <CardContent className="p-6 flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-amber-50 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 mb-1">Absence Pattern</h4>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    Most absences occur on <span className="font-bold text-slate-900">{stats.worstDay}s</span>. Consider if there's a reason for this weekly trend.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.rate < 75 && stats.total > 0 && (
            <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-rose-50 border border-rose-100">
              <CardContent className="p-6 flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-white shadow-sm shrink-0">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-rose-900 mb-1">Critical Low Threshold</h4>
                  <p className="text-sm font-medium text-rose-700 leading-relaxed">
                    Attendance is currently below the institutional requirement of 75%. This may impact academic outcome.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Calendar Grid */}
        <div className="lg:col-span-3">
          <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" /> Monthly Heatmap
                </CardTitle>
                <div className="flex gap-4">
                  {['present', 'absent', 'late', 'excused'].map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className={cn("h-2.5 w-2.5 rounded-full", getStatusColor(s))} />
                      <span className="text-[10px] font-bold uppercase text-slate-400">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-7 gap-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2">{day}</div>
                ))}
                {Array(startOfMonth(currentMonth).getDay()).fill(null).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {calendarDays.map(day => {
                  const record = getDayStatus(day);
                  return (
                    <TooltipProvider key={day.toISOString()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300 border-2",
                            record ? getStatusColor(record.status) : "bg-slate-50 border-transparent text-slate-400"
                          )}>
                            <span className="text-sm font-black">{format(day, 'd')}</span>
                            {record?.time_in && (
                              <span className="text-[8px] font-bold opacity-70 absolute bottom-2">{record.time_in}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        {record && (
                          <TooltipContent className="p-3 rounded-xl border-none shadow-strong bg-slate-900 text-white">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{safeFormatDate(day.toISOString(), 'PPPP')}</p>
                              <p className="text-xs font-bold capitalize">Status: {record.status}</p>
                              {record.time_in && <p className="text-xs font-medium">In: {record.time_in} | Out: {record.time_out || '-'}</p>}
                              {record.remarks && <p className="text-xs italic opacity-80 mt-1 border-t border-white/10 pt-1">"{record.remarks}"</p>}
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Log Table */}
      <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white mt-8">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" /> Daily Presence Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Time In</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Time Out</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-medium">No presence records identified for this month.</td>
                  </tr>
                ) : (
                  attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-700">{safeFormatDate(record.date, 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4">
                        <Badge className={cn("text-[9px] font-black uppercase rounded-lg border-none",
                          record.status === 'present' ? "bg-emerald-100 text-emerald-600" :
                          record.status === 'absent' ? "bg-rose-100 text-rose-600" :
                          record.status === 'late' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600")}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{record.time_in || "-"}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{record.time_out || "-"}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400 italic max-w-xs truncate">{record.remarks || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
