import React, { useMemo, useState } from "react";
import { UserRole } from "@/types/roles";
import { Award, BarChart3, Percent, TrendingUp, Users, XCircle, PieChart as PieChartIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { getGradeFormal } from "@/lib/utils";

export default function ResultsDashboard() {
 const { user } = useAuth();
 const centerId = user?.center_id;
 const [selectedExamId, setSelectedExamId] = useState<string>("");

 const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

 const { data: exams = [] } = useQuery({
  queryKey: ["exams-list-dashboard", centerId, user?.role, user?.teacher_id, isRestricted],
  queryFn: async () => {
   if (!centerId) return [];
   let query = supabase
    .from("exams")
    .select("*")
    .eq("center_id", centerId)
    .order("created_at", { ascending: false });

   if (user?.role === UserRole.PARENT) {
    query = query.eq("status", "published");
   }

   if (user?.role === UserRole.TEACHER && user?.teacher_id) {
    const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user.teacher_id);
    const assignedGrades = assignments?.map(a => a.grade) || [];
    const { data: subjectAssignments } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user.teacher_id);
    const subjectGrades = subjectAssignments?.map(a => a.grade) || [];
    const allTeacherGrades = Array.from(new Set([...assignedGrades, ...subjectGrades]));

    if (isRestricted) {
      if (allTeacherGrades.length > 0) {
       query = query.in('grade', allTeacherGrades);
      } else {
       return [];
      }
    }
   }

   const { data, error } = await query;
   if (error) throw error;
   return data;
  },
  enabled: !!centerId,
 });

 const { data: subjects = [] } = useQuery({
  queryKey: ["result-subjects", selectedExamId],
  queryFn: async () => {
   if (!selectedExamId) return [];
   const { data, error } = await supabase.from("exam_subjects").select("*").eq("exam_id", selectedExamId);
   if (error) throw error;
   return data;
  },
  enabled: !!selectedExamId,
 });

 const { data: marks = [] } = useQuery({
  queryKey: ["result-marks", selectedExamId],
  queryFn: async () => {
   if (!selectedExamId) return [];
   const { data, error } = await supabase.from("exam_marks").select("*, students(name)").eq("exam_id", selectedExamId);
   if (error) throw error;
   return data;
  },
  enabled: !!selectedExamId,
 });

 const analytics = useMemo(() => {
  if (!marks.length || !subjects.length) return null;

  // Group marks by student
  const byStudent: Record<string, { name: string; total: number; fullTotal: number }> = {};
  marks.forEach((m: any) => {
   const sid = m.student_id;
   const subj = subjects.find((s: any) => s.id === m.exam_subject_id);
   if (!subj) return;
   if (!byStudent[sid]) byStudent[sid] = { name: m.students?.name || "Unknown", total: 0, fullTotal: 0 };
   byStudent[sid].total += (m.marks_obtained || 0);
   byStudent[sid].fullTotal += subj.full_marks;
  });

  const studentResults = Object.values(byStudent).map((s) => ({
   ...s,
   percentage: s.fullTotal > 0 ? (s.total / s.fullTotal) * 100 : 0,
  }));

  const totalStudents = studentResults.length;
  const passCount = studentResults.filter((s) => {
   // Check if all subjects passed
   const studentMarks = marks.filter((m: any) => m.student_id === Object.keys(byStudent).find(k => byStudent[k] === s));
   return s.percentage >= 40;
  }).length;
  const failCount = totalStudents - passCount;
  const classAvg = totalStudents > 0 ? studentResults.reduce((a, b) => a + b.percentage, 0) / totalStudents : 0;
  const topPerformer = studentResults.sort((a, b) => b.percentage - a.percentage)[0];

  // Subject-wise performance
  const subjectPerf = subjects.map((subj: any) => {
   const subjectMarks = marks.filter((m: any) => m.exam_subject_id === subj.id);
   const avg = subjectMarks.length > 0 ? subjectMarks.reduce((a: number, m: any) => a + (m.marks_obtained || 0), 0) / subjectMarks.length : 0;
   return { name: subj.subject_name, average: Math.round(avg * 10) / 10, fullMarks: subj.full_marks };
  });

  return {
   classAvg: Math.round(classAvg * 10) / 10,
   topPerformer,
   passCount,
   failCount,
   totalStudents,
   passPercentage: totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0,
   subjectPerf,
   pieData: [
    { name: "Pass", value: passCount, color: "hsl(var(--primary))" },
    { name: "Fail", value: failCount, color: "hsl(var(--destructive))" },
   ],
  };
 }, [marks, subjects]);

 return (
  <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div className="space-y-2">
     <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
       <BarChart3 className="h-8 w-8 text-primary animate-pulse" />
      </div>
      <div>
       <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
        Performance Analytics
       </h1>
       <div className="flex items-center gap-2 mt-1">
         <div className="h-2 w-2 rounded-full bg-primary" />
         <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Exam Result Insights Hub</p>
       </div>
      </div>
     </div>
    </div>
   </div>

   <div className="relative group">
    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
    <Card className="relative border border-border shadow-sm overflow-hidden bg-white border border-white/30 rounded-2xl">
     <CardContent className="p-6">
      <div className="space-y-2 max-w-md">
       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Examination Context</label>
       <Select value={selectedExamId} onValueChange={setSelectedExamId}>
        <SelectTrigger className="h-11 bg-white border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
         <SelectValue placeholder="Select an exam" />
        </SelectTrigger>
        <SelectContent className=" bg-white border-muted-foreground/10 rounded-xl font-bold">
         {exams.map((e: any) => (
          <SelectItem key={e.id} value={e.id}>
           {e.name} - Grade {e.grade}
           {e.status === 'draft' && " (Draft)"}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>
     </CardContent>
    </Card>
   </div>

   {analytics && (
    <>
     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border border-border shadow-sm rounded-2xl bg-white overflow-hidden border border-white/20">
       <CardContent className="p-6 text-center">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary opacity-50" />
        <p className="text-3xl font-black text-slate-700 leading-none">{analytics.classAvg}%</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-3">Class Median</p>
       </CardContent>
      </Card>
      <Card className="border border-border shadow-sm rounded-2xl bg-white overflow-hidden border border-white/20">
       <CardContent className="p-6 text-center">
        <Award className="h-8 w-8 mx-auto mb-2 text-amber-500 opacity-50" />
        <p className="text-xl font-black text-slate-700 leading-tight line-clamp-1">{analytics.topPerformer?.name}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-3">Top: {analytics.topPerformer?.percentage.toFixed(1)}%</p>
       </CardContent>
      </Card>
      <Card className="border border-border shadow-sm rounded-2xl bg-white overflow-hidden border border-white/20">
       <CardContent className="p-6 text-center">
        <Percent className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-50" />
        <p className="text-3xl font-black text-emerald-600 leading-none">{analytics.passPercentage}%</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-3">Efficiency Rate</p>
       </CardContent>
      </Card>
      <Card className="border border-border shadow-sm rounded-2xl bg-white overflow-hidden border border-white/20">
       <CardContent className="p-6 text-center">
        <XCircle className="h-8 w-8 mx-auto mb-2 text-rose-500 opacity-50" />
        <p className="text-3xl font-black text-rose-600 leading-none">{analytics.failCount}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-3">Attrition/Fail</p>
       </CardContent>
      </Card>
     </div>

     <div className="grid lg:grid-cols-2 gap-8">
      {/* Subject Performance Bar Chart */}
      <Card className="border border-border shadow-sm rounded-2xl bg-white overflow-hidden border border-white/20">
       <CardHeader className="bg-primary/5 border-b border-border/10 py-6">
        <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-2">
         <BarChart3 className="h-4 w-4 text-primary" />
         Cognitive Strength by Subject
        </CardTitle>
       </CardHeader>
       <CardContent className="p-8">
        <ResponsiveContainer width="100%" height={300}>
         <BarChart data={analytics.subjectPerf}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fontWeight: 'bold', fill: '#64748b'}} />
          <YAxis axisLine={false} tickLine={false} tick={{fontWeight: 'bold', fill: '#64748b', fontSize: 10}} />
          <Tooltip
           contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
           cursor={{fill: 'rgba(0,0,0,0.02)'}}
          />
          <Bar dataKey="average" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
         </BarChart>
        </ResponsiveContainer>
       </CardContent>
      </Card>

      {/* Pass vs Fail Pie Chart */}
      <Card className="border border-border shadow-sm rounded-2xl bg-white overflow-hidden border border-white/20">
       <CardHeader className="bg-primary/5 border-b border-border/10 py-6">
        <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-2">
         <PieChartIcon className="h-4 w-4 text-primary" />
         Outcome Distribution
        </CardTitle>
       </CardHeader>
       <CardContent className="p-8 flex justify-center">
        <ResponsiveContainer width="100%" height={300}>
         <PieChart>
          <Pie data={analytics.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} label>
           {analytics.pieData.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
           ))}
          </Pie>
          <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}} />
          <Legend iconType="circle" wrapperStyle={{fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', tracking: '0.1em'}} />
         </PieChart>
        </ResponsiveContainer>
       </CardContent>
      </Card>
     </div>
    </>
   )}

   {selectedExamId && !analytics && (
    <Card className="border border-border shadow-sm bg-white rounded-2xl"><CardContent className="p-12 text-center text-muted-foreground font-medium italic">No performance data identified for the selected examination.</CardContent></Card>
   )}
  </div>
 );
}
