import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Bell, Book, BookOpen, Calendar, CalendarIcon, CheckCircle, CheckCircle2, ClipboardCheck, Clock, DollarSign, Download, Eye, FileText, GraduationCap, Home, Info, Paintbrush, Printer, Star, Target, TrendingUp, User, Users, Wallet, XCircle } from "lucide-react";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { eachDayOfInterval, endOfMonth, format, isFuture, isPast, isToday, startOfDay, subDays, subYears } from "date-fns"
import { cn, formatCurrency, safeFormatDate } from "@/lib/utils"
import { KPICard } from "@/components/dashboard/KPICard"
import { AlertList } from "@/components/dashboard/AlertList"
import { ClassSchedule } from "@/components/dashboard/ClassSchedule"
import CenterLogo from "@/components/CenterLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Tables } from "@/integrations/supabase/types"
import { Invoice, Payment } from "@/integrations/supabase/finance-types"

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1 } } });

type StudentHomeworkRecord = Tables<'student_homework_records'>;
type LessonPlan = Tables<'lesson_plans'>;
type StudentChapter = Tables<'student_chapters'>;
type Test = Tables<'tests'>;
type Homework = Tables<'homework'>;
type TestResult = Tables<'test_results'>;

interface ChapterPerformanceGroup {
  lessonPlan: LessonPlan;
  studentChapters: (StudentChapter & { recorded_by_teacher?: Tables<'teachers'> })[];
  testResults: (TestResult & { tests: Pick<Test, 'id' | 'name' | 'subject' | 'total_marks' | 'lesson_plan_id' | 'questions'> })[];
  homeworkRecords: (StudentHomeworkRecord & { homework: Pick<Homework, 'id' | 'title' | 'subject' | 'due_date'> })[];
}

const ParentDashboardContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30).toISOString().split("T")[0],
    to: today
  });

  const linkedStudents = user?.linked_students || [];
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    user?.student_id || linkedStudents[0]?.id || null
  );

  const [selectedChapterDetail, setSelectedChapterDetail] = useState<ChapterPerformanceGroup | null>(null);
  const [selectedDisciplineIssue, setSelectedDisciplineIssue] = useState<any>(null);

  useEffect(() => {
    if (!selectedStudentId && linkedStudents.length > 0) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  const activeStudentId = selectedStudentId || user?.student_id;

  const { data: student } = useQuery({
    queryKey: ['student', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return null;
      const { data, error } = await supabase.from('students').select('*').eq('id', activeStudentId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', activeStudentId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', activeStudentId)
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId });

  const { data: testResults = [] } = useQuery({
    queryKey: ['test-results-parent-dashboard', activeStudentId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('test_results')
        .select('*, tests!inner(id, name, subject, total_marks, lesson_plan_id, questions)')
        .eq('student_id', activeStudentId)
        .gte('date_taken', dateRange.from)
        .lte('date_taken', dateRange.to)
        .order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId });

  const { data: homeworkStatus = [] } = useQuery({
    queryKey: ['student-homework-records', activeStudentId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from('student_homework_records')
        .select('*, homework(*)')
        .eq('student_id', activeStudentId)
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId });

  const { data: invoices = [] } = useQuery({
    queryKey: ['student-invoices-dashboard', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('invoices').select('*').eq('student_id', activeStudentId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeStudentId });

  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['student-lesson-records', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('student_chapters').select(`
        *,
        lesson_plans!inner(id, subject, chapter, topic, lesson_date, lesson_file_url, grade, notes),
        recorded_by_teacher:recorded_by_teacher_id(name)
      `).eq('student_id', activeStudentId).order('completed_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId });

  // Fetch activities (participations)
  const { data: preschoolActivities = [] } = useQuery({
    queryKey: ["student-preschool-activities-report", activeStudentId, dateRange],
    queryFn: async () => {
      if (!activeStudentId) return [];
      let query = supabase.from("student_activities").select("*, activities(title, description, activity_date, photo_url, video_url, activity_type_id, activity_types(name))")
        .eq("student_id", activeStudentId)
        .gte("created_at", `${dateRange.from}T00:00:00`)
        .lte("created_at", `${dateRange.to}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId });

  // Fetch discipline issues
  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ["student-discipline-issues-report", activeStudentId, dateRange],
    queryFn: async () => {
      if (!activeStudentId) return [];
      let query = supabase.from("discipline_issues").select("*, discipline_categories(name)")
        .eq("student_id", activeStudentId)
        .gte("issue_date", dateRange.from)
        .lte("issue_date", dateRange.to);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ["student-payments-report", activeStudentId, dateRange],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', activeStudentId);

      if (invError) throw invError;
      if (!invoices || invoices.length === 0) return [];

      const invoiceIds = invoices.map(inv => inv.id);
      const { data, error } = await supabase.from("payments").select("*")
        .in("invoice_id", invoiceIds)
        .gte("payment_date", dateRange.from)
        .lte("payment_date", dateRange.to);
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!activeStudentId });

  // Fetch all lesson plans for context
  const { data: allLessonPlans = [] } = useQuery({
    queryKey: ["all-lesson-plans-for-report", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("id, subject, chapter, topic, grade, lesson_date, notes, lesson_file_url")
        .eq("center_id", user.center_id)
        .order("lesson_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: studentRoutine = [] } = useQuery({
    queryKey: ["student-routine", student?.grade, user?.center_id],
    queryFn: async () => {
      if (!student?.grade || !user?.center_id) return [];
      const dayOfWeek = new Date().getDay();
      const { data, error } = await supabase
        .from("period_schedules")
        .select("*, teachers(name), class_periods!inner(*)")
        .eq("center_id", user.center_id)
        .eq("grade", student.grade)
        .eq("day_of_week", dayOfWeek)
        .eq("class_periods.is_published", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!student?.grade && !!user?.center_id
  });

  const attendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    return range.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const record = attendance.find(a => a.date === dayStr);
      return { date: format(day, "MMM d"), value: record ? (record.status === "present" ? 100 : 0) : 0 };
    });
  }, [attendance, dateRange]);

  const performanceTrend = useMemo(() => {
    return testResults.map(tr => ({
      date: format(new Date(tr.date_taken), "MMM d"),
      value: Math.round((tr.marks_obtained / (tr.tests?.total_marks || 100)) * 100)
    })).reverse().slice(-7);
  }, [testResults]);

  const totalInvoiced = useMemo(() => invoices.reduce((acc, inv) => acc + inv.total_amount, 0), [invoices]);
  const totalPaid = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0), [invoices]);
  const outstandingDues = totalInvoiced - totalPaid;
  const attendanceRate = attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;
  const homeworkPendingCount = homeworkStatus.filter(hs => !['completed', 'checked'].includes(hs.status)).length;
  const avgPerformance = performanceTrend.length > 0 ? Math.round(performanceTrend.reduce((a, b) => a + b.value, 0) / performanceTrend.length) : 0;

  const subjectPerformance = useMemo(() => {
    const subjectsMap = new Map<string, { total: number; count: number }>();
    testResults.forEach((tr: any) => {
      const subject = tr.tests?.subject;
      if (subject) {
        if (!subjectsMap.has(subject)) subjectsMap.set(subject, { total: 0, count: 0 });
        const pct = (tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100;
        const entry = subjectsMap.get(subject)!;
        entry.total += pct;
        entry.count += 1;
      }
    });
    return Array.from(subjectsMap.entries()).map(([name, { total, count }]) => ({
      name,
      percentage: Math.round(total / count)
    })).sort((a, b) => b.percentage - a.percentage);
  }, [testResults]);

  const overdueHomeworks = useMemo(() => {
    return homeworkStatus.filter((hs: any) => {
      const dueDate = hs.homework?.due_date ? new Date(hs.homework.due_date) : null;
      return dueDate && isPast(dueDate) && !['completed', 'checked'].includes(hs.status);
    });
  }, [homeworkStatus]);

  const formattedRoutine = useMemo(() => {
    return studentRoutine.map((ps: any) => ({
      id: ps.id,
      time: ps.class_periods ? `${ps.class_periods.start_time?.slice(0, 5)} - ${ps.class_periods.end_time?.slice(0, 5)}` : "N/A",
      grade: ps.grade,
      teacher: ps.teachers?.name || "Unassigned",
      subject: ps.subject,
      status: (() => {
        if (!ps.class_periods) return "upcoming" as const;
        const now = new Date();
        const [sh, sm] = (ps.class_periods.start_time || "").split(":").map(Number);
        const [eh, em] = (ps.class_periods.end_time || "").split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (nowMin >= endMin) return "completed" as const;
        if (nowMin >= startMin) return "running" as const;
        return "upcoming" as const;
      })()
    })).sort((a: any, b: any) => a.time.localeCompare(b.time));
  }, [studentRoutine]);

  const getRatingStars = (rating: number | null) => {
    if (rating === null) return "N/A";
    return Array(rating).fill("⭐").join("");
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const parentAlerts = [
    ...homeworkStatus.filter(hs => hs.homework?.due_date && isPast(new Date(hs.homework.due_date)) && !['completed', 'checked'].includes(hs.status)).map(hs => ({
      id: `hw-${hs.id}`,
      title: `Overdue Homework: ${hs.homework?.title}`,
      type: "error" as const,
      timestamp: hs.homework?.due_date
    })),
    ...attendance.filter(a => a.status === 'absent').slice(0, 2).map(a => ({
      id: `att-${a.id}`,
      title: `Absence recorded for ${format(new Date(a.date), "MMM d")}`,
      type: "warning" as const,
      timestamp: a.date
    }))
  ].slice(0, 5);

  const chapterPerformanceData: ChapterPerformanceGroup[] = useMemo(() => {
    const dataMap = new Map<string, ChapterPerformanceGroup>();

    // Process student_chapters (lesson evaluations)
    lessonRecords.forEach((sc: any) => {
      if (sc.lesson_plan_id && sc.lesson_plans) {
        if (!dataMap.has(sc.lesson_plan_id)) {
          dataMap.set(sc.lesson_plan_id, {
            lessonPlan: sc.lesson_plans,
            studentChapters: [],
            testResults: [],
            homeworkRecords: [] });
        }
        dataMap.get(sc.lesson_plan_id)?.studentChapters.push(sc);
      }
    });

    // Process test results
    testResults.forEach((tr: any) => {
      if (tr.tests?.lesson_plan_id) {
        if (!dataMap.has(tr.tests.lesson_plan_id)) {
          const correspondingLessonPlan = allLessonPlans.find(lp => lp.id === tr.tests.lesson_plan_id);
          if (correspondingLessonPlan) {
            dataMap.set(tr.tests.lesson_plan_id, {
              lessonPlan: correspondingLessonPlan as any,
              studentChapters: [],
              testResults: [],
              homeworkRecords: [] });
          } else {
            return;
          }
        }
        dataMap.get(tr.tests.lesson_plan_id)?.testResults.push(tr);
      }
    });

    // Process homework records
    homeworkStatus.forEach((hs: any) => {
      const hwSubject = hs.homework?.subject;
      if (hwSubject) {
        const matchingLessonPlan = allLessonPlans.find(lp => lp.subject === hwSubject);
        if (matchingLessonPlan && dataMap.has(matchingLessonPlan.id)) {
          dataMap.get(matchingLessonPlan.id)?.homeworkRecords.push(hs);
        }
      }
    });

    // Sort by lesson plan date
    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(b.lessonPlan.lesson_date).getTime() - new Date(a.lessonPlan.lesson_date).getTime()
    );
  }, [lessonRecords, testResults, homeworkStatus, allLessonPlans]);

  if (!user || user.role !== 'parent') {
    navigate('/login-parent');
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <CenterLogo size="lg" />
        <div className="flex items-center gap-4">
          {linkedStudents.length > 1 && (
            <Select value={selectedStudentId || ''} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-48 bg-white border-none shadow-soft rounded-2xl font-bold h-11">
                <SelectValue placeholder="Select Child" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-strong">
                {linkedStudents.map((child) => (
                  <SelectItem key={child.id} value={child.id} className="font-bold py-3">{child.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="icon" className="relative bg-white shadow-soft rounded-xl">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full border-2 border-white" />
          </Button>
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-2xl shadow-soft">
            <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center overflow-hidden">
               <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground/90 leading-none">{user?.username?.split('@')[0]}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2 bg-card/60 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-border/40">
          <div className="p-2 bg-primary text-white rounded-lg">
            <GraduationCap className="h-4 w-4" />
          </div>
          <Badge variant="outline" className="text-xs font-black text-primary tracking-tight uppercase">{student?.name || "Learning Odyssey"}</Badge>
          <div className="flex items-center gap-2 px-3 border-l border-slate-200 ml-2">
             <Calendar className="h-4 w-4 text-slate-400" />
             <span className="text-xs font-bold text-slate-600">{format(new Date(), "eee, MMM d")}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card/60 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-border/40">
           <Input
             type="date"
             value={dateRange.to}
             onChange={(e) => setDateRange({...dateRange, to: e.target.value, from: subDays(new Date(e.target.value), 30).toISOString().split('T')[0]})}
             className="h-9 w-40 border-none bg-transparent text-xs font-bold text-slate-700 focus-visible:ring-0"
           />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard title="Attendance Rate" value={`${attendanceRate}%`} description="Presence Index" icon={Clock} color="green" trendData={attendanceTrend} onClick={() => scrollToSection("attendance-section")} />
        <KPICard title="Avg Performance" value={`${avgPerformance}%`} description="Evaluation Synthesis" icon={TrendingUp} color="purple" trendData={performanceTrend} onClick={() => scrollToSection("tests-section")} />
        <KPICard title="Homework Pending" value={homeworkPendingCount} description="Active Assignments" icon={Book} color="orange" onClick={() => scrollToSection("overdue-homework-section")} />
        <KPICard title="Fees Payable" value={`₹${outstandingDues}`} description="Outstanding Liability" icon={Wallet} color="rose" onClick={() => scrollToSection("finance-section")} />
      </div>

      {/* Subject Wise Performance Cards */}
      {subjectPerformance.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Subject Performance</h3>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
            {subjectPerformance.map((sp) => (
              <Card key={sp.name} className="border-none shadow-soft bg-card/60 backdrop-blur-sm overflow-hidden group hover:shadow-medium transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[80px] md:max-w-none">{sp.name}</p>
                      <p className="text-xl font-black group-hover:text-primary transition-colors">{sp.percentage}%</p>
                    </div>
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      sp.percentage >= 75 ? "bg-green-500" : sp.percentage >= 50 ? "bg-orange-500" : "bg-red-500"
                    )} />
                  </div>
                  <div className="mt-2 w-full h-1 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000",
                        sp.percentage >= 75 ? "bg-green-500" : sp.percentage >= 50 ? "bg-orange-500" : "bg-red-500"
                      )}
                      style={{ width: `${sp.percentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl border border-border/20 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-slate-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg font-black flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10"><BookOpen className="h-6 w-6 text-primary" /></div>
                  Academic Progress Matrix
                </CardTitle>
                <div className="flex items-center gap-2 bg-card/60 p-1 rounded-xl border border-border/40 shadow-soft">
                   <Input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="h-8 w-32 border-none bg-transparent text-[10px] font-black uppercase" />
                   <span className="text-[10px] font-black text-slate-300">TO</span>
                   <Input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="h-8 w-32 border-none bg-transparent text-[10px] font-black uppercase" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left min-w-[700px]">
                  <thead className="bg-muted/50 border-b sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Subject</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Topic</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Evaluation</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Homework</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Result</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {chapterPerformanceData.map((chapterGroup) => {
                      const evaluation = chapterGroup.studentChapters[0];
                      const testResult = chapterGroup.testResults[0];
                      const homework = chapterGroup.homeworkRecords[0];

                      const avgPct = chapterGroup.testResults.length > 0
                        ? Math.round(chapterGroup.testResults.reduce((acc, tr) => acc + (tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100, 0) / chapterGroup.testResults.length)
                        : null;

                      return (
                        <tr key={chapterGroup.lessonPlan.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-semibold">{chapterGroup.lessonPlan.subject}</td>
                          <td className="px-6 py-4">
                            <p className="font-medium">{chapterGroup.lessonPlan.topic}</p>
                            <p className="text-[10px] text-muted-foreground">Chapter: {chapterGroup.lessonPlan.chapter}</p>
                          </td>
                          <td className="px-6 py-4">
                            {evaluation ? getRatingStars(evaluation.evaluation_rating) : <span className="text-muted-foreground italic text-xs">N/A</span>}
                          </td>
                          <td className="px-6 py-4">
                            {homework ? (
                              <Badge variant={homework.status === 'completed' || homework.status === 'checked' ? 'success' : homework.status === 'in_progress' ? 'warning' : 'destructive'} className="text-[9px] uppercase font-bold">
                                {homework.status}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold">
                            {avgPct !== null ? (
                              <span className={cn(avgPct >= 75 ? "text-green-600" : avgPct >= 50 ? "text-orange-600" : "text-red-600")}>
                                {avgPct}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full"
                              onClick={() => setSelectedChapterDetail(chapterGroup)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        <AlertList alerts={parentAlerts} onViewAll={() => navigate("/parent-messages")} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ClassSchedule classes={formattedRoutine} title="Daily Learning Schedule" />
        <Card className="md:col-span-2 border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl border border-border/20">
          <CardHeader><CardTitle className="text-lg font-bold">Educational Milestones</CardTitle></CardHeader>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground italic">Comprehensive tracking of your child's educational journey and institutional engagements.</p>
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                className="rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-soft bg-white hover:bg-slate-50 w-full"
                onClick={() => navigate("/parent-student-report")}
              >
                <BarChart3 className="mr-2 h-4 w-4 text-primary" />
                Open Academic Dossier
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div id="printable-report" className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[hsl(var(--background))] px-4 text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
                Detailed Academic Profile
              </span>
            </div>
          </div>

          {/* Finance Summary */}
          <Card id="finance-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-sm font-semibold">Total Invoiced: {formatCurrency(totalInvoiced)}</div>
                <div className="text-sm font-semibold">Total Paid: {formatCurrency(totalPaid)}</div>
                <div className="text-sm font-bold text-rose-600">Outstanding Dues: {formatCurrency(outstandingDues)}</div>
              </div>
              <h3 className="font-semibold mb-2">Payment History</h3>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No payments recorded.</p>
              ) : (
                <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left">Date</th>
                        <th className="border-b px-4 py-2 text-left">Amount</th>
                        <th className="border-b px-4 py-2 text-left">Method</th>
                        <th className="border-b px-4 py-2 text-left">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="border-b px-4 py-2">{safeFormatDate(p.payment_date, "PPP")}</td>
                          <td className="border-b px-4 py-2 font-bold">{formatCurrency(p.amount)}</td>
                          <td className="border-b px-4 py-2">{p.payment_method}</td>
                          <td className="border-b px-4 py-2">{p.reference_number || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Overview */}
          <Card id="attendance-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-green-500/5 pb-4 border-b border-green-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                Attendance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-sm font-semibold">Total Days: {attendance.length}</div>
                <div className="text-sm font-semibold text-green-600">Present: {attendance.filter(a => a.status === 'present').length}</div>
                <div className="text-sm font-semibold text-rose-600">Absent: {attendance.filter(a => a.status === 'absent').length}</div>
                <div className="text-sm font-bold">Attendance %: {attendanceRate}%</div>
              </div>
              <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar">
                <table className="w-full border-collapse text-sm min-w-[600px]">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="border-b px-4 py-2 text-left">Date</th>
                      <th className="border-b px-4 py-2 text-left">Status</th>
                      <th className="border-b px-4 py-2 text-left">Time In</th>
                      <th className="border-b px-4 py-2 text-left">Time Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50">
                        <td className="border-b px-4 py-2">{safeFormatDate(record.date, "PPP")}</td>
                        <td className="border-b px-4 py-2">
                          <Badge variant={record.status === 'present' ? 'success' : 'destructive'} className="uppercase text-[9px]">
                            {record.status}
                          </Badge>
                        </td>
                        <td className="border-b px-4 py-2">{record.time_in || "-"}</td>
                        <td className="border-b px-4 py-2">{record.time_out || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Test Report */}
          <Card id="tests-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-purple-500/5 pb-4 border-b border-purple-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <ClipboardCheck className="h-6 w-6 text-purple-600" />
                </div>
                Academic Test Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No test results found.</p>
              ) : (
                <>
                  <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar mb-4">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="border-b px-4 py-2 text-left">Test Name</th>
                          <th className="border-b px-4 py-2 text-left">Subject</th>
                          <th className="border-b px-4 py-2 text-left">Date Taken</th>
                          <th className="border-b px-4 py-2 text-left">Marks</th>
                          <th className="border-b px-4 py-2 text-left">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.map((tr: any) => {
                          const percentage = tr.tests?.total_marks
                            ? Math.round((tr.marks_obtained / tr.tests.total_marks) * 100)
                            : 0;
                          return (
                            <tr key={tr.id} className="hover:bg-slate-50/50">
                              <td className="border-b px-4 py-2 font-medium">{tr.tests?.name || 'N/A'}</td>
                              <td className="border-b px-4 py-2">{tr.tests?.subject || 'N/A'}</td>
                              <td className="border-b px-4 py-2">{safeFormatDate(tr.date_taken, "PPP")}</td>
                              <td className="border-b px-4 py-2 font-bold">{tr.marks_obtained}/{tr.tests?.total_marks}</td>
                              <td className={cn("border-b px-4 py-2 font-bold", percentage >= 75 ? "text-green-600" : percentage >= 50 ? "text-orange-600" : "text-red-600")}>
                                {percentage}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Overdue Homework */}
          <Card id="overdue-homework-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-orange-500/5 pb-4 border-b border-orange-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                Overdue Homework
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueHomeworks.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No overdue homework found.</p>
              ) : (
                <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left">Title</th>
                        <th className="border-b px-4 py-2 text-left">Subject</th>
                        <th className="border-b px-4 py-2 text-left">Status</th>
                        <th className="border-b px-4 py-2 text-left">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueHomeworks.map((hw: any) => (
                        <tr key={hw.id} className="hover:bg-slate-50/50">
                          <td className="border-b px-4 py-2 font-medium">{hw.homework?.title || '-'}</td>
                          <td className="border-b px-4 py-2">{hw.homework?.subject || '-'}</td>
                          <td className="border-b px-4 py-2">
                            <Badge variant="destructive" className="uppercase text-[9px] font-bold">
                              {hw.status}
                            </Badge>
                          </td>
                          <td className="border-b px-4 py-2">{safeFormatDate(hw.homework?.due_date, "PPP")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preschool Activities */}
          <Card id="activities-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-pink-500/5 pb-4 border-b border-pink-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/10">
                  <Paintbrush className="h-6 w-6 text-pink-600" />
                </div>
                Preschool Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {preschoolActivities.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No activity records found.</p>
              ) : (
                <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left">Type</th>
                        <th className="border-b px-4 py-2 text-left">Title</th>
                        <th className="border-b px-4 py-2 text-left">Date</th>
                        <th className="border-b px-4 py-2 text-left">Involvement</th>
                        <th className="border-b px-4 py-2 text-left">Media</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preschoolActivities.map((pa: any) => (
                        <tr key={pa.id} className="hover:bg-slate-50/50">
                          <td className="border-b px-4 py-2">{pa.activities?.activity_types?.name || 'N/A'}</td>
                          <td className="border-b px-4 py-2 font-medium">{pa.activities?.title || 'N/A'}</td>
                          <td className="border-b px-4 py-2">{pa.activities?.activity_date ? safeFormatDate(pa.activities.activity_date, "PPP") : 'N/A'}</td>
                          <td className="border-b px-4 py-2 font-bold">{pa.involvement_score || "N/A"}</td>
                          <td className="border-b px-4 py-2">
                            <div className="flex gap-2">
                              {pa.activities?.photo_url && (
                                <a href={supabase.storage.from("activity-photos").getPublicUrl(pa.activities.photo_url).data.publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-bold">Photo</a>
                              )}
                              {pa.activities?.video_url && (
                                <a href={supabase.storage.from("activity-videos").getPublicUrl(pa.activities.video_url).data.publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs font-bold">Video</a>
                              )}
                              {!pa.activities?.photo_url && !pa.activities?.video_url && "-"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discipline Issues */}
          <Card id="discipline-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-red-500/5 pb-4 border-b border-red-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                Behavioral Insight Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {disciplineIssues.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No discipline records found.</p>
              ) : (
                <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left">Category</th>
                        <th className="border-b px-4 py-2 text-left">Severity</th>
                        <th className="border-b px-4 py-2 text-left">Date</th>
                        <th className="border-b px-4 py-2 text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disciplineIssues.map((di: any) => (
                        <tr key={di.id} className="hover:bg-slate-50/50">
                          <td className="border-b px-4 py-2 font-medium">{di.discipline_categories?.name || 'N/A'}</td>
                          <td className="border-b px-4 py-2">
                            <Badge className={cn("text-[9px] font-black uppercase",
                              di.severity === "high" ? "bg-red-500" :
                              di.severity === "medium" ? "bg-orange-500" : "bg-green-500")}>
                              {di.severity}
                            </Badge>
                          </td>
                          <td className="border-b px-4 py-2">{safeFormatDate(di.issue_date, "PPP")}</td>
                          <td className="border-b px-4 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] font-bold uppercase text-primary bg-primary/5 hover:bg-primary/10 rounded-lg"
                              onClick={() => setSelectedDisciplineIssue(di)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Chapter Detail Dialog */}
      <Dialog open={!!selectedChapterDetail} onOpenChange={() => setSelectedChapterDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <BookOpen className="h-6 w-6 text-primary" />
              Intelligence Report: {selectedChapterDetail?.lessonPlan.chapter}
            </DialogTitle>
            <DialogDescription className="font-bold text-primary/80 uppercase text-[10px] tracking-widest">
              Subject: {selectedChapterDetail?.lessonPlan.subject} • Taught on {selectedChapterDetail ? safeFormatDate(selectedChapterDetail.lessonPlan.lesson_date, "PPP") : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedChapterDetail && (
            <div className="space-y-6 py-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Instructional Objective</p>
                <p className="font-bold text-slate-700">{selectedChapterDetail.lessonPlan.topic}</p>
              </div>

              {/* Lesson Evaluation */}
              <div className="space-y-3">
                <h4 className="font-black flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
                  <Star className="h-4 w-4 text-amber-500" /> Institutional Evaluation
                </h4>
                {selectedChapterDetail.studentChapters.length > 0 ? (
                  selectedChapterDetail.studentChapters.map((sc) => (
                    <div key={sc.id} className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-slate-400">Proficiency Score</span>
                        <div className="flex gap-1">{getRatingStars(sc.evaluation_rating)}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-300">Instructor Remarks</span>
                        <p className="text-xs italic text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">"{sc.teacher_notes || "No qualitative remarks recorded."}"</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-slate-400">No evaluation recorded.</p>
                )}
              </div>

              {/* Tests */}
              <div className="space-y-3">
                <h4 className="font-black flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
                  <ClipboardCheck className="h-4 w-4 text-rose-500" /> Academic Results
                </h4>
                {selectedChapterDetail.testResults.length > 0 ? (
                  <div className="divide-y border rounded-2xl overflow-hidden">
                    {selectedChapterDetail.testResults.map((tr) => {
                      const pct = Math.round((tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100);
                      return (
                        <div key={tr.id} className="p-4 flex justify-between items-center bg-white">
                          <div>
                            <p className="text-sm font-bold text-slate-700">{tr.tests?.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{safeFormatDate(tr.date_taken, "PPP")}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-rose-600">{tr.marks_obtained}/{tr.tests?.total_marks}</p>
                            <p className={cn("text-[10px] font-black", pct >= 75 ? "text-green-600" : pct >= 50 ? "text-orange-600" : "text-red-600")}>{pct}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">No tests associated.</p>
                )}
              </div>

              {/* Homework */}
              <div className="space-y-3">
                <h4 className="font-black flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
                  <Book className="h-4 w-4 text-primary" /> Directives (Homework)
                </h4>
                {selectedChapterDetail.homeworkRecords.length > 0 ? (
                  <div className="divide-y border rounded-2xl overflow-hidden">
                    {selectedChapterDetail.homeworkRecords.map((hr) => (
                      <div key={hr.id} className="p-4 flex justify-between items-center bg-white">
                        <div>
                          <p className="text-sm font-bold text-slate-700">{hr.homework?.title}</p>
                          <p className="text-[10px] font-bold text-slate-400">Due: {safeFormatDate(hr.homework?.due_date, "PPP")}</p>
                        </div>
                        <Badge variant={hr.status === 'completed' || hr.status === 'checked' ? 'success' : hr.status === 'in_progress' ? 'warning' : 'destructive'} className="text-[9px] uppercase font-black">
                          {hr.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">No homework assigned.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Discipline Detail Dialog */}
      <Dialog open={!!selectedDisciplineIssue} onOpenChange={() => setSelectedDisciplineIssue(null)}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Incident Dossier
            </DialogTitle>
          </DialogHeader>
          {selectedDisciplineIssue && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</p>
                  <p className="text-lg font-black text-slate-700">{selectedDisciplineIssue.discipline_categories?.name}</p>
                </div>
                <Badge className={cn("text-[10px] font-black uppercase",
                  selectedDisciplineIssue.severity === "high" ? "bg-red-500" :
                  selectedDisciplineIssue.severity === "medium" ? "bg-orange-500" : "bg-green-500")}>
                  {selectedDisciplineIssue.severity}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Narrative</p>
                <p className="text-sm bg-slate-50 p-4 rounded-2xl italic text-slate-600 leading-relaxed border border-slate-100">
                  "{selectedDisciplineIssue.description}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Timeline</p>
                  <p className="text-xs font-bold text-slate-700">{safeFormatDate(selectedDisciplineIssue.issue_date, "PPP")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Resolution Status</p>
                  <Badge variant="outline" className="mt-1 font-black uppercase text-[9px] border-slate-200 text-slate-500">
                    {selectedDisciplineIssue.status || "Logged"}
                  </Badge>
                </div>
              </div>

              {selectedDisciplineIssue.action_taken && (
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Corrective Action</p>
                  <p className="text-xs font-bold text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">{selectedDisciplineIssue.action_taken}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ParentDashboard = () => (
  <QueryClientProvider client={queryClient}>
    <ParentDashboardContent />
  </QueryClientProvider>
);

export default ParentDashboard;
