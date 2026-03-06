import { AlertTriangle, Book, BookOpen, Calendar as CalendarIcon, CheckCircle, ClipboardCheck, Clock, DollarSign, FileText, LogOut, MessageSquare, Paintbrush, Radio, Star, User, Video, XCircle, LayoutDashboard, GraduationCap, Wallet, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo, useEffect } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isPast, isToday, isFuture } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { safeFormatDate, cn } from '@/lib/utils';
import ParentChapterPerformanceTable from '@/components/parent/ParentChapterPerformanceTable';
import ParentChapterDetailModal from '@/components/parent/ParentChapterDetailModal';

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

type StudentHomeworkRecord = Tables<'student_homework_records'>;
type DisciplineIssue = Tables<'discipline_issues'>;
type LessonPlan = Tables<'lesson_plans'>;
type StudentChapter = Tables<'student_chapters'>;
type Invoice = Tables<'invoices'>;
type Test = Tables<'tests'>;
type Homework = Tables<'homework'>;
type TestResult = Tables<'test_results'>;

interface ChapterPerformanceGroup {
  lessonPlan: LessonPlan;
  studentChapters: (StudentChapter & { recorded_by_teacher?: Tables<'teachers'> })[];
  testResults: (TestResult & { tests: Pick<Test, 'id' | 'name' | 'subject' | 'total_marks' | 'lesson_plan_id' | 'questions'> })[];
  homeworkRecords: (StudentHomeworkRecord & { homework: Pick<Homework, 'id' | 'title' | 'subject' | 'due_date'> })[];
}

