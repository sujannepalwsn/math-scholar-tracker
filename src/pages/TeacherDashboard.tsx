import React from 'react';
import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, Book, BookOpen, Calendar, CalendarIcon, Clock, Home, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { eachDayOfInterval, format, isFuture, isToday, startOfDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { KPICard } from '@/components/dashboard/KPICard';
import { AlertList } from '@/components/dashboard/AlertList';
import { ClassSchedule } from '@/components/dashboard/ClassSchedule';
import CenterLogo from '@/components/CenterLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  CalendarIcon,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  Book,
  Bell,
  Calendar,
  Home,
  MessageSquare
} from "lucide-react";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const teacherId = user?.teacher_id;
  const centerId = user?.center_id;

  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7).toISOString().split("T")[0],
    to: today
  });

  // Data Fetching
  const { data: teacherStudents = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ["teacher-students", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase.from("students").select("*").eq("center_id", centerId).eq("is_active", true);
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
        .select("*, students(name, grade), tests(name, total_marks, teacher_id)")
        .eq("tests.teacher_id", teacherId)
        .gte("date_taken", dateRange.from)
        .lte("date_taken", dateRange.to);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId });

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
    queryKey: ["teacher-homework-to-grade", teacherId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("student_homework_records")
        .select("*, students(name, grade), homework!inner(title, teacher_id)")
        .eq("homework.teacher_id", teacherId)
        .eq("status", "submitted")
        .gte("created_at", `${dateRange.from}T00:00:00`)
        .lte("created_at", `${dateRange.to}T23:59:59`)
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teacherId });

  const { data: historicalAttendance = [] } = useQuery({
    queryKey: ["teacher-student-attendance-historical", teacherId, dateRange.from, dateRange.to],
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

  const attendanceTrend = useMemo(() => {
    const range = eachDayOfInterval({ start: new Date(dateRange.from), end: new Date(dateRange.to) });
    return range.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = historicalAttendance.filter(a => a.date === dayStr);
      const present = dayRecords.filter(a => a.status === "present").length;
      return { date: format(day, "MMM d"), value: dayRecords.length > 0 ? Math.round((present / dayRecords.length) * 100) : 0 };
    });
  }, [historicalAttendance]);

  const avgPerformance = classResults.length > 0
    ? Math.round(classResults.reduce((acc, curr: any) => acc + (curr.marks_obtained / (curr.tests?.total_marks || 100)) * 100, 0) / classResults.length)
    : 0;

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
    <div className="min-h-screen bg-[#f8faff] p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <CenterLogo size="lg" />
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative bg-white shadow-soft rounded-xl">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full border-2 border-white" />
          </Button>
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-2xl shadow-soft">
            <div className="h-9 w-9 bg-indigo-100 rounded-xl flex items-center justify-center overflow-hidden">
               <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 leading-none">{user?.username?.split('@')[0]}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teacher</p>
            </div>
          </div>
        </div>
      </div>

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

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KPICard title="My Students" value={teacherStudents.length} description="Total assigned" icon={Users} color="indigo" onClick={() => navigate("/teacher/student-report")} />
        <KPICard title="Today's Classes" value={todayClasses.length} description="Scheduled for today" icon={Clock} color="blue" onClick={() => navigate("/teacher/class-routine")} />
        <KPICard title="Pending Homework" value={homeworkToGrade.length} description="Submissions to grade" icon={Book} color="orange" onClick={() => navigate("/teacher/homework-management")} />
        <KPICard title="Unread Messages" value={unreadCount} description="New communications" icon={MessageSquare} color="green" onClick={() => navigate("/teacher-messages")} />
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <KPICard title="Class Proficiency" value={`${avgPerformance}%`} description="Average performance index" icon={TrendingUp} color="purple" trendData={attendanceTrend} />

           <Card className="border-none shadow-soft bg-white/60 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
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
                                <p className="text-sm font-bold text-slate-800">{r.students?.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Grade {r.students?.grade} • {r.tests?.name}</p>
                             </div>
                             <Badge className="bg-indigo-500 text-white font-black text-[10px]">{Math.round((r.marks_obtained / (r.tests?.total_marks || 100)) * 100)}%</Badge>
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
        <Card className="lg:col-span-2 border-none shadow-soft bg-white/60 backdrop-blur-md rounded-2xl border border-white/20">
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
                           <p className="text-sm font-bold text-slate-800">{att.meetings?.title}</p>
                           <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{att.meetings?.meeting_type}</p>
                        </div>
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
