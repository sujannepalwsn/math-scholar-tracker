import React, { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Bell, Book, BookOpen, Calendar, CalendarIcon, CheckCircle, CheckCircle2, ClipboardCheck, Clock, DollarSign, Download, Eye, FileText, GraduationCap, Home, Info, MessageSquare, Paintbrush, Printer, Star, Target, TrendingUp, User, Users, Wallet, XCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Tables } from "@/integrations/supabase/types"

type LessonPlan = Tables<'lesson_plans'>;
type StudentHomeworkRecord = Tables<'student_homework_records'>;
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

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const teacherId = user?.teacher_id;
  const centerId = user?.center_id;

  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30).toISOString().split("T")[0],
    to: today
  });

  const [attendanceDateRange, setAttendanceDateRange] = useState({
    from: today,
    to: today
  });

  const [selectedChapterDetail, setSelectedChapterDetail] = useState<ChapterPerformanceGroup | null>(null);
  const [selectedDisciplineIssue, setSelectedDisciplineIssue] = useState<any>(null);

  // Data Fetching
  const { data: assignedGrades = [] } = useQuery({
    queryKey: ["teacher-assigned-grades", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("class_teacher_assignments")
        .select("grade")
        .eq("teacher_id", teacherId);
      if (error) throw error;
      return data.map(d => d.grade);
    },
    enabled: !!teacherId
  });

  const { data: teacherStudents = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ["teacher-students", teacherId, user?.role, assignedGrades],
    queryFn: async () => {
      if (!teacherId) return [];
      let query = supabase.from("students").select("*").eq("center_id", centerId).eq("is_active", true);

      if (user?.role === 'teacher' && assignedGrades.length > 0) {
        query = query.in('grade', assignedGrades);
      } else if (user?.role === 'teacher') {
        return []; // No assignments, no students
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId });

  const { data: classResults = [], isLoading: isClassResultsLoading } = useQuery({
    queryKey: ["teacher-class-performance", teacherId, dateRange.from, dateRange.to, assignedGrades],
    queryFn: async () => {
      if (!teacherId) return [];
      // Fetch all test results for students in assigned grades
      let query = supabase
        .from("test_results")
        .select("*, students!inner(name, grade), tests!inner(*)")
        .gte("date_taken", dateRange.from)
        .lte("date_taken", dateRange.to);

      if (user?.role === 'teacher' && assignedGrades.length > 0) {
        query = query.in('students.grade', assignedGrades);
      } else if (user?.role === 'teacher') {
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error in classResults query:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!teacherId && !!user?.id });

  const { data: teacherSchedule = [], isLoading: isScheduleLoading } = useQuery({
    queryKey: ["teacher-schedule-dashboard", teacherId, dateRange.to],
    queryFn: async () => {
      if (!teacherId) return [];
      const dayOfWeek = new Date(dateRange.to).getDay();
      const { data, error } = await supabase.from("period_schedules").select("*, class_periods(*)").eq("teacher_id", teacherId).eq("day_of_week", dayOfWeek);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId });

  const { data: upcomingMeetings = [], isLoading: isMeetingsLoading } = useQuery({
    queryKey: ['teacher-upcoming-meetings', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase.from('meeting_attendees').select('*, meetings(*)').eq('teacher_id', teacherId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter((att: any) => att.meetings?.meeting_date && (isFuture(new Date(att.meetings.meeting_date)) || isToday(new Date(att.meetings.meeting_date)))).slice(0, 5);
    },
    enabled: !!teacherId });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['teacher-unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data: conversation } = await supabase.from('chat_conversations').select('id').eq('parent_user_id', user.id).maybeSingle();
      if (!conversation) return 0;
      const { count } = await supabase.from('chat_messages').select('id', { count: 'exact' }).eq('conversation_id', conversation.id).eq('is_read', false).neq('sender_user_id', user.id);
      return count || 0;
    },
    enabled: !!user?.id });

  const { data: homeworkToGrade = [], isLoading: isHomeworkLoading } = useQuery({
    queryKey: ["teacher-homework-to-grade", teacherId, dateRange.from, dateRange.to, assignedGrades],
    queryFn: async () => {
      if (!teacherId) return [];
      let query = supabase
        .from("student_homework_records")
        .select("*, students!inner(name, grade), homework!inner(*)")
        .eq("status", "submitted")
        .gte("created_at", `${dateRange.from}T00:00:00`)
        .lte("created_at", `${dateRange.to}T23:59:59`)
        .limit(5);

      if (user?.role === 'teacher' && assignedGrades.length > 0) {
        query = query.in('students.grade', assignedGrades);
      } else if (user?.role === 'teacher') {
        return [];
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching homework to grade:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!teacherId });

  const { data: attendanceData = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["teacher-student-attendance-range", teacherId, attendanceDateRange.from, attendanceDateRange.to, assignedGrades],
    queryFn: async () => {
      if (!centerId || !user?.id) return [];
      let query = supabase
        .from("attendance")
        .select("*, students!inner(name, grade)")
        .eq("center_id", centerId)
        .gte("date", attendanceDateRange.from)
        .lte("date", attendanceDateRange.to)
        .order("date");

      if (user?.role === 'teacher' && assignedGrades.length > 0) {
        query = query.in('students.grade', assignedGrades);
      } else if (user?.role === 'teacher') {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId && !!user?.id });

  const { data: historicalAttendance = [] } = useQuery({
    queryKey: ["teacher-student-attendance-historical", teacherId, dateRange.from, dateRange.to, user?.role, assignedGrades],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("attendance")
        .select("date, status, students!inner(grade)")
        .eq("center_id", centerId)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to);

      if (user?.role === 'teacher' && assignedGrades.length > 0) {
        query = query.in('students.grade', assignedGrades);
      } else if (user?.role === 'teacher') {
        return [];
      }

      const { data, error } = await query.order("date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['teacher-lesson-records', teacherId, dateRange.from, dateRange.to, assignedGrades],
    queryFn: async () => {
      if (!teacherId) return [];
      let query = supabase.from('student_chapters').select(`
        *,
        lesson_plans!inner(id, subject, chapter, topic, lesson_date, lesson_file_url, grade, notes),
        recorded_by_teacher:recorded_by_teacher_id(name),
        students!inner(grade)
      `)
        .gte('completed_at', `${dateRange.from}T00:00:00`)
        .lte('completed_at', `${dateRange.to}T23:59:59`)
        .order('completed_at', { ascending: false });

      if (user?.role === 'teacher' && assignedGrades.length > 0) {
        query = query.in('students.grade', assignedGrades);
      } else if (user?.role === 'teacher') {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId });

  const { data: allLessonPlans = [] } = useQuery({
    queryKey: ["all-lesson-plans-teacher-context", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("id, subject, chapter, topic, grade, lesson_date, notes, lesson_file_url")
        .eq("center_id", centerId)
        .eq("teacher_id", teacherId)
        .order("lesson_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId });

  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ["teacher-discipline-issues", user?.id, dateRange, assignedGrades],
    queryFn: async () => {
      if (!centerId || !user?.id) return [];
      let query = supabase.from("discipline_issues").select("*, discipline_categories(name), students!inner(name, grade)")
        .eq("center_id", centerId)
        .gte("issue_date", dateRange.from)
        .lte("issue_date", dateRange.to);

      if (user?.role === 'teacher' && assignedGrades.length > 0) {
        query = query.in('students.grade', assignedGrades);
      } else if (user?.role === 'teacher') {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!centerId && !!user?.id });

  const { data: preschoolActivities = [] } = useQuery({
    queryKey: ["teacher-activities", user?.id, dateRange, assignedGrades],
    queryFn: async () => {
      if (!centerId || !user?.id) return [];
      let query = supabase.from("student_activities").select("*, activities!inner(*, activity_types(name)), students!inner(name, grade)")
        .eq("activities.center_id", centerId)
        .gte("created_at", `${dateRange.from}T00:00:00`)
        .lte("created_at", `${dateRange.to}T23:59:59`);

      if (user?.role === 'teacher' && assignedGrades.length > 0) {
        query = query.in('students.grade', assignedGrades);
      } else if (user?.role === 'teacher') {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!centerId && !!user?.id });

  const attendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    return range.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = historicalAttendance.filter(a => a.date === dayStr);
      const present = dayRecords.filter(a => a.status === "present").length;
      return { date: format(day, "MMM d"), value: dayRecords.length > 0 ? Math.round((present / dayRecords.length) * 100) : 0 };
    });
  }, [historicalAttendance, dateRange]);

  const attendanceRate = attendanceData.length > 0 ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100) : 0;

  const dailyAttendanceSummary = useMemo(() => {
    const summaryMap = new Map<string, { date: string; total: number; present: number; absent: number }>();

    attendanceData.forEach(record => {
      if (!summaryMap.has(record.date)) {
        summaryMap.set(record.date, { date: record.date, total: 0, present: 0, absent: 0 });
      }
      const day = summaryMap.get(record.date)!;
      day.total += 1;
      if (record.status === 'present') day.present += 1;
      else if (record.status === 'absent') day.absent += 1;
    });

    return Array.from(summaryMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceData]);

  const avgPerformance = classResults.length > 0
    ? Math.round(classResults.reduce((acc, curr: any) => acc + (curr.marks_obtained / (curr.tests?.total_marks || 100)) * 100, 0) / classResults.length)
    : 0;

  const subjectPerformance = useMemo(() => {
    const subjectsMap = new Map<string, { total: number; count: number }>();
    classResults.forEach((tr: any) => {
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
  }, [classResults]);

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
    classResults.forEach((tr: any) => {
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

    // Sort by lesson plan date
    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(b.lessonPlan.lesson_date).getTime() - new Date(a.lessonPlan.lesson_date).getTime()
    );
  }, [lessonRecords, classResults, allLessonPlans]);

  const topStudents = useMemo(() => {
    return [...classResults]
      .sort((a: any, b: any) => {
        const aP = (a.marks_obtained / (a.tests?.total_marks || 100)) * 100;
        const bP = (b.marks_obtained / (b.tests?.total_marks || 100)) * 100;
        return bP - aP;
      })
      .slice(0, 50);
  }, [classResults]);

  const todayClasses = teacherSchedule.map((ps: any) => ({
    id: ps.id,
    time: ps.class_periods ? `${ps.class_periods.start_time.slice(0, 5)} - ${ps.class_periods.end_time.slice(0, 5)}` : "N/A",
    grade: ps.grade,
    teacher: user?.username?.split('@')[0] || "Me",
    subject: ps.subject,
    status: "upcoming" as const
  }));

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

  const teacherAlerts = [
    ...homeworkToGrade.map(h => ({
      id: `hw-${h.id}`,
      title: `Grading needed: ${h.students?.name}`,
      description: h.homework?.title,
      type: "info" as const,
      timestamp: h.created_at
    })),
    ...upcomingMeetings.filter((att: any) => isToday(new Date(att.meetings?.meeting_date))).map((att: any) => ({
      id: `meeting-${att.id}`,
      title: `Meeting today: ${att.meetings?.title}`,
      type: "warning" as const,
      timestamp: att.meetings?.meeting_date
    }))
  ];

  const isLoading = isStudentsLoading || isClassResultsLoading || isScheduleLoading || isMeetingsLoading || isHomeworkLoading;

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-64 rounded-2xl" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <CenterLogo size="lg" />
        <div className="flex items-center gap-4">
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teacher</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2 bg-card/60 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-border/40">
          <div className="p-2 bg-primary text-white rounded-lg">
            <Home className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 px-3 border-l border-slate-200 ml-2">
             <Calendar className="h-4 w-4 text-slate-400" />
             <span className="text-xs font-bold text-slate-600">{format(new Date(), "eee, MMM d")}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card/60 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-border/40">
           <Input
             type="date"
             value={dateRange.to}
             onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
             className="h-9 w-40 border-none bg-transparent text-xs font-bold text-slate-700 focus-visible:ring-0"
           />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard title="Class Attendance" value={`${attendanceRate}%`} description="Presence Index" icon={Users} color="indigo" onClick={() => scrollToSection("attendance-section")} />
        <KPICard title="Today's Classes" value={todayClasses.length} description="Instruction Units" icon={Clock} color="blue" onClick={() => navigate("/teacher/class-routine")} />
        <KPICard title="Pending Homework" value={homeworkToGrade.length} description="Active Submissions" icon={Book} color="orange" onClick={() => navigate("/teacher/homework-management")} />
        <KPICard title="Class Proficiency" value={`${avgPerformance}%`} description="Score Synthesis" icon={TrendingUp} color="purple" trendData={attendanceTrend} onClick={() => scrollToSection("tests-section")} />
      </div>

      {/* Subject Wise Performance Cards */}
      {subjectPerformance.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Subject Proficiency</h3>
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
        <div className="lg:col-span-2 space-y-6">

           <Card className="border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl border border-border/20 overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                 <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Academic Leaders
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y divide-primary/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {topStudents.length === 0 ? (
                       <p className="p-8 text-center text-xs italic text-muted-foreground">No evaluation data available</p>
                    ) : (
                       topStudents.map((r: any) => (
                          <div
                            key={r.id}
                            className="p-4 flex justify-between items-center hover:bg-primary/5 transition-colors cursor-pointer"
                            onClick={() => navigate(`/teacher/student-report?studentId=${r.student_id}`)}
                          >
                             <div>
                                <p className="text-sm font-bold text-foreground/90">{r.students?.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Grade {r.students?.grade} • {r.tests?.name}</p>
                             </div>
                             <Badge className="bg-primary text-white font-black text-[10px]">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
                          </div>
                       ))
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>
        <AlertList alerts={teacherAlerts} onViewAll={() => navigate("/teacher-messaging")} />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ClassSchedule
          classes={todayClasses}
          onViewRoutine={() => navigate("/teacher/class-routine")}
        />
        <Card className="lg:col-span-2 border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl border border-border/20">
           <CardHeader><CardTitle className="text-lg font-bold">Upcoming Professional Milestones</CardTitle></CardHeader>
           <CardContent>
              {upcomingMeetings.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">No upcoming meetings or events.</p>
              ) : (
                <div className="space-y-4">
                   {upcomingMeetings.map((att: any) => (
                     <div
                        key={att.id}
                        className="p-4 rounded-xl bg-white border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate("/teacher/meetings")}
                     >
                        <div className="space-y-1">
                           <p className="text-sm font-bold text-foreground/90">{att.meetings?.title}</p>
                           <p className="text-[10px] font-black uppercase text-primary tracking-widest">{att.meetings?.meeting_type}</p>
                        </div>
                        <Badge variant="secondary" className="font-bold">{format(new Date(att.meetings?.meeting_date), "MMM d, p")}</Badge>
                     </div>
                   ))}
                </div>
              )}
           </CardContent>
        </Card>
      </div>

      <div id="printable-report" className="space-y-12 animate-in slide-in-from-bottom-8 duration-700 mt-12">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[hsl(var(--background))] px-4 text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
                Instructional Analytics & Insights
              </span>
            </div>
          </div>

          {/* Attendance Overview */}
          <Card id="attendance-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-green-500/5 pb-4 border-b border-green-500/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  Class Attendance Analytics
                </CardTitle>
                <div className="flex items-center gap-2 bg-card/60 p-1 rounded-xl border border-border/40 shadow-soft">
                   <Input type="date" value={attendanceDateRange.from} onChange={e => setAttendanceDateRange({...attendanceDateRange, from: e.target.value})} className="h-8 w-32 border-none bg-transparent text-[10px] font-black uppercase" />
                   <span className="text-[10px] font-black text-slate-300">TO</span>
                   <Input type="date" value={attendanceDateRange.to} onChange={e => setAttendanceDateRange({...attendanceDateRange, to: e.target.value})} className="h-8 w-32 border-none bg-transparent text-[10px] font-black uppercase" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-sm font-semibold">Days Tracked: {dailyAttendanceSummary.length}</div>
                <div className="text-sm font-semibold text-green-600">Total Present: {dailyAttendanceSummary.reduce((acc, curr) => acc + curr.present, 0)}</div>
                <div className="text-sm font-semibold text-rose-600">Total Absent: {dailyAttendanceSummary.reduce((acc, curr) => acc + curr.absent, 0)}</div>
                <div className="text-sm font-bold">Avg Presence: {attendanceRate}%</div>
              </div>
              <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar">
                <table className="w-full border-collapse text-sm min-w-[700px]">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Date</th>
                      <th className="border-b px-4 py-2 text-center font-bold uppercase text-[10px] text-muted-foreground">Total Students</th>
                      <th className="border-b px-4 py-2 text-center font-bold uppercase text-[10px] text-muted-foreground text-green-600">Present</th>
                      <th className="border-b px-4 py-2 text-center font-bold uppercase text-[10px] text-muted-foreground text-rose-600">Absent</th>
                      <th className="border-b px-4 py-2 text-center font-bold uppercase text-[10px] text-muted-foreground">Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyAttendanceSummary.map((summary) => (
                      <tr key={summary.date} className="hover:bg-slate-50/50">
                        <td className="border-b px-4 py-2 font-medium">{safeFormatDate(summary.date, "PPP")}</td>
                        <td className="border-b px-4 py-2 text-center font-bold text-slate-700">{summary.total}</td>
                        <td className="border-b px-4 py-2 text-center font-bold text-green-600">{summary.present}</td>
                        <td className="border-b px-4 py-2 text-center font-bold text-rose-600">{summary.absent}</td>
                        <td className="border-b px-4 py-2 text-center">
                          <Badge variant="secondary" className="font-black text-[9px]">
                            {Math.round((summary.present / summary.total) * 100)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Curricular Milestones */}
          <Card id="milestones-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-blue-500/5 pb-4 border-b border-blue-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                Academic Progress Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left min-w-[800px]">
                  <thead className="bg-muted/50 border-b sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Subject</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Topic</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Student Evaluation</th>
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
              {classResults.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No test results found for your tests.</p>
              ) : (
                <>
                  <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar mb-4">
                    <table className="w-full text-sm min-w-[800px]">
                      <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Test Name</th>
                          <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Student</th>
                          <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Marks</th>
                          <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Percentage</th>
                          <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classResults.map((tr: any) => {
                          const percentage = tr.tests?.total_marks
                            ? Math.round((tr.marks_obtained / tr.tests.total_marks) * 100)
                            : 0;
                          return (
                            <tr key={tr.id} className="hover:bg-slate-50/50">
                              <td className="border-b px-4 py-2 font-medium">{tr.tests?.name || 'N/A'}</td>
                              <td className="border-b px-4 py-2 font-bold text-slate-700">{tr.students?.name}</td>
                              <td className="border-b px-4 py-2">{tr.marks_obtained}/{tr.tests?.total_marks}</td>
                              <td className={cn("border-b px-4 py-2 font-bold", percentage >= 75 ? "text-green-600" : percentage >= 50 ? "text-orange-600" : "text-red-600")}>
                                {percentage}%
                              </td>
                              <td className="border-b px-4 py-2 text-[10px] text-muted-foreground">{safeFormatDate(tr.date_taken, "PPP")}</td>
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

          {/* Activities */}
          <Card id="activities-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-pink-500/5 pb-4 border-b border-pink-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/10">
                  <Paintbrush className="h-6 w-6 text-pink-600" />
                </div>
                Preschool Activities Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {preschoolActivities.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No activity records found.</p>
              ) : (
                <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Activity</th>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Student</th>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Date</th>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Involvement</th>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Assets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preschoolActivities.map((pa: any) => (
                        <tr key={pa.id} className="hover:bg-slate-50/50">
                          <td className="border-b px-4 py-2 font-medium">{pa.activities?.title}</td>
                          <td className="border-b px-4 py-2 font-bold text-slate-700">{pa.students?.name}</td>
                          <td className="border-b px-4 py-2">{safeFormatDate(pa.activities?.activity_date, "PPP")}</td>
                          <td className="border-b px-4 py-2 font-bold">{pa.involvement_score || "N/A"}</td>
                          <td className="border-b px-4 py-2">
                            <div className="flex gap-2">
                              {pa.activities?.photo_url && (
                                <a href={supabase.storage.from("activity-photos").getPublicUrl(pa.activities.photo_url).data.publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[9px] font-black uppercase">Photo</a>
                              )}
                              {pa.activities?.video_url && (
                                <a href={supabase.storage.from("activity-videos").getPublicUrl(pa.activities.video_url).data.publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[9px] font-black uppercase">Video</a>
                              )}
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
                Behavioral Insights Dossier
              </CardTitle>
            </CardHeader>
            <CardContent>
              {disciplineIssues.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No discipline records found.</p>
              ) : (
                <div className="overflow-auto max-h-[400px] border rounded-xl custom-scrollbar">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Category</th>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Student</th>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Severity</th>
                        <th className="border-b px-4 py-2 text-left font-bold uppercase text-[10px] text-muted-foreground">Date</th>
                        <th className="border-b px-4 py-2 text-center font-bold uppercase text-[10px] text-muted-foreground">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disciplineIssues.map((di: any) => (
                        <tr key={di.id} className="hover:bg-slate-50/50">
                          <td className="border-b px-4 py-2 font-medium">{di.discipline_categories?.name || 'N/A'}</td>
                          <td className="border-b px-4 py-2 font-bold text-slate-700">{di.students?.name}</td>
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
              Chapter Intel: {selectedChapterDetail?.lessonPlan.chapter}
            </DialogTitle>
            <DialogDescription className="font-bold text-primary/80 uppercase text-[10px] tracking-widest">
              {selectedChapterDetail?.lessonPlan.subject} • Instruction Date: {selectedChapterDetail ? safeFormatDate(selectedChapterDetail.lessonPlan.lesson_date, "PPP") : ""}
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
                  <Star className="h-4 w-4 text-amber-500" /> Professional Evaluation
                </h4>
                {selectedChapterDetail.studentChapters.length > 0 ? (
                  selectedChapterDetail.studentChapters.map((sc) => (
                    <div key={sc.id} className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-slate-400">Synthesis Score</span>
                        <div className="flex gap-1">{getRatingStars(sc.evaluation_rating)}</div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-300">My Remarks</span>
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
}