const MiniCalendar = ({ attendance, lessonRecords, tests, selectedMonth, setSelectedMonth }) => {
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });

  const getAttendanceStatus = (date: string) => {
    const record = attendance.find((a: any) => safeFormatDate(a.date, 'yyyy-MM-dd') === date);
    if (!record) return 'none';
    return record.status === 'present' ? 'present' : 'absent';
  };

  const getTooltipData = (date: string) => {
    const dayLessons = lessonRecords.filter((lr: any) => safeFormatDate(lr.completed_at, 'yyyy-MM-dd') === date);
    const dayTests = tests.filter(t => safeFormatDate(t.date_taken, 'yyyy-MM-dd') === date);
    return { dayLessons, dayTests };
  };

  const colors = { present: 'bg-green-500', absent: 'bg-red-500', none: 'bg-muted' };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="h-8 w-8">{"<"}</Button>
          <span className="font-semibold text-sm">{format(selectedMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="h-8 w-8">{">"}</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-muted-foreground">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map(day => {
            const dateStr = safeFormatDate(day, 'yyyy-MM-dd');
            const status = getAttendanceStatus(dateStr);
            const tooltipData = getTooltipData(dateStr);

            return (
              <div key={dateStr} className="relative group">
                <div
                  className={cn(
                    "aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-colors",
                    colors[status],
                    status !== 'none' ? 'text-white' : 'text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {day.getDate()}
                </div>

                {(tooltipData.dayLessons.length > 0 || tooltipData.dayTests.length > 0) && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-popover border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                    {tooltipData.dayLessons.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-primary mb-1">Lessons Completed</p>
                        {tooltipData.dayLessons.map((lr: any) => (
                          <p key={lr.id} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{lr.lesson_plans?.chapter}</span> - {lr.lesson_plans?.topic || 'General'}
                          </p>
                        ))}
                      </div>
                    )}
                    {tooltipData.dayTests.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-orange-600 mb-1">Test Results</p>
                        {tooltipData.dayTests.map(t => (
                          <p key={t.id} className="text-xs text-muted-foreground">
                            {t.tests?.name}: <span className="font-medium text-green-600">{t.marks_obtained}/{t.tests?.total_marks}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const ParentDashboardContent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({
    from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  
  const linkedStudents = user?.linked_students || [];
  const hasMultipleChildren = linkedStudents.length > 1;
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    user?.student_id || linkedStudents[0]?.id || null
  );

  const [showChapterDetailModal, setShowChapterDetailModal] = useState(false);
  const [selectedChapterGroup, setSelectedChapterGroup] = useState<ChapterPerformanceGroup | null>(null);

  const handleViewChapterDetails = (chapterGroup: ChapterPerformanceGroup) => {
    setSelectedChapterGroup(chapterGroup);
    setShowChapterDetailModal(true);
  };

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  useEffect(() => {
    if (!selectedStudentId && linkedStudents.length > 0) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  if (!user || user.role !== 'parent' || (!user.student_id && linkedStudents.length === 0)) {
    navigate('/login-parent');
    return null;
  }

  const activeStudentId = selectedStudentId || user.student_id;

  const { data: student } = useQuery({
    queryKey: ['student', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return null;
      const { data, error } = await supabase.from('students').select('*').eq('id', activeStudentId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['parent-upcoming-events', student?.center_id],
    queryFn: async () => {
      if (!student?.center_id) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('center_events')
        .select('*')
        .eq('center_id', student.center_id)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!student?.center_id,
  });

  const { data: latestBroadcastMessage } = useQuery({
    queryKey: ['latest-broadcast-message', user.id],
    queryFn: async () => {
      if (!user.id) return null;
      const { data: conversation } = await supabase.from('chat_conversations').select('id').eq('parent_user_id', user.id).maybeSingle();
      if (!conversation) return null;
      const { data: message } = await supabase.from('chat_messages').select('message_text, sent_at').eq('conversation_id', conversation.id).order('sent_at', { ascending: false }).limit(1).maybeSingle();
      return message;
    },
    enabled: !!user.id,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('attendance').select('*').eq('student_id', activeStudentId).order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ['test-results-parent-dashboard', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('test_results').select('*, tests(*)').eq('student_id', activeStudentId).order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['student-lesson-records-mini-calendar', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('student_chapters').select('*, lesson_plans(id, subject, chapter, topic, lesson_date)').eq('student_id', activeStudentId).order('completed_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  const { data: homeworkStatus = [] } = useQuery({
    queryKey: ['student-homework-records', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('student_homework_records').select('*, homework(*)').eq('student_id', activeStudentId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ['student-discipline-issues', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('discipline_issues').select('*').eq('student_id', activeStudentId).order('issue_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['student-invoices-dashboard', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase.from('invoices').select('*').eq('student_id', activeStudentId);
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!activeStudentId,
  });

  const { data: allLessonPlans = [] } = useQuery({
    queryKey: ["all-lesson-plans-for-report", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("lesson_plans").select("id, subject, chapter, topic, grade, lesson_date, notes, lesson_file_url").eq("center_id", user.center_id).order("lesson_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const { data: upcomingMeetings = [] } = useQuery({
    queryKey: ['parent-upcoming-meetings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from('meeting_attendees').select('*, meetings(id, title, meeting_date, meeting_type, status, location, agenda)').eq('user_id', user.id).order('created_at', { ascending: false });
      return (data || []).filter((att: any) => att.meetings?.meeting_date && (isFuture(new Date(att.meetings.meeting_date)) || isToday(new Date(att.meetings.meeting_date)))).slice(0, 5);
    },
    enabled: !!user?.id,
  });

  const pendingFees = useMemo(() => invoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0), [invoices]);
  const attendancePercentage = attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;

  const filteredTestResults = testResults.filter((tr: any) => tr.date_taken && new Date(tr.date_taken) >= new Date(dateRange.from) && new Date(tr.date_taken) <= new Date(dateRange.to));
  const testStats = useMemo(() => {
    const filtered = filteredTestResults.filter((tr: any) => tr.tests);
    if (filtered.length === 0) return { total: 0, average: 0, highest: 0, lowest: 0 };
    const percentages = filtered.map((tr: any) => (tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100);
    return { total: filtered.length, average: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length), highest: Math.round(Math.max(...percentages)), lowest: Math.round(Math.min(...percentages)) };
  }, [filteredTestResults]);

  const todaysHomework = homeworkStatus.filter((hs: any) => hs.homework?.due_date && isToday(new Date(hs.homework.due_date)) && !['completed', 'checked'].includes(hs.status));
  const overdueHomeworksOnly = homeworkStatus.filter((hs: any) => hs.homework?.due_date && isPast(new Date(hs.homework.due_date)) && !isToday(new Date(hs.homework.due_date)) && !['completed', 'checked'].includes(hs.status));
  const todaysAttendance = attendance.find(a => isToday(new Date(a.date)));
  const todaysLessonsStudied = lessonRecords.filter((lr: any) => lr.completed_at && isToday(new Date(lr.completed_at)));
  const missedChaptersCount = useMemo(() => {
    if (!student?.grade) return 0;
    const completedIds = new Set(lessonRecords.map(sc => sc.lesson_plan_id));
    return allLessonPlans.filter(lp => lp.grade === student.grade && !completedIds.has(lp.id) && new Date(lp.lesson_date) <= today).length;
  }, [student, lessonRecords, allLessonPlans]);

  const chapterPerformanceData: ChapterPerformanceGroup[] = useMemo(() => {
    const dataMap = new Map<string, ChapterPerformanceGroup>();
    lessonRecords.forEach((sc: any) => {
      if (sc.lesson_plan_id && sc.lesson_plans && new Date(sc.completed_at) >= new Date(dateRange.from) && new Date(sc.completed_at) <= new Date(dateRange.to)) {
        if (!dataMap.has(sc.lesson_plan_id)) dataMap.set(sc.lesson_plan_id, { lessonPlan: sc.lesson_plans, studentChapters: [], testResults: [], homeworkRecords: [] });
        dataMap.get(sc.lesson_plan_id)?.studentChapters.push(sc);
      }
    });
    return Array.from(dataMap.values()).sort((a, b) => new Date(b.lessonPlan.lesson_date).getTime() - new Date(a.lessonPlan.lesson_date).getTime());
  }, [lessonRecords, dateRange]);

  const StatCard = ({ title, value, icon: Icon, description, bgColor, content, isAlert }: any) => (
    <Card className={cn(isAlert && value > 0 && "border-red-200 bg-red-50")}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {value !== undefined ? (
              <h3 className={cn("text-xl font-bold", isAlert && value > 0 ? "text-red-600" : "text-foreground")}>{value}</h3>
            ) : (
              <div className="mt-1">{content}</div>
            )}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className={cn("p-2 rounded-lg", bgColor)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Parent Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your child's academic progress
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted/50 px-4 py-2 rounded-lg flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{student?.name || "Loading..."}</span>
          </div>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" /> Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Academic Year</p>
                  <p className="font-semibold">2024-25</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grade</p>
                  <Badge variant="secondary">{student.grade}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student ID</p>
                  <p className="font-medium text-sm">{activeStudentId?.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">School</p>
                  <p className="font-medium text-sm truncate">{student.school_name || "Not specified"}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">Loading student data...</div>
            )}
          </CardContent>
        </Card>

        {hasMultipleChildren && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Select Child</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedStudentId || ''} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {linkedStudents.map((child) => (
                    <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Messages" icon={Radio} bgColor="bg-blue-100 text-blue-600" content={latestBroadcastMessage ? <p className="text-xs line-clamp-2">{latestBroadcastMessage.message_text}</p> : <p className="text-xs text-muted-foreground">No new messages</p>} />
        <StatCard title="Today's Homework" value={todaysHomework.length} icon={Book} bgColor="bg-orange-100 text-orange-600" description="assignments" />
        <StatCard title="Overdue" value={overdueHomeworksOnly.length} icon={AlertTriangle} bgColor="bg-red-100 text-red-600" description="past due" isAlert />
        <StatCard title="Pending Fees" value={pendingFees > 0 ? `Rs.${pendingFees.toFixed(0)}` : 'Rs.0'} icon={Wallet} bgColor="bg-purple-100 text-purple-600" description="outstanding" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CENTER COLUMN: ANALYTICS & CHAPTERS */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-strong bg-white/40 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-slate-100 p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10"><BookOpen className="h-6 w-6 text-primary" /></div>
                  Academic Progress Matrix
                </CardTitle>
                <div className="flex items-center gap-2 bg-white/60 p-1 rounded-xl border border-white/40 shadow-soft">
                   <Input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="h-8 w-32 border-none bg-transparent text-[10px] font-black uppercase" />
                   <span className="text-[10px] font-black text-slate-300">TO</span>
                   <Input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="h-8 w-32 border-none bg-transparent text-[10px] font-black uppercase" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <ParentChapterPerformanceTable chapterPerformanceData={chapterPerformanceData} onViewDetails={handleViewChapterDetails} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <Card className="border-none shadow-strong bg-white/40 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20">
                <CardHeader className="border-b border-slate-100 p-6">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-emerald-500" /> Evaluation Synthesis
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {testStats.total > 0 ? (
                    <div className="space-y-6">
                       <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Mean Score</p>
                            <p className="text-4xl font-black text-slate-800 tracking-tighter">{testStats.average}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Sample Size</p>
                            <p className="text-xl font-black text-primary">{testStats.total} Tests</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Peak Perf</p>
                            <p className="text-lg font-black text-slate-700">{testStats.highest}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Min Perf</p>
                            <p className="text-lg font-black text-slate-700">{testStats.lowest}%</p>
                          </div>
                       </div>
                    </div>
                  ) : <p className="text-center py-10 text-xs italic text-slate-400">No evaluation data identified.</p>}
                </CardContent>
             </Card>

             <Card className="border-none shadow-strong bg-white/40 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20">
                <CardHeader className="border-b border-slate-100 p-6">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-indigo-500" /> Attendance Protocol
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                     <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Presence Index</p>
                          <p className="text-4xl font-black text-slate-800 tracking-tighter">{attendancePercentage}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Protocol Day</p>
                          <p className="text-xl font-black text-indigo-600">{todaysAttendance ? todaysAttendance.status.toUpperCase() : "PENDING"}</p>
                        </div>
                     </div>
                     <Button variant="ghost" className="w-full rounded-2xl border-none bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase tracking-widest h-10" onClick={() => setShowMiniCalendar(!showMiniCalendar)}>
                        {showMiniCalendar ? "Minimize Calendar" : "Expand Heatmap"}
                     </Button>
                  </div>
                </CardContent>
             </Card>
          </div>
        </div>

        {/* RIGHT COLUMN: CALENDAR & ALERTS */}
        <div className="space-y-8">
          {showMiniCalendar && (
            <MiniCalendar attendance={attendance} lessonRecords={lessonRecords} tests={testResults} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
          )}

          <Card className="border-none shadow-strong rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
             <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md"><Zap className="h-6 w-6 text-amber-400" /></div>
                   <Badge className="bg-white/20 text-white border-none font-black text-[9px] tracking-widest px-3">CRITICAL VECTOR</Badge>
                </div>
                <div className="space-y-1">
                   <h4 className="text-xl font-black tracking-tight">System Summary</h4>
                   <p className="text-slate-400 text-xs font-medium leading-relaxed">Integrated monitoring of academic and institutional milestones.</p>
                </div>
                <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-6">
                   <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Missed</p>
                      <p className="text-2xl font-black text-rose-500">{missedChaptersCount}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Completed</p>
                      <p className="text-2xl font-black text-emerald-500">{lessonRecords.length}</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          {upcomingMeetings.length > 0 && (
            <Card className="border-none shadow-strong bg-white/40 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/20">
              <CardHeader className="p-6 border-b border-slate-100">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-500" /> Upcoming Briefings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {upcomingMeetings.map((att: any) => (
                  <div key={att.id} className="p-4 rounded-2xl bg-white/60 border border-white/40 shadow-soft space-y-2">
                    <p className="text-xs font-black text-slate-800 truncate">{att.meetings?.title}</p>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                       <span className="uppercase tracking-widest">{format(new Date(att.meetings?.meeting_date), 'MMM dd')}</span>
                       <span className="text-primary">{format(new Date(att.meetings?.meeting_date), 'p')}</span>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary" onClick={() => navigate('/parent-meetings')}>View Full Schedule</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ParentChapterDetailModal open={showChapterDetailModal} onOpenChange={setShowChapterDetailModal} chapterGroup={selectedChapterGroup} />
    </div>
  );
};

const ParentDashboard = () => (
  <QueryClientProvider client={queryClient}>
    <ParentDashboardContent />
  </QueryClientProvider>
);

export default ParentDashboard;
