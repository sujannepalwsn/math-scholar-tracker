import {
  BookOpen,
  CalendarIcon,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Users,
  XCircle,
  AlertTriangle,
  Book,
  GraduationCap,
  LayoutDashboard,
  Paintbrush,
  Printer,
  Star,
  Video,
  ClipboardCheck,
  DollarSign
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const centerId = user?.center_id;
  const role = user?.role;

  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ["students", centerId],
    queryFn: async () => {
      let query = supabase.from("students").select("*").eq("is_active", true).order("name");
      if (role !== "admin" && centerId) query = query.eq("center_id", centerId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !loading,
  });

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ["teachers", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("teachers").select("*").eq("center_id", centerId).eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const grades = [...new Set(students.map((s) => s.grade))];

  const { data: allAttendance = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["attendance-today", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("attendance").select("student_id, status, date").eq("center_id", centerId).eq("date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: teacherAttendance = [], isLoading: isTeacherAttendanceLoading } = useQuery({
    queryKey: ["teacher-attendance-today", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("teacher_attendance").select("*").eq("center_id", centerId).eq("date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: homeworkStats = [], isLoading: isHomeworkStatsLoading } = useQuery({
    queryKey: ["homework-stats-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("student_homework_records").select("status").eq("student_id", students[0]?.id).limit(1); // dummy check for RLS
      const { data: allRecords, error: allErr } = await supabase.from("student_homework_records").select("status, homework!inner(center_id)").eq("homework.center_id", centerId);
      if (allErr) throw allErr;
      return allRecords || [];
    },
    enabled: !!centerId && students.length > 0,
  });

  const { data: evaluationStats = [], isLoading: isEvaluationStatsLoading } = useQuery({
    queryKey: ["evaluation-stats-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("student_chapters").select("completed, evaluation_rating, lesson_plans!inner(center_id)").eq("lesson_plans.center_id", centerId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: allActivities = [], isLoading: isAllActivitiesLoading } = useQuery({
    queryKey: ["center-activities-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("activities").select("id").eq("center_id", centerId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: recentTestResults = [] } = useQuery({
    queryKey: ["recent-test-results-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("test_results").select("*, students(name, grade), tests(name, total_marks, subject)").order("date_taken", { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: homeworkDefaulters = [] } = useQuery({
    queryKey: ["homework-defaulters-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("student_homework_records").select("*, students(name, grade), homework(title, subject, due_date)").eq("status", "assigned").order("created_at", { ascending: false }).limit(15);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: recentDiscipline = [] } = useQuery({
    queryKey: ["recent-discipline-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("discipline_issues").select("*, students(name, grade)").eq("center_id", centerId).eq("status", "open").order("issue_date", { ascending: false }).limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: upcomingLessons = [] } = useQuery({
    queryKey: ["upcoming-lessons-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("lesson_plans").select("*").eq("center_id", centerId).gte("lesson_date", today).order("lesson_date").limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const totalStudents = students.length;
  const presentCount = allAttendance.filter(a => a.status === "present").length;
  const absentCount = allAttendance.filter(a => a.status === "absent").length;
  const unmarkedCount = totalStudents - presentCount - absentCount;
  const absentRate = totalStudents ? Math.round((absentCount / totalStudents) * 100) : 0;

  const isLoading = isStudentsLoading || isTeachersLoading || isAttendanceLoading || isTeacherAttendanceLoading || isHomeworkStatsLoading || isEvaluationStatsLoading || isAllActivitiesLoading;

  const teacherPresentCount = teacherAttendance.filter(a => a.status === "present").length;

  const teacherAttendanceRate = teachers.length > 0 ? Math.round((teacherPresentCount / teachers.length) * 100) : 0;

  const completedHomework = homeworkStats.filter(h => ["completed", "checked"].includes(h.status || "")).length;
  const homeworkRate = homeworkStats.length > 0 ? Math.round((completedHomework / homeworkStats.length) * 100) : 0;

  const ratedEvaluations = evaluationStats.filter(e => e.evaluation_rating !== null).length;
  const evaluationRate = evaluationStats.length > 0 ? Math.round((ratedEvaluations / evaluationStats.length) * 100) : 0;

  const avgTestScore = recentTestResults.length > 0
    ? Math.round(recentTestResults.reduce((acc, r: any) => acc + (r.marks_obtained / (r.tests?.total_marks || 100)) * 100, 0) / recentTestResults.length)
    : 0;

  const absentToday = students.filter((s) => allAttendance.some((a) => a.student_id === s.id && a.status === "absent"));

  const lowPerformers = recentTestResults.filter((r: any) => {
    const total = r.tests?.total_marks || 100;
    return r.marks_obtained < total * 0.4;
  }).slice(0, 10);

  const topPerformers = [...recentTestResults].sort((a: any, b: any) => {
    const aP = (a.marks_obtained / (a.tests?.total_marks || 100)) * 100;
    const bP = (b.marks_obtained / (b.tests?.total_marks || 100)) * 100;
    return bP - aP;
  }).slice(0, 5);

  const studentId = selectedStudent?.id;
  const { data: attendanceData = [] } = useQuery({
    queryKey: ["student-attendance", studentId], queryFn: async () => { if (!studentId) return []; const { data } = await supabase.from("attendance").select("*").eq("student_id", studentId).order("date"); return data || []; }, enabled: !!studentId,
  });
  const { data: chapterProgress = [] } = useQuery({
    queryKey: ["student-chapters", studentId], queryFn: async () => { if (!studentId) return []; const { data } = await supabase.from("student_chapters").select("*, lesson_plans(*)").eq("student_id", studentId).order("completed_at", { ascending: false }); return data || []; }, enabled: !!studentId,
  });
  const { data: testResults = [] } = useQuery({
    queryKey: ["student-test-results", studentId], queryFn: async () => { if (!studentId) return []; const { data } = await supabase.from("test_results").select("*, tests(*)").eq("student_id", studentId).order("date_taken", { ascending: false }); return data || []; }, enabled: !!studentId,
  });

  const totalDays = attendanceData.length;
  const presentDays = attendanceData.filter((a) => a.status === "present").length;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
  const completedChaptersCount = chapterProgress.filter((c) => c.completed).length;

  // Clickable card handler
  const handleCardClick = (path: string) => navigate(path);

  const StatCard = ({ title, value, icon: Icon, description, colorClass, path }: any) => (
    <Card
      onClick={() => handleCardClick(path)}
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className={cn("p-2.5 rounded-lg", colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of your institution's performance
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          <CalendarIcon className="h-4 w-4" />
          <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Student Attendance"
          value={`${totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0}%`}
          icon={Users}
          colorClass="bg-blue-100 text-blue-600"
          description={`${presentCount} of ${totalStudents} present`}
          path="/attendance-summary"
        />
        <StatCard
          title="Teacher Attendance"
          value={`${teacherAttendanceRate}%`}
          icon={Clock}
          colorClass="bg-green-100 text-green-600"
          description={`${teacherPresentCount} of ${teachers.length} present`}
          path="/teacher-attendance"
        />
        <StatCard
          title="Homework"
          value={`${homeworkRate}%`}
          icon={Book}
          colorClass="bg-orange-100 text-orange-600"
          description="Completion rate"
          path="/homework"
        />
        <StatCard
          title="Evaluations"
          value={`${evaluationRate}%`}
          icon={CheckCircle2}
          colorClass="bg-yellow-100 text-yellow-600"
          description="Syllabus coverage"
          path="/lesson-tracking"
        />
        <StatCard
          title="Test Scores"
          value={`${avgTestScore}%`}
          icon={TrendingUp}
          colorClass="bg-purple-100 text-purple-600"
          description="Average score"
          path="/tests"
        />
        <StatCard
          title="Activities"
          value={allActivities.length}
          icon={BookOpen}
          colorClass="bg-pink-100 text-pink-600"
          description="Total conducted"
          path="/activities"
        />
        <StatCard
          title="Discipline"
          value={recentDiscipline.length}
          icon={AlertTriangle}
          colorClass="bg-red-100 text-red-600"
          description="Open cases"
          path="/discipline"
        />
        <StatCard
          title="Lessons"
          value={upcomingLessons.length}
          icon={FileText}
          colorClass="bg-indigo-100 text-indigo-600"
          description="Upcoming this week"
          path="/lesson-plans"
        />
      </div>
      )}

      <Select value={gradeFilter} onValueChange={setGradeFilter}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All Grades</SelectItem>{grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
      </Select>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick("/attendance-summary")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-red-100">
                  <Users className="h-4 w-4 text-red-600" />
                </div>
                Absent Today
              </div>
              <Badge variant="secondary">{absentToday.length} students</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[280px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium">Name</TableHead>
                    <TableHead className="text-xs font-medium">Grade</TableHead>
                    <TableHead className="text-right text-xs font-medium">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentToday.filter(s => gradeFilter === "all" || s.grade === gradeFilter).length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">Everyone is present!</TableCell></TableRow>
                  ) : (
                    absentToday.filter(s => gradeFilter === "all" || s.grade === gradeFilter).map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); }}>
                        <TableCell className="font-medium text-sm">{s.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{s.grade}</Badge></TableCell>
                        <TableCell className="text-right text-xs text-primary hover:underline">View</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick("/homework")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-orange-100">
                  <Book className="h-4 w-4 text-orange-600" />
                </div>
                Pending Homework
              </div>
              <Badge variant="secondary">{homeworkDefaulters.length} pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[280px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium">Student</TableHead>
                    <TableHead className="text-xs font-medium py-2">Task</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest py-2">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {homeworkDefaulters.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic text-sm">All caught up!</TableCell></TableRow>
                ) : (
                  homeworkDefaulters.map((h: any) => (
                    <TableRow key={h.id} className="hover:bg-orange-50/50 transition-colors">
                      <TableCell className="font-bold text-sm py-3">{h.students?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">{h.homework?.title}</TableCell>
                      <TableCell className="text-right text-[10px] font-black text-orange-600 uppercase">{h.homework?.due_date ? format(new Date(h.homework.due_date), "MMM d") : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <Card className="border-none shadow-strong overflow-hidden rounded-2xl bg-white/40 backdrop-blur-md border border-white/20 transition-all hover:shadow-xl" onClick={() => handleCardClick("/tests")}>
          <CardHeader className="border-b border-muted/20 bg-muted/5 py-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                Performance Alerts
              </div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Critical Attention</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-2">Student</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-2">Test</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest py-2">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowPerformers.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic text-sm">No critical performance alerts.</TableCell></TableRow>
                ) : (
                  lowPerformers.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-red-50/50 transition-colors">
                      <TableCell className="font-bold text-sm py-3">{r.students?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground line-clamp-1">{r.tests?.name}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-black text-red-600">{r.marks_obtained}</span>
                        <span className="text-[10px] text-muted-foreground">/{r.tests?.total_marks}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none shadow-strong overflow-hidden rounded-2xl bg-white/40 backdrop-blur-md border border-white/20 transition-all hover:shadow-xl" onClick={() => handleCardClick("/discipline")}>
          <CardHeader className="border-b border-muted/20 bg-muted/5 py-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-600/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                Open Discipline Cases
              </div>
              <Badge className="bg-red-600 text-white font-black text-[10px]">{recentDiscipline.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-2">Student</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest py-2">Issue</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest py-2">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDiscipline.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic text-sm">No open discipline issues.</TableCell></TableRow>
                ) : (
                  recentDiscipline.map((d: any) => (
                    <TableRow key={d.id} className="hover:bg-red-50/50 transition-colors">
                      <TableCell className="font-bold text-sm py-3">{d.students?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{d.description}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={d.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px] font-black uppercase tracking-tighter">
                          {d.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-white/40 backdrop-blur-md border border-white/20 transition-all hover:shadow-xl group" onClick={() => handleCardClick("/lesson-plans")}>
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 group-hover:scale-110 transition-transform">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            Academic Roadmap: Upcoming Lessons
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {upcomingLessons.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="p-3 rounded-full bg-muted/10 inline-block">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground font-medium italic">No upcoming lessons planned for this week.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {upcomingLessons.map((lp: any) => (
                <div key={lp.id} className="relative p-5 rounded-2xl bg-white border border-muted/20 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all space-y-3 group/plan">
                  <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary/40 group-hover/plan:animate-ping" />
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px] font-black uppercase text-primary border-primary/20 bg-primary/5">{lp.subject}</Badge>
                    <h4 className="font-bold text-lg leading-tight group-hover/plan:text-primary transition-colors">{lp.chapter}</h4>
                    <p className="text-xs text-muted-foreground font-medium line-clamp-1">{lp.topic}</p>
                  </div>
                  <div className="pt-3 border-t border-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                      <CalendarIcon className="h-3 w-3" />
                      {lp.lesson_date && format(new Date(lp.lesson_date), "MMM d")}
                    </div>
                    {lp.grade && <Badge className="text-[9px] font-black h-5">{lp.grade}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-auto">
            <DialogHeader><DialogTitle>{selectedStudent.name} - Grade {selectedStudent.grade}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CalendarIcon className="h-4 w-4" />Attendance</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div><p className="text-xs text-muted-foreground">Present</p><p className="text-xl font-bold text-green-600">{presentDays}</p></div>
                    <div><p className="text-xs text-muted-foreground">Absent</p><p className="text-xl font-bold text-destructive">{totalDays - presentDays}</p></div>
                    <div><p className="text-xs text-muted-foreground">%</p><p className="text-xl font-bold">{attendancePercentage}%</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Chapters ({completedChaptersCount}/{chapterProgress.length})</CardTitle></CardHeader>
                <CardContent><div className="max-h-40 overflow-y-auto space-y-1">{chapterProgress.map((cp: any) => (
                  <div key={cp.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0"><span>{cp.lesson_plans?.chapter} ({cp.lesson_plans?.subject})</span><Badge variant={cp.completed ? "default" : "secondary"} className="text-[10px]">{cp.completed ? "Done" : "In Progress"}</Badge></div>
                ))}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Test Results</CardTitle></CardHeader>
                <CardContent><div className="max-h-40 overflow-y-auto space-y-1">{testResults.map((tr: any) => (
                  <div key={tr.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0"><span>{tr.tests?.name} ({tr.tests?.subject})</span><span className="font-semibold">{tr.marks_obtained}/{tr.tests?.total_marks}</span></div>
                ))}</div></CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
