import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Bell, Book, BookOpen, Calendar, CalendarIcon, CheckCircle2, ChevronDown, Clock, FileText, Home, Search, TrendingUp, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { eachDayOfInterval, format, isFuture, isToday, startOfDay, subDays, subMonths, startOfYear } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { KPICard } from "@/components/dashboard/KPICard";
import { AlertList } from "@/components/dashboard/AlertList";
import { ClassSchedule } from "@/components/dashboard/ClassSchedule";
import CenterLogo from "@/components/CenterLogo";
import NotificationBell from "@/components/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AttendanceRange = "weekly" | "monthly" | "yearly" | "overall";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const centerId = user?.center_id;
  const role = user?.role;

  const [attendanceRange, setAttendanceRange] = useState<AttendanceRange>("weekly");

  // Compute date range based on attendance selector
  const dateRange = useMemo(() => {
    const to = today;
    let from: string;
    switch (attendanceRange) {
      case "weekly": from = subDays(new Date(), 7).toISOString().split("T")[0]; break;
      case "monthly": from = subDays(new Date(), 30).toISOString().split("T")[0]; break;
      case "yearly": from = startOfYear(new Date()).toISOString().split("T")[0]; break;
      case "overall": from = "2020-01-01"; break;
      default: from = subDays(new Date(), 7).toISOString().split("T")[0];
    }
    return { from, to };
  }, [attendanceRange, today]);

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

  const { data: allAttendance = [] } = useQuery({
    queryKey: ["attendance-dashboard", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("attendance").select("student_id, status, date").eq("center_id", centerId).eq("date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: teacherAttendance = [] } = useQuery({
    queryKey: ["teacher-attendance-dashboard", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("teacher_attendance").select("*").eq("center_id", centerId).eq("date", today);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: homeworkStats = [] } = useQuery({
    queryKey: ["homework-stats-dashboard", centerId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("student_homework_records")
        .select("status, created_at, homework!inner(center_id)")
        .eq("homework.center_id", centerId)
        .gte("created_at", `${dateRange.from}T00:00:00`)
        .lte("created_at", `${dateRange.to}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: evaluationStats = [] } = useQuery({
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
    enabled: !!centerId,
  });

  // Recent activities for preview card
  const { data: recentActivities = [] } = useQuery({
    queryKey: ["recent-activities-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("activities")
        .select("id, name, title, grade, activity_date")
        .eq("center_id", centerId)
        .order("activity_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  // Recent discipline issues for preview card
  const { data: recentDiscipline = [] } = useQuery({
    queryKey: ["recent-discipline-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("discipline_issues")
        .select("id, description, severity, issue_date, students(name, grade)")
        .eq("center_id", centerId)
        .eq("status", "open")
        .order("issue_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: upcomingLessons = [] } = useQuery({
    queryKey: ["upcoming-lessons-dashboard", centerId, today],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("lesson_plans").select("*").eq("center_id", centerId).gte("lesson_date", today).order("lesson_date").limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

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
    enabled: !!centerId,
  });

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
    enabled: !!centerId,
  });

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
    enabled: !!centerId,
  });

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
    enabled: !!centerId,
  });

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
    enabled: !!centerId,
  });

  // Today's class schedule - connected to period_schedules
  const { data: periodSchedules = [] } = useQuery({
    queryKey: ["period-schedules-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const dayOfWeek = new Date().getDay();
      const { data, error } = await supabase
        .from("period_schedules")
        .select("*, teachers(name), class_periods(*)")
        .eq("center_id", centerId)
        .eq("day_of_week", dayOfWeek);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  const { data: homeworkDefaulters = [] } = useQuery({
    queryKey: ["homework-defaulters-dashboard", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase.from("student_homework_records").select("*, students(name, grade), homework(title, subject, due_date)").eq("status", "assigned").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  // Memos
  const attendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    return range.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = historicalAttendance.filter((a) => a.date === dayStr);
      const present = dayRecords.filter((a) => a.status === "present").length;
      const total = dayRecords.length;
      return { date: format(day, "MMM d"), value: total > 0 ? Math.round((present / total) * 100) : 0, fullDate: dayStr };
    });
  }, [historicalAttendance, dateRange]);

  const teacherAttendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    return range.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = historicalTeacherAttendance.filter((a) => a.date === dayStr);
      const present = dayRecords.filter((a) => a.status === "present").length;
      const total = dayRecords.length;
      return { date: format(day, "MMM d"), value: total > 0 ? Math.round((present / total) * 100) : 0, fullDate: dayStr };
    });
  }, [historicalTeacherAttendance, dateRange]);

  const performanceTrend = useMemo(() => {
    const grouped = testTrend.reduce((acc: any, curr: any) => {
      const date = curr.date_taken;
      if (!acc[date]) acc[date] = { total: 0, count: 0 };
      const percentage = (curr.marks_obtained / (curr.tests?.total_marks || 100)) * 100;
      acc[date].total += percentage;
      acc[date].count += 1;
      return acc;
    }, {});
    return Object.keys(grouped)
      .map((date) => ({ date: format(new Date(date), "MMM d"), value: Math.round(grouped[date].total / grouped[date].count) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
  }, [testTrend]);

  const overviewTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    // For yearly/overall, group by week/month to avoid too many data points
    const maxPoints = attendanceRange === "yearly" || attendanceRange === "overall" ? 12 : range.length;
    const step = Math.max(1, Math.floor(range.length / maxPoints));
    
    const points: any[] = [];
    for (let i = 0; i < range.length; i += step) {
      const chunk = range.slice(i, i + step);
      let sPres = 0, sTotal = 0, tPres = 0, tTotal = 0;
      chunk.forEach(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const sRecs = historicalAttendance.filter((a) => a.date === dayStr);
        const tRecs = historicalTeacherAttendance.filter((a) => a.date === dayStr);
        sPres += sRecs.filter((a) => a.status === "present").length;
        sTotal += sRecs.length;
        tPres += tRecs.filter((a) => a.status === "present").length;
        tTotal += tRecs.length;
      });
      points.push({
        name: format(chunk[0], attendanceRange === "yearly" || attendanceRange === "overall" ? "MMM" : "eee"),
        Students: sTotal > 0 ? Math.round((sPres / sTotal) * 100) : 0,
        Teachers: tTotal > 0 ? Math.round((tPres / tTotal) * 100) : 0,
      });
    }
    return points;
  }, [historicalAttendance, historicalTeacherAttendance, dateRange, attendanceRange]);

  const totalStudents = students.length;
  const presentCount = allAttendance.filter((a) => a.status === "present").length;
  const teacherPresentCount = teacherAttendance.filter((a) => a.status === "present").length;
  const studentAttendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const teacherAttendanceRate = teachers.length > 0 ? Math.round((teacherPresentCount / teachers.length) * 100) : 0;
  const completedHomework = homeworkStats.filter((h) => ["completed", "checked"].includes(h.status || "")).length;
  const homeworkRate = homeworkStats.length > 0 ? Math.round((completedHomework / homeworkStats.length) * 100) : 0;
  const ratedEvaluations = evaluationStats.filter((e) => e.evaluation_rating !== null).length;
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

  // Connect instruction grid to period_schedules with current day
  const todayClasses = useMemo(() => {
    return periodSchedules.map((ps: any) => ({
      id: ps.id,
      time: ps.class_periods ? `${ps.class_periods.start_time?.slice(0, 5)} – ${ps.class_periods.end_time?.slice(0, 5)}` : "N/A",
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
      })(),
    })).sort((a: any, b: any) => a.time.localeCompare(b.time));
  }, [periodSchedules]);

  const recentAlerts = [
    ...allAttendance
      .filter((a) => a.status === "absent")
      .slice(0, 3)
      .map((a) => ({
        id: `absent-${a.student_id}`,
        title: `${students.find((s) => s.id === a.student_id)?.name || "Student"} absent today`,
        type: "warning" as const,
        timestamp: new Date().toISOString(),
      })),
    ...homeworkDefaulters.slice(0, 2).map((h) => ({
      id: `hw-${h.id}`,
      title: `Homework pending for Grade ${h.students?.grade}`,
      description: h.students?.name,
      type: "info" as const,
      timestamp: h.created_at,
    })),
  ].slice(0, 5);

  const isLoading = isStudentsLoading || isTeachersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-4">
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
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Top Header - redesigned */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.username?.split("@")[0]}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="flex items-center gap-2 bg-card p-1.5 pr-3 rounded-xl shadow-soft border">
            <CalendarIcon className="h-4 w-4 text-muted-foreground ml-2" />
            <span className="text-xs font-medium text-foreground">{format(new Date(), "eee, MMM d, yyyy")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <KPICard title="Student Attendance" value={`${studentAttendanceRate}%`} description={`${presentCount} / ${totalStudents} Present`} icon={Users} color="green" trendData={attendanceTrend} onClick={() => navigate("/attendance-summary")} secondaryIcon={CheckCircle2} secondaryIconColor="text-green-500" />
            <KPICard title="Teacher Attendance" value={`${teacherAttendanceRate}%`} description={`${teacherPresentCount} / ${teachers.length} Present`} icon={Clock} color="blue" trendData={teacherAttendanceTrend} onClick={() => navigate("/teacher-attendance")} secondaryIcon={Search} secondaryIconColor="text-blue-500" />
            <KPICard title="Test Performance" value={`${avgTestScore}%`} description="Average Score" icon={TrendingUp} color="purple" trendData={performanceTrend} onClick={() => navigate("/tests")} secondaryIcon={TrendingUp} secondaryIconColor="text-purple-500" />
            <KPICard title="Homework Completion" value={`${homeworkRate}%`} description="Global completion rate" icon={Book} color="orange" onClick={() => navigate("/homework")} secondaryIcon={BookOpen} secondaryIconColor="text-orange-500" />
            <KPICard title="Evaluation Rate" value={`${evaluationRate}%`} description="Syllabus coverage" icon={CheckCircle2} color="rose" onClick={() => navigate("/lesson-tracking")} secondaryIcon={CheckCircle2} secondaryIconColor="text-rose-500" />
            <KPICard title="Upcoming Lessons" value={upcomingLessons.length} description="Planned for this week" icon={FileText} color="indigo" onClick={() => navigate("/lesson-plans")} secondaryIcon={CalendarIcon} secondaryIconColor="text-primary" />
          </div>

          {/* Attendance Overview Chart with functional selectors */}
          <Card className="border shadow-soft bg-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Attendance Overview</CardTitle>
              <div className="flex gap-1">
                {(["weekly", "monthly", "yearly", "overall"] as AttendanceRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={attendanceRange === range ? "default" : "ghost"}
                    size="sm"
                    className={cn("text-xs h-7 rounded-lg capitalize", attendanceRange === range && "shadow-soft")}
                    onClick={() => setAttendanceRange(range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overviewTrend}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTeachers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                    <Area type="monotone" dataKey="Students" stroke="hsl(var(--success))" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
                    <Area type="monotone" dataKey="Teachers" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTeachers)" />
                    <Legend verticalAlign="top" align="left" iconType="circle" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border shadow-soft bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-success/5 border-b border-success/10">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-success flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[400px] overflow-y-auto custom-scrollbar">
                  {highestPerformers.length === 0 ? (
                    <p className="p-8 text-center text-xs italic text-muted-foreground">No data available</p>
                  ) : (
                    highestPerformers.slice(0, 10).map((r: any) => (
                      <div key={r.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/student-report?studentId=${r.student_id}`)}>
                        <div>
                          <p className="text-sm font-bold">{r.students?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.tests?.name}</p>
                        </div>
                        <Badge className="bg-success text-success-foreground font-bold text-[10px]">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-soft bg-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-destructive/5 border-b border-destructive/10">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Critical Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[400px] overflow-y-auto custom-scrollbar">
                  {lowestPerformers.length === 0 ? (
                    <p className="p-8 text-center text-xs italic text-muted-foreground">No critical alerts</p>
                  ) : (
                    lowestPerformers.slice(0, 10).map((r: any) => (
                      <div key={r.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/student-report?studentId=${r.student_id}`)}>
                        <div>
                          <p className="text-sm font-bold">{r.students?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.tests?.name}</p>
                        </div>
                        <Badge className="bg-destructive text-destructive-foreground font-bold text-[10px]">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Teacher & Finance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border shadow-soft bg-card rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Teacher Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[400px] overflow-y-auto custom-scrollbar">
                  {teachers.length === 0 ? (
                    <p className="p-8 text-center text-xs italic text-muted-foreground">No teachers found</p>
                  ) : (
                    teachers.map((t) => {
                      const attendance = teacherAttendance.find((ta) => ta.teacher_id === t.id);
                      const status = attendance?.status || "pending";

                      return (
                        <div key={t.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/teachers")}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center",
                              status === "present" ? "bg-success/10" : status === "absent" ? "bg-destructive/10" : "bg-warning/10"
                            )}>
                              <Users className={cn(
                                "h-4 w-4",
                                status === "present" ? "text-success" : status === "absent" ? "text-destructive" : "text-warning"
                              )} />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{t.name}</p>
                              <p className="text-[10px] text-muted-foreground">{t.subject}</p>
                            </div>
                          </div>
                          <Badge
                            variant={status === "present" ? "success" : status === "absent" ? "destructive" : "warning"}
                            className="font-bold text-[9px] uppercase"
                          >
                            {status === "present" ? "Present" : status === "absent" ? "Absent" : "Not Marked"}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-soft bg-card rounded-2xl cursor-pointer hover:shadow-medium transition-shadow" onClick={() => navigate("/finance")}>
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-success" /> Financial Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Collection Ratio</p>
                    <p className="text-4xl font-black tracking-tight">{collectionRate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Invoiced</p>
                    <p className="text-xl font-bold">{formatCurrency(totalInvoiced)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="text-success">{formatCurrency(feeCollection)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: `${collectionRate}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activities & Discipline Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Activities Preview */}
            <Card className="border shadow-soft bg-card rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" /> Activities
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/activities")}>
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {recentActivities.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground italic">No upcoming activities</p>
                ) : (
                  <div className="divide-y">
                    {recentActivities.map((a: any) => (
                      <div key={a.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-semibold">{a.title || a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Grade {a.grade || "All"} · {a.activity_date ? format(new Date(a.activity_date), "MMM d") : "No date"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discipline Preview */}
            <Card className="border shadow-soft bg-card rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" /> Discipline Issues
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => navigate("/discipline")}>
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {recentDiscipline.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground italic">No discipline issues reported</p>
                ) : (
                  <div className="divide-y">
                    {recentDiscipline.map((d: any) => (
                      <div key={d.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <p className="text-sm font-semibold">{d.description?.substring(0, 60)}{d.description?.length > 60 ? "..." : ""}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.students?.name} · Grade {d.students?.grade} · {format(new Date(d.issue_date), "MMM d")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-6">
          <AlertList alerts={recentAlerts} onViewAll={() => navigate("/messages")} />
          <ClassSchedule classes={todayClasses} title="Today's Classes" onViewRoutine={() => navigate("/class-routine")} />
        </div>
      </div>
    </div>
  );
}
