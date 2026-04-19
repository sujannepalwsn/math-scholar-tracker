import React, { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Book, BookOpen, Clock, DollarSign, Download, Eye, FileText, GraduationCap, Printer, Star, Users, XCircle, TrendingUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils"
import { useMutation, useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { endOfMonth, format, isPast, subYears } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Tables } from "@/integrations/supabase/types"
import { formatCurrency, safeFormatDate, getGradeFormal } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";

type Test = Tables<'tests'>;
type TestResult = Tables<'test_results'>;

export default function ParentStudentReport() {
  const { user } = useAuth();
  const linkedStudents = useMemo(() => {
    const raw = user?.linked_students;
    if (!Array.isArray(raw)) return [];
    return raw.map(s => typeof s === 'string' ? { id: s, name: 'Student' } : s);
  }, [user?.linked_students]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (user?.student_id) return user.student_id;
    if (linkedStudents.length > 0) return linkedStudents[0].id;
    return "none";
  });

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subYears(new Date(), 1),
    to: endOfMonth(new Date())
  });
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [selectedPublishedExamId, setSelectedPublishedExamId] = useState<string>("none");

  // Fetch student details
  const { data: student } = useQuery({
    queryKey: ["student-detail-report", selectedStudentId],
    queryFn: async () => {
      if (selectedStudentId === "none") return null;
      const { data, error } = await supabase.from("students").select("id, name, grade, roll_number, status, center_id, photo_url").eq("id", selectedStudentId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: selectedStudentId !== "none"
  });

  // Fetch attendance
  const { data: attendanceData = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["student-attendance-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (selectedStudentId === "none") return [];
      const { data, error } = await supabase
        .from("attendance").select("id, student_id, date, status, center_id, time_in, time_out, remarks")
        .eq("student_id", selectedStudentId)
        .gte("date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("date", format(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: selectedStudentId !== "none"
  });

  // Fetch test results
  const { data: testResults = [], isLoading: isTestsLoading } = useQuery({
    queryKey: ["student-test-results-report", selectedStudentId, subjectFilter, dateRange],
    queryFn: async () => {
      if (selectedStudentId === "none") return [];
      let query = supabase.from("test_results")
        .select("id, marks_obtained, test_id, student_id, date_taken, tests!inner(id, name, total_marks)")
        .eq("student_id", selectedStudentId)
        .gte("date_taken", format(dateRange.from, "yyyy-MM-dd"))
        .lte("date_taken", format(dateRange.to, "yyyy-MM-dd"));

      if (subjectFilter !== "all") {
        query = query.eq("tests.subject", subjectFilter);
      }

      const { data, error } = await query.order("date_taken", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: selectedStudentId !== "none"
  });

  // Fetch exam results
  const { data: studentExams = [] } = useQuery({
    queryKey: ["student-exams-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (selectedStudentId === "none" || !student?.grade) return [];

      const { data: exams, error: examsError } = await supabase
        .from("exams").select("id, name, grade, academic_year, exam_date, status, center_id")
        .eq("center_id", student.center_id)
        .eq("grade", student.grade)
        .in("status", ["results_published"])
        .gte("exam_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("exam_date", format(dateRange.to, "yyyy-MM-dd"));

      if (examsError) throw examsError;
      if (!exams || exams.length === 0) return [];

      const examIds = exams.map(e => e.id);
      const { data: subjects, error: subjError } = await supabase.from("exam_subjects").select("id, exam_id, subject_name, full_marks, pass_marks").in("exam_id", examIds);
      if (subjError) throw subjError;

      const { data: marks, error: marksError } = await supabase.from("exam_marks").select("id, marks_obtained, student_id, exam_id, exam_subject_id").eq("student_id", selectedStudentId).in("exam_id", examIds);
      if (marksError) throw marksError;

      return exams.map(exam => {
        const examSubjects = subjects.filter(s => s.exam_id === exam.id);
        const examMarks = marks.filter(m => m.exam_id === exam.id);
        let totalObtained = 0;
        let totalFull = 0;

        const results = examSubjects.map(subj => {
          const mark = examMarks.find(m => m.exam_subject_id === subj.id);
          const obtained = mark?.marks_obtained || 0;
          totalObtained += obtained;
          totalFull += subj.full_marks;
          return { ...subj, obtained, passed: obtained >= subj.pass_marks };
        });

        return { ...exam, totalObtained, totalFull, percentage: totalFull > 0 ? (totalObtained / totalFull) * 100 : 0, results };
      });
    },
    enabled: !!student?.grade
  });

  const subjectPerformance = useMemo(() => {
    const map = new Map<string, { total: number, count: number }>();
    testResults.forEach(tr => {
      const s = tr.tests?.subject;
      if (s) {
        const entry = map.get(s) || { total: 0, count: 0 };
        entry.total += (tr.marks_obtained / (tr.tests.total_marks || 100)) * 100;
        entry.count++;
        map.set(s, entry);
      }
    });
    return Array.from(map.entries()).map(([name, { total, count }]) => ({
      name,
      percentage: Math.round(total / count)
    })).sort((a, b) => b.percentage - a.percentage);
  }, [testResults]);

  const performanceTrendData = useMemo(() => {
    const combined = [
      ...testResults.map(tr => ({
        date: tr.date_taken || tr.created_at,
        score: Math.round((tr.marks_obtained / (tr.tests?.total_marks || 100)) * 100)
      })),
      ...studentExams.map(e => ({
        date: e.exam_date || e.created_at,
        score: Math.round(e.percentage)
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return combined.map(d => ({
      ...d,
      formattedDate: format(new Date(d.date), "MMM d")
    }));
  }, [testResults, studentExams]);

  // Fetch discipline issues
  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ["student-discipline-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (selectedStudentId === "none") return [];
      const { data, error } = await supabase
        .from("discipline_issues")
        .select("id, description, severity, issue_date, status, discipline_categories(name)")
        .eq("student_id", selectedStudentId)
        .gte("issue_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("issue_date", format(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: selectedStudentId !== "none"
  });

  const stats = useMemo(() => {
    const attendanceRate = attendanceData.length > 0
      ? (attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100
      : 0;

    const avgScore = performanceTrendData.length > 0
      ? performanceTrendData.reduce((acc, curr) => acc + curr.score, 0) / performanceTrendData.length
      : 0;

    return { attendanceRate, avgScore, disciplineCount: disciplineIssues.length };
  }, [attendanceData, performanceTrendData, disciplineIssues]);

  // Fetch Learning Progress (student_chapters)
  const { data: chapters = [], isLoading: isChaptersLoading } = useQuery({
    queryKey: ['student-chapters-report', selectedStudentId],
    queryFn: async () => {
      if (selectedStudentId === "none") return [];
      const { data, error } = await supabase
        .from('student_chapters')
        .select('id, student_id, completed, evaluation_rating, lesson_plans(id, subject, chapter, topic)')
        .eq('student_id', selectedStudentId)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: selectedStudentId !== "none"
  });

  const isLoading = isAttendanceLoading || isTestsLoading || isChaptersLoading;

  if (selectedStudentId === "none") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <ChildSwitcher selectedId={selectedStudentId} onSelect={setSelectedStudentId} />
        <p className="text-slate-400 font-medium mt-8">Please select a student to view performance details.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 bg-white min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Performance Analytics</h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl leading-relaxed">
            Comprehensive breakdown of academic proficiency and growth trajectories for <span className="text-primary font-bold">{student?.name}</span>.
          </p>
          <ChildSwitcher selectedId={selectedStudentId} onSelect={setSelectedStudentId} />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date Range</label>
          <div className="flex gap-2">
            <Input
              type="date"
              className="h-12 bg-slate-50 border-slate-200 rounded-2xl font-bold text-xs"
              value={format(dateRange.from, "yyyy-MM-dd")}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
            />
            <Input
              type="date"
              className="h-12 bg-slate-50 border-slate-200 rounded-2xl font-bold text-xs"
              value={format(dateRange.to, "yyyy-MM-dd")}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject Focus</label>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-2xl font-bold text-xs">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 shadow-strong">
              <SelectItem value="all" className="font-bold text-xs">All Subjects</SelectItem>
              {Array.from(new Set(testResults.map(t => t.tests?.subject).filter(Boolean))).map(s => (
                <SelectItem key={s} value={s} className="font-bold text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8"><Skeleton className="h-[400px] w-full rounded-[2rem]" /></div>
      ) : (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-soft bg-slate-50/50 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Avg Proficiency</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black text-slate-900">{Math.round(stats.avgScore)}%</p>
                  <TrendingUp className="h-6 w-6 text-emerald-500 mb-1" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-soft bg-slate-50/50 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Attendance Rate</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black text-slate-900">{Math.round(stats.attendanceRate)}%</p>
                  <Clock className="h-6 w-6 text-primary mb-1" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-soft bg-slate-50/50 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Behavioral Flags</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black text-slate-900">{stats.disciplineCount}</p>
                  <AlertTriangle className={cn("h-6 w-6 mb-1", stats.disciplineCount > 0 ? "text-rose-500" : "text-emerald-500")} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Subject Proficiency */}
            <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Subject Proficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 100]} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Score Trajectory */}
            <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Score Trajectory
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Learning Progress */}
            <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-500" /> Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Chapter / Topic</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {chapters.length === 0 ? (
                        <tr><td colSpan={2} className="p-8 text-center text-slate-400 italic">No progress data</td></tr>
                      ) : (
                        chapters.slice(0, 10).map((chapter: any) => (
                          <tr key={chapter.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-700 text-sm">{chapter.lesson_plans?.chapter || 'Untitled'}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{chapter.lesson_plans?.topic}</p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={cn("text-[8px] font-black uppercase rounded-lg border-none",
                                chapter.completed ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                                {chapter.completed ? 'Completed' : 'In Progress'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Test Records Table */}
            <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Recent Evaluations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Assessment</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Score</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {testResults.length === 0 ? (
                        <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">No records</td></tr>
                      ) : (
                        testResults.slice(0, 5).map((tr: any) => {
                          const pct = Math.round((tr.marks_obtained / (tr.tests?.total_marks || 100)) * 100);
                          return (
                            <tr key={tr.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-700 text-sm">{tr.tests?.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{tr.tests?.subject}</p>
                              </td>
                              <td className="px-6 py-4 font-black text-slate-700 text-sm">{tr.marks_obtained} / {tr.tests?.total_marks}</td>
                              <td className="px-6 py-4">
                                <span className={cn("font-black text-xs", pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-orange-600" : "text-red-600")}>{pct}%</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Behavioral Log */}
            <Card className="border-none shadow-strong rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-500" /> Behavioral Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Incident</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Severity</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {disciplineIssues.length === 0 ? (
                        <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">No behavioral incidents</td></tr>
                      ) : (
                        disciplineIssues.slice(0, 5).map((issue: any) => (
                          <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-700 text-sm">{issue.discipline_categories?.name || 'Standard'}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{safeFormatDate(issue.issue_date, 'MMM d')}</p>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={cn("text-[8px] font-black uppercase rounded-lg border-none",
                                issue.severity === 'high' ? "bg-rose-100 text-rose-600" :
                                issue.severity === 'medium' ? "bg-amber-100 text-amber-600" :
                                "bg-emerald-100 text-emerald-600")}>
                                {issue.severity}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-500 capitalize">{issue.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
