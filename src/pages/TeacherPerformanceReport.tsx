"use client";
import React, { useState } from "react";
import { BarChart3, BookOpen, CheckCircle, ClipboardCheck, Users } from "lucide-react";

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export default function TeacherPerformanceReport() {
  const { user } = useAuth();
  const [selectedTeacher, setSelectedTeacher] = useState("all");
  const [dateRange, setDateRange] = useState<"daily" | "weekly" | "monthly" | "overall">("monthly");

  const today = new Date();
  const getDateRange = () => {
    switch (dateRange) {
      case "daily": return { start: format(today, "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
      case "weekly": return { start: format(startOfWeek(today), "yyyy-MM-dd"), end: format(endOfWeek(today), "yyyy-MM-dd") };
      case "monthly": return { start: format(startOfMonth(today), "yyyy-MM-dd"), end: format(endOfMonth(today), "yyyy-MM-dd") };
      case "overall": return { start: "2020-01-01", end: format(today, "yyyy-MM-dd") };
    }
  };
  const range = getDateRange();

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-for-report", user?.center_id, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("teachers").select("id, name").eq("center_id", user.center_id).eq("is_active", true);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq('id', user.teacher_id);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  // Teacher attendance
  const { data: teacherAttendance = [] } = useQuery({
    queryKey: ["teacher-attendance-report", user?.center_id, range.start, range.end, selectedTeacher, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("teacher_attendance").select("*").eq("center_id", user.center_id).gte("date", range.start).lte("date", range.end);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq('teacher_id', user.teacher_id);
      } else if (selectedTeacher !== "all") {
        query = query.eq("teacher_id", selectedTeacher);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id });

  // Lesson plans created
  const { data: lessonPlans = [] } = useQuery({
    queryKey: ["lesson-plans-report", user?.center_id, range.start, range.end, selectedTeacher, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("lesson_plans").select("*").eq("center_id", user.center_id).gte("lesson_date", range.start).lte("lesson_date", range.end);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq('teacher_id', user.teacher_id);
      } else if (selectedTeacher !== "all") {
        query = query.eq("teacher_id", selectedTeacher);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id });

  // Homework assigned
  const { data: homework = [] } = useQuery({
    queryKey: ["homework-report", user?.center_id, range.start, range.end, selectedTeacher, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("homework").select("*").eq("center_id", user.center_id).gte("due_date", range.start).lte("due_date", range.end);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq('teacher_id', user.teacher_id);
      } else if (selectedTeacher !== "all") {
        query = query.eq("teacher_id", selectedTeacher);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id });

  // Student chapters (evaluations)
  const { data: evaluations = [] } = useQuery({
    queryKey: ["evaluations-report", user?.center_id, range.start, range.end, selectedTeacher, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("student_chapters").select("*").gte("completed_at", range.start).lte("completed_at", range.end);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq('recorded_by_teacher_id', user.teacher_id);
      } else if (selectedTeacher !== "all") {
        query = query.eq("recorded_by_teacher_id", selectedTeacher);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id });

  // Build per-teacher stats
  const teacherStats = teachers.map(t => {
    const att = teacherAttendance.filter(a => a.teacher_id === t.id);
    const presentDays = att.filter(a => a.status === "present").length;
    const totalAttDays = att.length;
    const lps = lessonPlans.filter(lp => lp.teacher_id === t.id);
    const hws = homework.filter(hw => hw.teacher_id === t.id);
    const evals = evaluations.filter(e => e.recorded_by_teacher_id === t.id);

    return {
      id: t.id,
      name: t.name,
      attendancePresent: presentDays,
      attendanceTotal: totalAttDays,
      attendancePct: totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 0,
      lessonPlans: lps.length,
      homework: hws.length,
      evaluations: evals.filter(e => e.recorded_by_teacher_id === t.id).length };
  }).filter(t => selectedTeacher === "all" || t.id === selectedTeacher);

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Faculty Performance Insights
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Evaluate faculty efficiency and curricular consistency.</p>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium p-6 overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Faculty Member</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue placeholder="All Faculty" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                  <SelectItem value="all">All Faculty Members</SelectItem>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px] space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Analysis Period</Label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                  <SelectItem value="daily">Daily Pulse</SelectItem>
                  <SelectItem value="weekly">Weekly Cycle</SelectItem>
                  <SelectItem value="monthly">Monthly Audit</SelectItem>
                  <SelectItem value="overall">Cumulative Registry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Staff Attendance", value: `${Math.round(teacherStats.reduce((s, t) => s + t.attendancePct, 0) / (teacherStats.length || 1))}%`, icon: Users, colorClass: "bg-green-500/10 text-green-600", desc: "Average presence" },
          { title: "Lesson Output", value: teacherStats.reduce((s, t) => s + t.lessonPlans, 0), icon: BookOpen, colorClass: "bg-primary/10 text-primary", desc: "Modules developed" },
          { title: "Homework Flow", value: teacherStats.reduce((s, t) => s + t.homework, 0), icon: ClipboardCheck, colorClass: "bg-orange-500/10 text-orange-600", desc: "Assignments dispatched" },
          { title: "Evaluation Rate", value: teacherStats.reduce((s, t) => s + t.evaluations, 0), icon: CheckCircle, colorClass: "bg-primary/10 text-primary", desc: "Milestones verified" },
        ].map(s => (
          <Card key={s.title} className="border-none shadow-strong rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 group hover:-translate-y-1 transition-all duration-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl transition-transform group-hover:rotate-6", s.colorClass)}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{s.title}</p>
                  <h3 className="text-3xl font-black tracking-tighter mt-1">{s.value}</h3>
                </div>
              </div>
              <div className="pt-4 border-t border-muted/10">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Table */}
      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            Faculty Efficiency Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Faculty Member</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Presence Dynamics</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Lesson Velocity</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Homework Index</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Eval Index</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-medium italic">
                      No efficiency metrics discovered for the current parameters.
                    </TableCell>
                  </TableRow>
                ) : teacherStats.map(t => (
                  <TableRow key={t.id} className="group transition-all duration-300 hover:bg-card/60">
                    <TableCell className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="font-black text-slate-700 group-hover:text-primary transition-colors leading-none">{t.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Certified Instructor</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                          <span>{t.attendancePct}% Reliability</span>
                          <span>{t.attendancePresent}/{t.attendanceTotal}D</span>
                        </div>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
                          <div
                            className={cn(
                              "h-full transition-all duration-1000 ease-out",
                              t.attendancePct >= 90 ? "bg-green-500" : t.attendancePct >= 75 ? "bg-primary" : "bg-orange-500"
                            )}
                            style={{ width: `${t.attendancePct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 font-black text-slate-600">{t.lessonPlans}</TableCell>
                    <TableCell className="px-6 py-4 font-black text-slate-600">{t.homework}</TableCell>
                    <TableCell className="px-6 py-4 font-black text-slate-600">{t.evaluations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
