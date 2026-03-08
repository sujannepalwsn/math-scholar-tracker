import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, Book, BookOpen, Calendar, CalendarIcon, CheckCircle2, ChevronDown, Clock, FileText, Home, Search, TrendingUp, Users, Wallet, import CenterLogo from "@/components/CenterLogo";
  BookOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { eachDayOfInterval, format, isFuture, isToday, startOfDay, subDays } from 'date-fns';
import { KPICard } from '@/components/dashboard/KPICard';
import { AlertList } from '@/components/dashboard/AlertList';
import { ClassSchedule } from '@/components/dashboard/ClassSchedule';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  CalendarIcon,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Users,
  AlertTriangle,
  Book,
  Bell,
  Search,
  ChevronDown,
  Calendar,
  Home,
  Wallet
} from "lucide-react";
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line,
  LineChart
} from "recharts";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const centerId = user?.center_id;
  const role = user?.role;

  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7).toISOString().split("T")[0],
    to: today
  });

  // Data Fetching
  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ["students", centerId],
    queryFn: async () => {
      let query = supabase.from("students").select("*").eq("is_active", true).order("name");
      if (role !== "admin" && centerId) query = query.eq("center_id", centerId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !loading });

  const { data: teachers = [], isLoading: isTeachersLoading } = useQuery({
    queryKey: ["teachers", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("teachers").select("*").eq("center_id", centerId).eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: allAttendance = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["attendance-dashboard", centerId, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("attendance").select("student_id, status, date").eq("center_id", centerId).eq("date", dateRange.to);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: teacherAttendance = [], isLoading: isTeacherAttendanceLoading } = useQuery({
    queryKey: ["teacher-attendance-dashboard", centerId, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("teacher_attendance").select("*").eq("center_id", centerId).eq("date", dateRange.to);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: homeworkStats = [], isLoading: isHomeworkStatsLoading } = useQuery({
    queryKey: ["homework-stats-dashboard", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data: allRecords, error: allErr } = await supabase
        .from("student_homework_records")
        .select("status, created_at, homework!inner(center_id)")
        .eq("homework.center_id", centerId)
        .gte("created_at", `${dateRange.from}T00:00:00`)
        .lte("created_at", `${dateRange.to}T23:59:59`);
      if (allErr) throw allErr;
      return allRecords || [];
    },
    enabled: !!centerId });

  const { data: evaluationStats = [], isLoading: isEvaluationStatsLoading } = useQuery({
    queryKey: ["evaluation-stats-dashboard", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("student_chapters")
        .select("completed, completed_at, evaluation_rating, lesson_plans!inner(center_id)")
        .eq("lesson_plans.center_id", centerId)
        .gte("completed_at", `${dateRange.from}T00:00:00`)
        .lte("completed_at", `${dateRange.to}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: allActivities = [], isLoading: isAllActivitiesLoading } = useQuery({
    queryKey: ["center-activities-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("activities").select("id").eq("center_id", centerId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: recentDiscipline = [], isLoading: isDisciplineLoading } = useQuery({
    queryKey: ["recent-discipline-dashboard", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("discipline_issues")
        .select("*, students(name, grade)")
        .eq("center_id", centerId)
        .eq("status", "open")
        .gte("issue_date", dateRange.from)
        .lte("issue_date", dateRange.to)
        .order("issue_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: upcomingLessons = [], isLoading: isUpcomingLessonsLoading } = useQuery({
    queryKey: ["upcoming-lessons-dashboard", centerId, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("lesson_plans").select("*").eq("center_id", centerId).gte("lesson_date", dateRange.to).order("lesson_date").limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: recentTestResults = [] } = useQuery({
    queryKey: ["recent-test-results-dashboard", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("test_results")
        .select("*, students(name, grade), tests(name, total_marks, subject)")
        .gte("date_taken", dateRange.from)
        .lte("date_taken", dateRange.to)
        .order("date_taken", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: invoicesInRange = [] } = useQuery({
    queryKey: ["invoices-dashboard", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("center_id", centerId)
        .gte("invoice_date", dateRange.from)
        .lte("invoice_date", dateRange.to);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: historicalAttendance = [] } = useQuery({
    queryKey: ["attendance-historical", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("date, status")
        .eq("center_id", centerId)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: historicalTeacherAttendance = [] } = useQuery({
    queryKey: ["teacher-attendance-historical", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("date, status")
        .eq("center_id", centerId)
        .gte("date", dateRange.from)
        .lte("date", dateRange.to)
        .order("date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: testTrend = [] } = useQuery({
    queryKey: ["test-performance-trend", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("test_results")
        .select("date_taken, marks_obtained, tests(total_marks)")
        .gte("date_taken", dateRange.from)
        .lte("date_taken", dateRange.to)
        .order("date_taken");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: periods = [] } = useQuery({
    queryKey: ["class-periods", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("class_periods").select("*").eq("center_id", centerId).eq("is_active", true).order("period_number");
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: periodSchedules = [] } = useQuery({
    queryKey: ["period-schedules-dashboard", centerId, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const dayOfWeek = new Date(dateRange.to).getDay();
      const { data, error } = await supabase.from("period_schedules").select("*, teachers(name), class_periods(*)").eq("center_id", centerId).eq("day_of_week", dayOfWeek);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  const { data: homeworkDefaulters = [] } = useQuery({
    queryKey: ["homework-defaulters-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("student_homework_records").select("*, students(name, grade), homework(title, subject, due_date)").eq("status", "assigned").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId });

  // Memos for Stats and Trends
  const attendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({
      start: new Date(dateRange.from),
      end: new Date(dateRange.to) });

    return range.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = historicalAttendance.filter(a => a.date === dayStr);
      const present = dayRecords.filter(a => a.status === "present").length;
      const total = dayRecords.length;
      return {
        date: format(day, "MMM d"),
        value: total > 0 ? Math.round((present / total) * 100) : 0,
        fullDate: dayStr
      };
    });
  }, [historicalAttendance]);

  const teacherAttendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({
      start: new Date(dateRange.from),
      end: new Date(dateRange.to) });

    return range.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = historicalTeacherAttendance.filter(a => a.date === dayStr);
      const present = dayRecords.filter(a => a.status === "present").length;
      const total = dayRecords.length;
      return {
        date: format(day, "MMM d"),
        value: total > 0 ? Math.round((present / total) * 100) : 0,
        fullDate: dayStr
      };
    });
  }, [historicalTeacherAttendance]);

  const performanceTrend = useMemo(() => {
    const grouped = testTrend.reduce((acc: any, curr: any) => {
      const date = curr.date_taken;
      if (!acc[date]) acc[date] = { total: 0, count: 0 };
      const percentage = (curr.marks_obtained / (curr.tests?.total_marks || 100)) * 100;
      acc[date].total += percentage;
      acc[date].count += 1;
      return acc;
    }, {});

    return Object.keys(grouped).map(date => ({
      date: format(new Date(date), "MMM d"),
      value: Math.round(grouped[date].total / grouped[date].count) })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);
  }, [testTrend]);

  const overviewTrend = useMemo(() => {
     const range = eachDayOfInterval({
      start: new Date(dateRange.from),
      end: new Date(dateRange.to) });
    return range.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const sRecs = historicalAttendance.filter(a => a.date === dayStr);
      const tRecs = historicalTeacherAttendance.filter(a => a.date === dayStr);

      const sPres = sRecs.filter(a => a.status === "present").length;
      const tPres = tRecs.filter(a => a.status === "present").length;

      return {
        name: format(day, "eee"),
        Students: sRecs.length > 0 ? Math.round((sPres / sRecs.length) * 100) : 0,
        Teachers: tRecs.length > 0 ? Math.round((tPres / tRecs.length) * 100) : 0 };
    });
  }, [historicalAttendance, historicalTeacherAttendance]);

  const totalStudents = students.length;
  const presentCount = allAttendance.filter(a => a.status === "present").length;
  const teacherPresentCount = teacherAttendance.filter(a => a.status === "present").length;

  const studentAttendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const teacherAttendanceRate = teachers.length > 0 ? Math.round((teacherPresentCount / teachers.length) * 100) : 0;

  const completedHomework = homeworkStats.filter(h => ["completed", "checked"].includes(h.status || "")).length;
  const homeworkRate = homeworkStats.length > 0 ? Math.round((completedHomework / homeworkStats.length) * 100) : 0;

  const ratedEvaluations = evaluationStats.filter(e => e.evaluation_rating !== null).length;
  const evaluationRate = evaluationStats.length > 0 ? Math.round((ratedEvaluations / evaluationStats.length) * 100) : 0;

  const avgTestScore = performanceTrend.length > 0 ? performanceTrend[performanceTrend.length - 1].value : 0;

  const feeCollection = invoicesInRange.reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
  const totalInvoiced = invoicesInRange.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((feeCollection / totalInvoiced) * 100) : 0;

  const highestPerformers = useMemo(() => {
    return [...recentTestResults]
      .sort((a: any, b: any) => {
        const aP = (a.marks_obtained / (a.tests?.total_marks || 100)) * 100;
        const bP = (b.marks_obtained / (b.tests?.total_marks || 100)) * 100;
        return bP - aP;
      })
      .slice(0, 50);
  }, [recentTestResults]);

  const lowestPerformers = useMemo(() => {
    return [...recentTestResults]
      .filter((r: any) => (r.marks_obtained / (r.tests?.total_marks || 100)) < 0.4)
      .sort((a: any, b: any) => {
        const aP = (a.marks_obtained / (a.tests?.total_marks || 100)) * 100;
        const bP = (b.marks_obtained / (b.tests?.total_marks || 100)) * 100;
        return aP - bP;
      })
      .slice(0, 50);
  }, [recentTestResults]);

  const absentTeachers = teachers.filter(t =>
    teacherAttendance.some(ta => ta.teacher_id === t.id && ta.status === "absent")
  );

  const todayClasses = periodSchedules.map((ps: any) => ({
    id: ps.id,
    time: ps.class_periods ? `${ps.class_periods.start_time.slice(0, 5)} - ${ps.class_periods.end_time.slice(0, 5)}` : "N/A",
    grade: ps.grade,
    teacher: ps.teachers?.name || "Unassigned",
    subject: ps.subject,
    status: "upcoming" as const // Simplification
  }));

  const recentAlerts = [
    ...allAttendance.filter(a => a.status === "absent").slice(0, 3).map(a => ({
      id: `absent-${a.student_id}`,
      title: `${students.find(s => s.id === a.student_id)?.name || 'Student'} absent today`,
      type: "warning" as const,
      timestamp: new Date().toISOString()
    })),
    ...homeworkDefaulters.slice(0, 2).map(h => ({
      id: `hw-${h.id}`,
      title: `Homework pending for Grade ${h.students?.grade}`,
      description: h.students?.name,
      type: "info" as const,
      timestamp: h.created_at
    }))
  ].slice(0, 5);

  const isLoading = isStudentsLoading || isTeachersLoading || isAttendanceLoading || isTeacherAttendanceLoading || isHomeworkStatsLoading || isEvaluationStatsLoading || isAllActivitiesLoading || isDisciplineLoading || isUpcomingLessonsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-4">
             <Skeleton className="h-10 w-10 rounded-full" />
             <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <CenterLogo size="lg" />
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative bg-white shadow-soft rounded-xl hover:bg-white/80">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full border-2 border-white" />
          </Button>
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-2xl shadow-soft border border-white/40">
            <div className="h-9 w-9 bg-indigo-100 rounded-xl flex items-center justify-center overflow-hidden">
               <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-black text-slate-800 leading-none">{user?.username?.split('@')[0]}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Header / Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-white/40">
          <div className="p-2 bg-indigo-500 text-white rounded-lg">
            <Home className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 px-3 border-l border-slate-200 ml-2">
             <Calendar className="h-4 w-4 text-slate-400" />
             <span className="text-xs font-bold text-slate-600">{format(new Date(), "eee, MMM d")}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-1.5 rounded-xl shadow-sm border border-white/40">
           <Input
             type="date"
             value={dateRange.to}
             onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
             className="h-9 w-40 border-none bg-transparent text-xs font-bold text-slate-700 focus-visible:ring-0"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <KPICard
              title="Student Attendance"
              value={`${studentAttendanceRate}%`}
              description={`${presentCount} / ${totalStudents} Present`}
              icon={Users}
              color="green"
              trendData={attendanceTrend}
              onClick={() => navigate("/attendance-summary")}
              secondaryIcon={CheckCircle2}
              secondaryIconColor="text-green-500"
            />
            <KPICard
              title="Teacher Attendance"
              value={`${teacherAttendanceRate}%`}
              description={`${teacherPresentCount} / ${teachers.length} Present`}
              icon={Clock}
              color="blue"
              trendData={teacherAttendanceTrend}
              onClick={() => navigate("/teacher-attendance")}
              secondaryIcon={Search}
              secondaryIconColor="text-blue-500"
            />
            <KPICard
              title="Test Performance"
              value={`${avgTestScore}%`}
              description="Average Score"
              icon={TrendingUp}
              color="purple"
              trendData={performanceTrend}
              onClick={() => navigate("/tests")}
              secondaryIcon={TrendingUp}
              secondaryIconColor="text-purple-500"
            />
            <KPICard
              title="Homework Completion"
              value={`${homeworkRate}%`}
              description="Global completion rate"
              icon={Book}
              color="orange"
              onClick={() => navigate("/homework")}
              secondaryIcon={BookOpen}
              secondaryIconColor="text-orange-500"
            />
            <KPICard
              title="Evaluation Rate"
              value={`${evaluationRate}%`}
              description="Syllabus coverage"
              icon={CheckCircle2}
              color="rose"
              onClick={() => navigate("/lesson-tracking")}
              secondaryIcon={CheckCircle2}
              secondaryIconColor="text-rose-500"
            />
            <KPICard
              title="Upcoming Lessons"
              value={upcomingLessons.length}
              description="Planned for this week"
              icon={FileText}
              color="indigo"
              onClick={() => navigate("/lesson-plans")}
              secondaryIcon={CalendarIcon}
              secondaryIconColor="text-indigo-500"
            />
          </div>

          {/* Attendance Overview Chart */}
          <Card className="border-none shadow-soft bg-white/60 backdrop-blur-md rounded-2xl border border-white/20">
            <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="text-lg font-bold">Attendance Overview</CardTitle>
               <Badge variant="secondary" className="rounded-lg font-bold cursor-pointer">Weekly <ChevronDown className="h-3 w-3 ml-1" /></Badge>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overviewTrend}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTeachers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }
                    />
                    <Area
                      type="monotone"
                      dataKey="Students"
                      stroke="#22c55e"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorStudents)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Teachers"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTeachers)"
                    />
                    <Legend verticalAlign="top" align="left" iconType="circle" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performers Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-soft bg-white/60 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <CardHeader className="bg-green-500/5 border-b border-green-500/10">
                 <CardTitle className="text-sm font-black uppercase tracking-widest text-green-600 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Top Performers
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y divide-green-500/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {highestPerformers.length === 0 ? (
                       <p className="p-8 text-center text-xs italic text-muted-foreground">No data available</p>
                    ) : (
                       highestPerformers.map((r: any) => (
                          <div
                            key={r.id}
                            className="p-4 flex justify-between items-center hover:bg-green-500/5 transition-colors cursor-pointer"
                            onClick={() => navigate(`/student-report?studentId=${r.student_id}`)}
                          >
                             <div>
                                <p className="text-sm font-bold text-slate-800">{r.students?.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{r.tests?.name}</p>
                             </div>
                             <Badge className="bg-green-500 text-white font-black text-[10px]">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
                          </div>
                       ))
                    )}
                 </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-soft bg-white/60 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <CardHeader className="bg-rose-500/5 border-b border-rose-500/10">
                 <CardTitle className="text-sm font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Critical Attention
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="divide-y divide-rose-500/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {lowestPerformers.length === 0 ? (
                       <p className="p-8 text-center text-xs italic text-muted-foreground">No critical alerts</p>
                    ) : (
                       lowestPerformers.map((r: any) => (
                          <div
                            key={r.id}
                            className="p-4 flex justify-between items-center hover:bg-rose-500/5 transition-colors cursor-pointer"
                            onClick={() => navigate(`/student-report?studentId=${r.student_id}`)}
                          >
                             <div>
                                <p className="text-sm font-bold text-slate-800">{r.students?.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{r.tests?.name}</p>
                             </div>
                             <Badge className="bg-rose-500 text-white font-black text-[10px]">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
                          </div>
                       ))
                    )}
                 </div>
              </CardContent>
            </Card>
          </div>

          {/* Teacher Status & Fee Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="border-none shadow-soft bg-white/60 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
                <CardHeader>
                   <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-600" /> Teacher Attendance
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="divide-y divide-slate-100">
                      {absentTeachers.length === 0 ? (
                         <p className="p-8 text-center text-xs italic text-muted-foreground text-green-600 font-bold">All teachers are present!</p>
                      ) : (
                         absentTeachers.map(t => (
                            <div
                              key={t.id}
                              className="p-4 flex justify-between items-center hover:bg-rose-50 transition-colors cursor-pointer"
                              onClick={() => navigate("/teachers")}
                            >
                               <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
                                     <Users className="h-4 w-4 text-rose-600" />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-slate-800">{t.name}</p>
                                     <p className="text-[10px] text-slate-400 font-medium">{t.subject}</p>
                                  </div>
                               </div>
                               <Badge variant="destructive" className="font-black text-[9px] uppercase">Absent</Badge>
                            </div>
                         ))
                      )}
                   </div>
                </CardContent>
             </Card>

             <Card
               className="border-none shadow-soft bg-white/60 backdrop-blur-md rounded-2xl border border-white/20 cursor-pointer hover:shadow-md transition-shadow"
               onClick={() => navigate("/admin/finance")}
             >
                <CardHeader>
                   <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-emerald-600" /> Financial Health
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Collection Ratio</p>
                         <p className="text-4xl font-black text-slate-800 tracking-tight">{collectionRate}%</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Invoiced</p>
                         <p className="text-xl font-bold text-slate-700">{formatCurrency(totalInvoiced)}</p>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                         <span className="text-slate-500">Amount Collected</span>
                         <span className="text-emerald-600">{formatCurrency(feeCollection)}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500" style={{ width: `${collectionRate}%` }} />
                      </div>
                   </div>
                </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <KPICard
              title="Activities"
              value={allActivities.length}
              description="Total activities"
              icon={BookOpen}
              color="pink"
              onClick={() => navigate("/activities")}
              secondaryIcon={BookOpen}
              secondaryIconColor="text-pink-500"
            />
            <KPICard
              title="Discipline Issues"
              value={recentDiscipline.length}
              description="Open cases"
              icon={AlertTriangle}
              color="rose"
              onClick={() => navigate("/discipline")}
              secondaryIcon={FileText}
              secondaryIconColor="text-rose-500"
            />
          </div>
        </div>

        {/* Right Column / Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <AlertList alerts={recentAlerts} onViewAll={() => navigate("/messaging")} />
          <ClassSchedule
            classes={todayClasses}
            title="Instructional Grid"
            onViewRoutine={() => navigate("/class-routine")}
          />
        </div>
      </div>
    </div>
  );
}
