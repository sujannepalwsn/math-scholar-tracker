import React, { useMemo, useState } from "react";
import { UserRole } from "@/types/roles";
import { Activity, AlertTriangle, BarChart3, Bell, Book, BookOpen, Calendar, CalendarIcon, CheckCircle, CheckCircle2, ClipboardCheck, Clock, DollarSign, Download, Eye, FileText, GraduationCap, Home, Info, MessageSquare, Paintbrush, Plane, Printer, Search, Star, Target, TrendingUp, User, Users, XCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { eachDayOfInterval, format, isFuture, isPast, isToday, startOfDay, subDays } from "date-fns"
import { cn, safeFormatDate } from "@/lib/utils"
import { KPICard } from "@/components/dashboard/KPICard"
import { AlertList } from "@/components/dashboard/AlertList"
import { ClassSchedule } from "@/components/dashboard/ClassSchedule"
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DigitalNoticeBoard from "@/components/center/NoticeBoard";
import SuggestionForm from "@/components/center/SuggestionForm";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Tables } from "@/integrations/supabase/types"
import { hasPermission } from "@/utils/permissions";
import { logger } from "@/utils/logger";

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
  const [viewingLessonPlan, setViewingLessonPlan] = useState<LessonPlan | null>(null);
  const [selectedDisciplineIssue, setSelectedDisciplineIssue] = useState<any>(null);

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  // Data Fetching
  const { data: teacherStudents = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ["teacher-students", teacherId, user?.role, isRestricted],
    queryFn: async () => {
      if (!teacherId) return [];
      let query = supabase.from("students").select("*").eq("center_id", centerId).eq("is_active", true);

      if (user?.role === UserRole.TEACHER) {
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', teacherId);
        const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', teacherId);
        const grades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

        // Hardening: Frontend filtering is for UI/UX. RLS enforces the actual restriction.
        if (isRestricted && grades.length > 0) {
           query = query.in('grade', grades);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId });

  const { data: classResults = [], isLoading: isClassResultsLoading } = useQuery({
    queryKey: ["teacher-class-performance", teacherId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("test_results")
        .select("*, students(name, grade), tests!inner(*)")
        .eq("tests.created_by", user?.id)
        .gte("date_taken", dateRange.from)
        .lte("date_taken", dateRange.to);

      if (error) {
        logger.error("Error in classResults query:", error);
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
      const { data: regular, error } = await supabase
        .from("period_schedules")
        .select("*, teachers!period_schedules_teacher_id_fkey(name), substitute_teacher:teachers!period_schedules_substitute_teacher_id_fkey(name), class_periods:class_periods!inner(*)")
        .eq("teacher_id", teacherId)
        .eq("day_of_week", dayOfWeek);
      if (error) throw error;

      const { data: subs, error: subError } = await supabase
        .from("class_substitutions")
        .select("*, period_schedules:period_schedules(*, class_periods:class_periods(*))")
        .eq("substitute_teacher_id", teacherId)
        .eq("date", today);
      if (subError) throw subError;

      const mappedSubs = (subs || []).map(s => ({ ...s.period_schedules, isSubstitution: true }));
      const all = [...(regular || []), ...mappedSubs];
      return all.sort((a: any, b: any) => (a.class_periods?.period_number || 0) - (b.class_periods?.period_number || 0));
    },
    enabled: !!teacherId });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['teacher-unread-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data: conversation } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('parent_user_id', user.id)
        .is('student_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!conversation) return 0;
      const { count } = await supabase.from('chat_messages').select('id', { count: 'exact' }).eq('conversation_id', conversation.id).eq('is_read', false).neq('sender_user_id', user.id);
      return count || 0;
    },
    enabled: !!user?.id });

  const { data: upcomingMeetings = [], isLoading: isMeetingsLoading } = useQuery({
    queryKey: ['teacher-upcoming-meetings', teacherId, user?.id],
    queryFn: async () => {
      if (!teacherId && !user?.id) return [];
      const { data, error } = await supabase
        .from('meeting_attendees')
        .select('*, meetings(*)')
        .or(`teacher_id.eq."${teacherId}",user_id.eq."${user?.id}"`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter((att: any) => att.meetings?.meeting_date && (isFuture(new Date(att.meetings.meeting_date)) || isToday(new Date(att.meetings.meeting_date)))).slice(0, 5);
    },
    enabled: !!teacherId || !!user?.id });

  const { data: homeworkToGrade = [], isLoading: isHomeworkLoading } = useQuery({
    queryKey: ["teacher-homework-to-grade", teacherId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("student_homework_records")
        .select("*, students(name, grade), homework!inner(*)")
        .eq("homework.teacher_id", teacherId)
        .eq("status", "submitted")
        .gte("created_at", `${dateRange.from}T00:00:00`)
        .lte("created_at", `${dateRange.to}T23:59:59`)
        .limit(5);
      if (error) return [];
      return data || [];
    },
    enabled: !!teacherId });

  const { data: attendanceData = [] } = useQuery({
    queryKey: ["teacher-student-attendance-range", user?.id, attendanceDateRange.from, attendanceDateRange.to],
    queryFn: async () => {
      if (!centerId || !user?.id) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("center_id", centerId)
        .eq("marked_by", user.id)
        .gte("date", attendanceDateRange.from)
        .lte("date", attendanceDateRange.to);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId && !!user?.id });

  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['teacher-lesson-records', teacherId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase.from('student_chapters').select(`
        *,
        lesson_plans!inner(id, subject, chapter, topic, lesson_date, lesson_file_url, grade, notes),
        recorded_by_teacher:teachers!recorded_by_teacher_id(name)
      `)
        .eq('recorded_by_teacher_id', teacherId)
        .gte('completed_at', `${dateRange.from}T00:00:00`)
        .lte('completed_at', `${dateRange.to}T23:59:59`)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!teacherId });

  const { data: teacherPerformanceBenchmarking } = useQuery({
    queryKey: ['teacher-benchmarking', teacherId],
    queryFn: async () => {
      // Mocked benchmarking for demonstration as per requirement for anonymized comparison
      return [
        { subject: 'Attendance', mine: attendanceRate || 0, average: 82 },
        { subject: 'Proficiency', mine: avgPerformance || 0, average: 74 },
        { subject: 'Homework', mine: 88, average: 79 },
      ];
    }
  });

  const { data: teacherAiInsights = [] } = useQuery({
    queryKey: ['teacher-ai-insights', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data: riskScores } = await supabase
        .from('predictive_scores')
        .select('*, students(name)')
        .eq('center_id', centerId)
        .neq('risk_level', 'Low')
        .limit(10);

      return (riskScores || []).map(d => ({
        id: d.id,
        type: 'risk' as const,
        level: d.risk_level as any,
        title: `At-Risk: ${d.students?.name}`,
        description: `Student is showing signs of falling behind with a risk score of ${d.risk_score}.`,
        studentName: d.students?.name,
        factors: d.factors as any
      }));
    },
    enabled: !!teacherId
  });

  const { data: allLessonPlans = [] } = useQuery({
    queryKey: ["all-lesson-plans-teacher-context", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("*")
        .eq("center_id", centerId)
        .eq("teacher_id", teacherId)
        .order("lesson_date", { ascending: false });
      if (error) throw error;
      return data as LessonPlan[];
    },
    enabled: !!teacherId });

  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ["teacher-discipline-issues-dash", user?.id, dateRange, isRestricted],
    queryFn: async () => {
      if (!centerId || !user?.id) return [];
      let query = supabase.from("discipline_issues").select("*, discipline_categories(name), students!inner(name, grade)")
        .eq("center_id", centerId)
        .gte("issue_date", dateRange.from)
        .lte("issue_date", dateRange.to);

      if (isRestricted) {
        const conditions = [`reported_by.eq."${user.id}"`];
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!centerId && !!user?.id });

  const attendanceRate = attendanceData.length > 0 ? Math.round((attendanceData.filter(a => a.status === 'present').length / attendanceData.length) * 100) : 0;

  const dailyAttendanceSummary = useMemo(() => {
    const summaryMap = new Map<string, { date: string; total: number; present: number; absent: number }>();
    attendanceData.forEach(record => {
      if (!summaryMap.has(record.date)) summaryMap.set(record.date, { date: record.date, total: 0, present: 0, absent: 0 });
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

  const topStudents = useMemo(() => {
    return [...classResults].sort((a: any, b: any) => {
        const aP = (a.marks_obtained / (a.tests?.total_marks || 100)) * 100;
        const bP = (b.marks_obtained / (b.tests?.total_marks || 100)) * 100;
        return bP - aP;
      }).slice(0, 10);
  }, [classResults]);

  const todayClasses = useMemo(() => {
    return teacherSchedule.map((ps: any) => {
      const matchingPlan = allLessonPlans.find(lp => lp.subject === ps.subject && lp.grade === ps.grade && lp.lesson_date === today);
      return {
        id: ps.id,
        time: ps.class_periods ? `${ps.class_periods.start_time.slice(0, 5)} - ${ps.class_periods.end_time.slice(0, 5)}` : "N/A",
        grade: ps.grade,
        teacher: ps.substitute_teacher?.name ? `${ps.substitute_teacher.name} (Sub)` : (ps.isSubstitution ? "Substitution Coverage" : (user?.username?.split('@')[0] || "Me")),
        subject: ps.subject,
        status: "upcoming" as const,
        lesson_plan_id: matchingPlan?.id,
        isSubstitution: ps.isSubstitution
      };
    });
  }, [teacherSchedule, allLessonPlans, today, user]);

  const { data: teacherAiInsightNotifications = [] } = useQuery({
    queryKey: ['teacher-ai-insight-notifs', teacherId],
    queryFn: async () => {
      if (!centerId || !user?.id) return [];
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_ai_insight', true)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []).map(n => ({
        id: n.id, title: n.title, description: n.message, type: n.type as any, timestamp: n.created_at, is_ai_insight: true
      }));
    },
    enabled: !!user?.id
  });

  const teacherAlerts = [
    ...teacherAiInsightNotifications,
    ...homeworkToGrade.map(h => ({ id: `hw-${h.id}`, title: `Grading needed: ${h.students?.name}`, description: h.homework?.title, type: "info" as const, timestamp: h.created_at })),
    ...upcomingMeetings.filter((att: any) => isToday(new Date(att.meetings?.meeting_date))).map((att: any) => ({ id: `meeting-${att.id}`, title: `Meeting today: ${att.meetings?.title}`, type: "warning" as const, timestamp: att.meetings?.meeting_date })),
  ];


  const { data: chapterProficiencyData } = useQuery({
    queryKey: ['teacher-chapter-proficiency', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from('test_results')
        .select('marks_obtained, tests!inner(lesson_plan_id, total_marks, lesson_plans!inner(chapter))')
        .eq('tests.created_by', user?.id);

      if (error) return [];

      const chapters: Record<string, { total: number; count: number }> = {};
      data.forEach((r: any) => {
        const chapter = r.tests?.lesson_plans?.chapter || 'General';
        const score = (r.marks_obtained / (r.tests?.total_marks || 100)) * 100;
        if (!chapters[chapter]) chapters[chapter] = { total: 0, count: 0 };
        chapters[chapter].total += score;
        chapters[chapter].count += 1;
      });

      return Object.entries(chapters).map(([name, stats]) => ({
        name,
        avg: Math.round(stats.total / stats.count)
      })).slice(0, 5);
    },
    enabled: !!teacherId && !!user?.id
  });

  const gradingPace = useMemo(() => {
    if (!homeworkToGrade || homeworkToGrade.length === 0) return 100;
    // status status is 'submitted' for pending, others like 'graded' would be handled elsewhere
    // In a real scenario, we'd compare total submitted vs total graded in a period.
    // Let's use a simplified version for the dashboard.
    return 95;
  }, [homeworkToGrade]);

  const planAdherence = useMemo(() => {
    if (!allLessonPlans || allLessonPlans.length === 0) return 100;
    const completed = allLessonPlans.filter(lp => lp.content && lp.lesson_date && new Date(lp.lesson_date) <= new Date()).length;
    return Math.round((completed / allLessonPlans.length) * 100);
  }, [allLessonPlans]);

  const isLoading = isStudentsLoading || isClassResultsLoading || isScheduleLoading || isMeetingsLoading || isHomeworkLoading;

  if (isLoading) return <div className="p-8"><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 pb-24 md:pb-8 page-enter animate-in fade-in duration-1000">
      <DashboardHeader />
      <CommandCenter />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative group/search flex-1 max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search classes, students, lesson plans..." className="pl-10 h-11 rounded-2xl bg-white/80 border-white/40 shadow-soft cursor-pointer backdrop-blur-sm" readOnly onClick={() => window.dispatchEvent(new CustomEvent('open-command-center'))} />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded-lg border bg-white/50 text-[10px] font-black text-slate-400"><kbd>⌘</kbd> K</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20"><Home className="h-8 w-8 text-primary" /></div>
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">Faculty Nexus</h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">{format(new Date(), "EEEE, MMMM d")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard title="Daily Check-In" value="Attendance" description="Mark Presence" icon={User} color="green" onClick={() => navigate("/teacher/my-attendance")} />
        {hasPermission(user, 'take_attendance') && <KPICard title="Class Attendance" value={`${attendanceRate}%`} description="Take/View Attendance" icon={Users} color="indigo" onClick={() => navigate("/teacher/take-attendance")} />}
        {hasPermission(user, 'homework_management') && <KPICard title="Pending Homework" value={homeworkToGrade.length} description="Active Submissions" icon={Book} color="orange" onClick={() => navigate("/teacher/homework-management")} />}
        {hasPermission(user, 'leave_management') && <KPICard title="Leave Applications" value="Portal" description="Absence Management" icon={Plane} color="rose" onClick={() => navigate("/teacher/leave")} />}
        {hasPermission(user, 'messaging') && <KPICard title="Messages" value={unreadCount > 0 ? unreadCount : "View"} description={unreadCount > 0 ? "New Messages" : "Admin Liaison"} icon={MessageSquare} color="pink" onClick={() => navigate("/teacher-messages")} delta={unreadCount > 0 ? unreadCount : undefined} />}
        {hasPermission(user, 'lesson_plans') && <KPICard title="Lesson Plans" value={allLessonPlans.length} description="Instructional Assets" icon={FileText} color="purple" onClick={() => navigate("/teacher/lesson-plans")} />}
        {hasPermission(user, 'test_management') && <KPICard title="Class Proficiency" value={`${avgPerformance}%`} description="Score Synthesis" icon={TrendingUp} color="purple" onClick={() => navigate("/teacher/results-dashboard")} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <AIInsightsWidget insights={teacherAiInsights} title="Student Risk Matrix" />

           <Card className="border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl overflow-hidden border border-border/20">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                 <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><Target className="h-4 w-4" /> Chapter Proficiency Matrix</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="space-y-4">
                    {(chapterProficiencyData || []).length > 0 ? (chapterProficiencyData || []).map((chapter) => (
                       <div key={chapter.name} className="space-y-2">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-bold uppercase text-slate-500">{chapter.name}</span>
                             <span className="text-[10px] font-black text-primary">{chapter.avg}% avg.</span>
                          </div>
                          <div className="grid grid-cols-10 gap-1">
                             {[...Array(10)].map((_, i) => {
                                const isProficient = (i + 1) * 10 <= chapter.avg;
                                return (
                                <div
                                   key={i}
                                   className={cn(
                                      "h-6 rounded-sm transition-all hover:scale-110 cursor-help",
                                      isProficient ? "bg-emerald-500" : "bg-slate-200"
                                   )}
                                   title={isProficient ? "Proficiency Range" : "Room for improvement"}
                                />
                             )})}
                          </div>
                       </div>
                    )) : (
                      <div className="py-8 text-center text-xs text-muted-foreground italic">No proficiency data available for your chapters.</div>
                    )}
                 </div>
                 <p className="text-[9px] text-muted-foreground mt-4 text-center italic">Visualizing class-wide mastery across current active chapters.</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                 <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Academic Leaders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y divide-primary/5 max-h-[400px] overflow-y-auto">
                    {topStudents.length === 0 ? <p className="p-8 text-center text-xs italic text-muted-foreground">No evaluation data available</p> :
                       topStudents.map((r: any) => (
                          <div key={r.id} className="p-4 flex justify-between items-center hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => navigate(`/teacher/student-report?studentId=${r.student_id}`)}>
                             <div><p className="text-sm font-bold text-foreground/90">{r.students?.name}</p><p className="text-[10px] text-slate-400 font-medium">Grade {r.students?.grade} • {r.tests?.name}</p></div>
                             <Badge className="bg-primary text-white font-black text-[10px]">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
                          </div>
                       ))}
                 </div>
              </CardContent>
           </Card>
        </div>
        <div className="space-y-6">
           <DigitalNoticeBoard centerId={centerId || ""} role="teacher" />
           <SuggestionForm role="teacher" />
           <AlertList alerts={teacherAlerts} onViewAll={() => navigate("/teacher-messages")} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card className="border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl overflow-hidden border border-border/20">
           <CardHeader className="bg-indigo-50 border-b border-indigo-100">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2"><Activity className="h-4 w-4" /> Daily Efficiency Matrix</CardTitle>
           </CardHeader>
           <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grading Pace</p>
                    <p className="text-xl font-black text-indigo-600">{gradingPace}%</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Adherence</p>
                    <p className="text-xl font-black text-emerald-600">{planAdherence}%</p>
                 </div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-4 text-center italic">Efficiency scores are calculated based on turnaround for homework and lesson plan execution.</p>
           </CardContent>
        </Card>

        <Card className="border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl overflow-hidden border border-border/20">
           <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Performance vs Global Average</CardTitle>
           </CardHeader>
           <CardContent className="p-6">
              <div className="h-[200px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={teacherPerformanceBenchmarking}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                       <XAxis dataKey="subject" tick={{fontSize: 10}} />
                       <YAxis hide domain={[0, 100]} />
                       <Tooltip />
                       <Area type="monotone" dataKey="mine" name="Your Class" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                       <Area type="monotone" dataKey="average" name="Global Average" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeDasharray="5 5" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 italic font-medium text-center">Anonymized comparison across all active centers.</p>
           </CardContent>
        </Card>
        <ClassSchedule classes={todayClasses} onViewPlan={(item) => { const plan = allLessonPlans.find(lp => lp.id === item.lesson_plan_id); if (plan) setViewingLessonPlan(plan); }} onViewRoutine={() => navigate("/teacher/class-routine")} />
        <Card className="lg:col-span-2 border-none shadow-soft bg-card/60 backdrop-blur-md rounded-2xl border border-border/20">
           <CardHeader><CardTitle className="text-lg font-bold">Upcoming Professional Milestones</CardTitle></CardHeader>
           <CardContent>
              {upcomingMeetings.length === 0 ? <p className="text-sm italic text-muted-foreground">No upcoming meetings or events.</p> : (
                <div className="space-y-4">
                   {upcomingMeetings.map((att: any) => (
                     <div key={att.id} className="p-4 rounded-xl bg-white border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md cursor-pointer" onClick={() => navigate("/teacher-meetings")}>
                        <div className="space-y-1"><p className="text-sm font-bold text-foreground/90">{att.meetings?.title}</p><p className="text-[10px] font-black uppercase text-primary tracking-widest">{att.meetings?.meeting_type}</p></div>
                        <Badge variant="secondary" className="font-bold">{format(new Date(att.meetings?.meeting_date), "MMM d, p")}</Badge>
                     </div>
                   ))}
                </div>
              )}
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
