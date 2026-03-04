import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, CalendarIcon, CheckCircle2, FileText, TrendingUp, Users, XCircle } from "lucide-react";

import React, { useState } from "react";
export default function Dashboard() {
  const { user, loading } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const centerId = user?.center_id;
  const role = user?.role;

  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const { data: students = [] } = useQuery({
    queryKey: ["students", centerId],
    queryFn: async () => {
      let query = supabase.from("students").select("*").order("name");
      if (role !== "admin" && centerId) query = query.eq("center_id", centerId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !loading,
  });

  const filteredStudents = students.filter((s) => gradeFilter === "all" || s.grade === gradeFilter);
  const grades = [...new Set(students.map((s) => s.grade))];

  const { data: allAttendance = [] } = useQuery({
    queryKey: ["attendance", centerId],
    queryFn: async () => {
      const studentIds = students.map((s) => s.id);
      if (!studentIds.length) return [];
      const { data, error } = await supabase.from("attendance").select("*").in("student_id", studentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: students.length > 0,
  });

  const presentToday = students.filter((student) => allAttendance.some((att) => att.student_id === student.id && att.date === today && att.status === "present"));
  const absentToday = students.filter((student) => allAttendance.some((att) => att.student_id === student.id && att.date === today && att.status === "absent"));

  const totalStudents = students.length;
  const presentCount = presentToday.length;
  const absentCount = absentToday.length;
  const absentRate = totalStudents ? Math.round((absentCount / totalStudents) * 100) : 0;

  const studentAttendanceSummary = students.map((student) => {
    const studentAttendance = allAttendance.filter((a) => a.student_id === student.id);
    const present = studentAttendance.filter((a) => a.status === "present").length;
    const absent = studentAttendance.filter((a) => a.status === "absent").length;
    const total = present + absent;
    const percentage = total > 0 ? Math.round((absent / total) * 100) : 0;
    return { ...student, present, absent, total, percentage };
  });

  const highestAbsentees = [...studentAttendanceSummary].sort((a, b) => b.percentage - a.percentage).filter((s) => gradeFilter === "all" || s.grade === gradeFilter);

  const studentId = selectedStudent?.id;
  const { data: attendanceData = [] } = useQuery({
    queryKey: ["student-attendance", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase.from("attendance").select("*").eq("student_id", studentId).order("date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  const { data: chapterProgress = [] } = useQuery({
    queryKey: ["student-chapters", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase.from("student_chapters").select("*, lesson_plans(*)").eq("student_id", studentId).order("completed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ["student-test-results", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase.from("test_results").select("*, tests(*)").eq("student_id", studentId).order("date_taken", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });

  const totalDays = attendanceData.length;
  const presentDays = attendanceData.filter((a) => a.status === "present").length;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
  const totalChaptersCount = chapterProgress.length;
  const completedChaptersCount = chapterProgress.filter((c) => c.completed).length;
  const chapterCompletionPercentage = totalChaptersCount > 0 ? Math.round((completedChaptersCount / totalChaptersCount) * 100) : 0;
  const totalTests = testResults.length;
  const totalMarksObtained = testResults.reduce((sum, r) => sum + r.marks_obtained, 0);
  const totalMaxMarks = testResults.reduce((sum, r) => sum + (r.tests?.total_marks || 0), 0);
  const averagePercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div><h2 className="text-3xl font-bold tracking-tight">Dashboard</h2><p className="text-muted-foreground">Welcome back! Overview of today.</p></div>
      <div className="grid gap-6 md:grid-cols-4">
        {[
          { title: "Total Students", value: totalStudents, icon: Users, color: "text-primary", bgColor: "bg-primary/10", gradient: "from-primary/5 to-transparent" },
          { title: "Present Today", value: presentCount, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100", gradient: "from-green-500/5 to-transparent" },
          { title: "Absent Today", value: absentCount, icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10", gradient: "from-destructive/5 to-transparent" },
          { title: "Absent Rate", value: `${absentRate}%`, icon: TrendingUp, color: "text-orange-600", bgColor: "bg-orange-100", gradient: "from-orange-500/5 to-transparent" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={cn("relative overflow-hidden border-none shadow-soft group hover:scale-[1.02] transition-all duration-300 bg-gradient-to-br", stat.gradient)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <div className={cn("rounded-xl p-2.5 shadow-soft transition-transform group-hover:rotate-12", stat.bgColor)}><Icon className={cn("h-5 w-5", stat.color)} /></div>
              </CardHeader>
              <CardContent className="relative z-10"><div className="text-3xl font-extrabold tracking-tight">{stat.value}</div></CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex gap-4 items-center"><Select value={gradeFilter} onValueChange={setGradeFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="All Grades" /></SelectTrigger><SelectContent><SelectItem value="all">All Grades</SelectItem>{grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex gap-6 overflow-x-auto">
        <Card className="flex-1"><CardHeader><CardTitle>Absent Today</CardTitle></CardHeader><CardContent className="max-h-[400px] overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader><TableBody>{absentToday.map((s) => (<TableRow key={s.id} className="cursor-pointer hover:bg-muted" onClick={() => setSelectedStudent(s)}><TableCell>{s.name}</TableCell><TableCell>{s.grade}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
        <Card className="flex-1"><CardHeader><CardTitle>Highest Absentee</CardTitle></CardHeader><CardContent className="max-h-[400px] overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Absent %</TableHead></TableRow></TableHeader><TableBody>{highestAbsentees.map((s) => (<TableRow key={s.id} className="cursor-pointer hover:bg-muted" onClick={() => setSelectedStudent(s)}><TableCell>{s.name}</TableCell><TableCell>{s.percentage}%</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
      </div>
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}><DialogContent className="max-w-5xl w-full h-[90vh] overflow-auto"><DialogHeader className="sticky top-0 bg-background z-10"><DialogTitle>{selectedStudent.name} - Grade {selectedStudent.grade}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Card><CardHeader><CardTitle>Attendance</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{attendancePercentage}% Attendance</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Progress</CardTitle></CardHeader><CardContent><Progress value={chapterCompletionPercentage} className="h-2" /><p className="mt-2">{completedChaptersCount}/{totalChaptersCount} Chapters</p></CardContent></Card>
          </div>
        </DialogContent></Dialog>
      )}
    </div>
  );
}
