import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { cn, safeFormatDate } from "@/lib/utils";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { addMonths, eachDayOfInterval, endOfMonth, format, isFuture, isPast, isToday, startOfMonth, subMonths } from "date-fns";
import { AlertTriangle, BookOpenIcon, ClipboardCheck, Clock, DollarSign, FileText, LogOut, MessageSquare, Paintbrush, Radio, Star, User, Video, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Import safeFormatDate
import ParentChapterPerformanceTable from '@/components/parent/ParentChapterPerformanceTable'; // NEW
import ParentChapterDetailModal from '@/components/parent/ParentChapterDetailModal'; // NEW

// Initialize QueryClient (v4 syntax)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 min
      retry: 1,
    },
  },
});

type StudentHomeworkRecord = Tables<'student_homework_records'>;
type DisciplineIssue = Tables<'discipline_issues'>;
type LessonPlan = Tables<'lesson_plans'>;
type StudentChapter = Tables<'student_chapters'>;
type Invoice = Tables<'invoices'>;
type Payment = Tables<'payments'>;
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

  const colors = { present: '#16a34a', absent: '#dc2626', none: '#e5e7eb' };

  return (
    <div className="w-full max-w-md border rounded p-2 bg-white shadow">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-2">
        <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="px-2">‹</button>
        <span className="font-semibold">{format(selectedMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="px-2">›</button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center font-semibold text-xs text-gray-500">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map(day => {
          const dateStr = safeFormatDate(day, 'yyyy-MM-dd');
          const status = getAttendanceStatus(dateStr);
          const tooltipData = getTooltipData(dateStr);

          return (
            <div key={dateStr} className="relative group">
              <div
                className="aspect-square rounded flex items-center justify-center text-xs font-medium cursor-pointer"
                style={{ backgroundColor: colors[status], color: status !== 'none' ? 'white' : 'inherit' }}
              >
                {day.getDate()}
              </div>

              {(tooltipData.dayLessons.length > 0 || tooltipData.dayTests.length > 0) && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2 bg-white border rounded shadow-strong opacity-0 group-hover:opacity-100 transition-opacity z-10 text-xs">
                  {tooltipData.dayLessons.length > 0 && (
                    <div className="mb-1">
                      <p className="font-semibold border-b mb-1">Lessons</p>
                      {tooltipData.dayLessons.map((lr: any) => (
                        <p key={lr.id}>
                          <span className="font-semibold">{lr.lesson_plans?.chapter}</span> ({lr.lesson_plans?.subject}) - {lr.lesson_plans?.topic || 'No topic'}
                        </p>
                      ))}
                    </div>
                  )}
                  {tooltipData.dayTests.length > 0 && (
                    <div>
                      <p className="font-semibold border-b mb-1">Tests</p>
                      {tooltipData.dayTests.map(t => (
                        <p key={t.id}>
                          {t.tests?.name}: {t.marks_obtained}/{t.tests?.total_marks}
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
    </div>
  );
};

const ParentDashboardContent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({
    from: format(subMonths(new Date(), 3), 'yyyy-MM-dd'), // Default to last 3 months
    to: format(new Date(), 'yyyy-MM-dd')
  });
  
  // Multi-child support: track selected student
  const linkedStudents = user?.linked_students || [];
  const hasMultipleChildren = linkedStudents.length > 1;
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    user?.student_id || linkedStudents[0]?.id || null
  );

  const [showChapterDetailModal, setShowChapterDetailModal] = useState(false); // NEW
  const [selectedChapterGroup, setSelectedChapterGroup] = useState<ChapterPerformanceGroup | null>(null); // NEW

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Update selected student when linked_students changes
  useEffect(() => {
    if (!selectedStudentId && linkedStudents.length > 0) {
      setSelectedStudentId(linkedStudents[0].id);
    }
  }, [linkedStudents, selectedStudentId]);

  if (!user || user.role !== 'parent' || (!user.student_id && linkedStudents.length === 0)) {
    navigate('/login-parent');
    return null;
  }

  // Use the selected student ID (or fallback to user.student_id for legacy support)
  const activeStudentId = selectedStudentId || user.student_id;

  // Fetch student details
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

  // Fetch upcoming center events for this student's center
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

  // Fetch latest broadcast message for this parent's conversation
  const { data: latestBroadcastMessage } = useQuery({
    queryKey: ['latest-broadcast-message', user.id],
    queryFn: async () => {
      if (!user.id) return null;
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('parent_user_id', user.id)
        .maybeSingle();

      if (convError || !conversation) return null;

      const { data: message, error: msgError } = await supabase
        .from('chat_messages')
        .select('message_text, sent_at')
        .eq('conversation_id', conversation.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (msgError) console.error("Error fetching latest broadcast message:", msgError);
      return message;
    },
    enabled: !!user.id,
  });

  // Attendance
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

  // Tests (for MiniCalendar tooltip and Test Report)
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

  // Lesson Records (student_chapters now links to lesson_plans)
  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['student-lesson-records-mini-calendar', activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      let query = supabase.from('student_chapters').select(`
        *,
        lesson_plans(id, subject, chapter, topic, lesson_date)
      `).eq('student_id', activeStudentId).order('completed_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  // Homework Records
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

  // Discipline Issues
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

  // Fetch Invoices for Pending Fees
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

  // Fetch all lesson plans for the center
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
    enabled: !!user?.center_id,
  });

  // Fetch upcoming meetings for parent
  const { data: upcomingMeetings = [] } = useQuery({
    queryKey: ['parent-upcoming-meetings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('meeting_attendees')
        .select(`
          *,
          meetings(id, title, meeting_date, meeting_type, status, location, agenda)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter((att: any) => {
        if (!att.meetings?.meeting_date) return false;
        const meetingDate = new Date(att.meetings.meeting_date);
        return isFuture(meetingDate) || isToday(meetingDate);
      }).slice(0, 5);
    },
    enabled: !!user?.id,
  });

  // Calculate summary - handle null paid_amount
  const pendingFees = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
  }, [invoices]);

  // Attendance summary
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const absentDays = totalDays - presentDays;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Filtered attendance by date range
  const filteredAttendance = attendance.filter(a => {
    if (!dateRange.from || !dateRange.to) return true;
    const date = new Date(a.date);
    return date >= new Date(dateRange.from) && date <= new Date(dateRange.to);
  });

  // Filtered test results by date range
  const filteredTestResults = testResults.filter((tr: any) => {
    if (!dateRange.from || !dateRange.to) return true;
    if (!tr.date_taken) return false;
    const date = new Date(tr.date_taken);
    return date >= new Date(dateRange.from) && date <= new Date(dateRange.to);
  });

  // Test statistics
  const testStats = useMemo(() => {
    const filtered = filteredTestResults.filter((tr: any) => tr.tests);
    if (filtered.length === 0) {
      return { total: 0, average: 0, highest: 0, lowest: 0 };
    }
    const percentages = filtered.map((tr: any) => {
      const total = tr.tests?.total_marks || 1;
      return (tr.marks_obtained / total) * 100;
    });
    return {
      total: filtered.length,
      average: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
      highest: Math.round(Math.max(...percentages)),
      lowest: Math.round(Math.min(...percentages)),
    };
  }, [filteredTestResults]);

  const handleLogout = () => {
    logout();
    navigate('/login-parent');
  };

  // --------------------------
  // Helper: robust time formatter
  // --------------------------
  const formatTimeValue = (timeVal: string | null, dateVal: string | null) => {
    if (!timeVal) return '-';

    // If timeVal is just "HH:mm" or "HH:mm:ss", combine with dateVal
    if (typeof timeVal === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeVal)) {
      let datePart = null;

      if (dateVal) {
        const dtemp = new Date(dateVal);
        if (!isNaN(dtemp.getTime())) {
          datePart = dtemp.toISOString().split('T')[0];
        } else if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
          datePart = dateVal.split('T')[0];
        }
      }

      // Fallback to today's date if datePart not available
      if (!datePart) {
        datePart = new Date().toISOString().split('T')[0];
      }

      // Try combining date and time
      const d = new Date(`${datePart}T${timeVal}`);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // If direct parsing or combining fails, return original value or placeholder
    return timeVal;
  };

  // --- New Dashboard Card Data Calculations ---

  // Today's Homework
  const todaysHomework = homeworkStatus.filter((hs: any) => 
    hs.homework?.due_date && isToday(new Date(hs.homework.due_date)) && 
    !['completed', 'checked'].includes(hs.status)
  );

  // Missed or Due Homeworks (excluding today's)
  const overdueHomeworksOnly = homeworkStatus.filter((hs: any) => {
    if (!hs.homework?.due_date) return false;
    const dueDate = new Date(hs.homework.due_date);
    const isNotCompleted = !['completed', 'checked'].includes(hs.status);
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    return isNotCompleted && isOverdue;
  });

  // Today's Attendance
  const todaysAttendance = attendance.find(a => isToday(new Date(a.date)));

  // Today's Lessons Studied
  const todaysLessonsStudied = lessonRecords.filter((lr: any) => 
    lr.completed_at && isToday(new Date(lr.completed_at))
  );

  // Today's Discipline Issues
  const todaysDisciplineIssues = disciplineIssues.filter(di => 
    di.issue_date && isToday(new Date(di.issue_date))
  );

  // NEW: Calculate Missed Chapters for Dashboard
  const missedChaptersCount = useMemo(() => {
    if (!student?.grade) return 0;
    const studentGrade = student.grade;

    const completedLessonPlanIds = new Set(lessonRecords.map(sc => sc.lesson_plan_id));

    const missed = allLessonPlans.filter(lp => 
      lp.grade === studentGrade && // Filter by student's grade
      !completedLessonPlanIds.has(lp.id) &&
      new Date(lp.lesson_date) <= today // Only count lessons that should have been taught by now
    );
    return missed.length;
  }, [student, lessonRecords, allLessonPlans, today]);


  // NEW: Chapter-wise Performance Data Grouping for Parent Dashboard
  const chapterPerformanceData: ChapterPerformanceGroup[] = useMemo(() => {
    const dataMap = new Map<string, ChapterPerformanceGroup>();

    // Filter studentChapters, testResults, homeworkStatus by dateRange
    const filteredStudentChapters = lessonRecords.filter((sc: any) => {
      if (!sc.completed_at) return false;
      const date = new Date(sc.completed_at);
      return date >= new Date(dateRange.from) && date <= new Date(dateRange.to);
    });

    const filteredTestResults = testResults.filter((tr: any) => {
      if (!tr.date_taken) return false;
      const date = new Date(tr.date_taken);
      return date >= new Date(dateRange.from) && date <= new Date(dateRange.to);
    });

    const filteredHomeworkRecords = homeworkStatus.filter((hs: any) => {
      if (!hs.homework?.due_date) return false;
      const date = new Date(hs.homework.due_date);
      return date >= new Date(dateRange.from) && date <= new Date(dateRange.to);
    });

    // Process student_chapters (lesson evaluations)
    filteredStudentChapters.forEach((sc: any) => {
      if (sc.lesson_plan_id && sc.lesson_plans) {
        if (!dataMap.has(sc.lesson_plan_id)) {
          dataMap.set(sc.lesson_plan_id, {
            lessonPlan: sc.lesson_plans,
            studentChapters: [],
            testResults: [],
            homeworkRecords: [],
          });
        }
        dataMap.get(sc.lesson_plan_id)?.studentChapters.push(sc);
      }
    });

    // Process test results
    filteredTestResults.forEach((tr: any) => {
      if (tr.tests?.lesson_plan_id) {
        if (!dataMap.has(tr.tests.lesson_plan_id)) {
          const correspondingLessonPlan = allLessonPlans.find(lp => lp.id === tr.tests.lesson_plan_id);
          if (correspondingLessonPlan) {
            dataMap.set(tr.tests.lesson_plan_id, {
              lessonPlan: correspondingLessonPlan as any,
              studentChapters: [],
              testResults: [],
              homeworkRecords: [],
            });
          } else {
            return; // Skip if no corresponding lesson plan found
          }
        }
        dataMap.get(tr.tests.lesson_plan_id)?.testResults.push(tr);
      }
    });

    // Process homework records - match by subject instead of lesson_plan_id
    filteredHomeworkRecords.forEach((hs: any) => {
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
  }, [lessonRecords, testResults, homeworkStatus, dateRange, allLessonPlans]); // Added allLessonPlans to dependencies

  const handleViewChapterDetails = (chapterGroup: ChapterPerformanceGroup) => {
    setSelectedChapterGroup(chapterGroup);
    setShowChapterDetailModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl shadow-soft">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">Parent Portal</h1>
              <p className="text-muted-foreground text-lg">Welcome back! Monitoring your child's progress.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex bg-secondary/50 px-4 py-2 rounded-2xl border border-primary/5 items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{format(new Date(), 'MMM d, yyyy')}</span>
             </div>
             <Button variant="outline" onClick={handleLogout} className="rounded-2xl border-2">
                <LogOut className="h-4 w-4 mr-2" /> Logout
             </Button>
          </div>
        </div>

        {/* STUDENT SELECTOR FOR MULTI-CHILD */}
        {hasMultipleChildren && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Select Child</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedStudentId || ''} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {linkedStudents.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name} {child.grade ? `(Grade ${child.grade})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* STUDENT INFO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">{student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grade</p>
                  <p className="font-semibold">{student.grade}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">School</p>
                  <p className="font-semibold">{student.school_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="font-semibold">{student.contact_number}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No student data available</p>
            )}
          </CardContent>
        </Card>

        {/* NEW SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[
            {
              title: "Latest Broadcast",
              icon: Radio,
              color: "text-blue-600",
              bgColor: "bg-blue-100",
              content: latestBroadcastMessage ? (
                <>
                  <p className="text-sm font-bold line-clamp-2">{latestBroadcastMessage.message_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(latestBroadcastMessage.sent_at), 'MMM d, h:mm a')}
                  </p>
                </>
              ) : "No new messages"
            },
            {
              title: "Today's Homework",
              value: todaysHomework.length,
              icon: Book,
              color: "text-orange-600",
              bgColor: "bg-orange-100",
              label: "due today"
            },
            {
              title: "Overdue Homework",
              value: overdueHomeworksOnly.length,
              icon: AlertTriangle,
              color: "text-red-600",
              bgColor: "bg-red-100",
              label: "past due date"
            },
            {
              title: "Pending Fees",
              value: pendingFees > 0 ? `₹${pendingFees.toFixed(2)}` : '₹0.00',
              icon: DollarSign,
              color: "text-purple-600",
              bgColor: "bg-purple-100",
              label: "outstanding"
            },
            {
              title: "Today's Attendance",
              value: todaysAttendance ? todaysAttendance.status.toUpperCase() : 'N/A',
              icon: CalendarIcon,
              color: "text-green-600",
              bgColor: "bg-green-100",
              label: todaysAttendance?.time_in ? `In: ${formatTimeValue(todaysAttendance.time_in, todaysAttendance.date)}` : 'No record'
            },
            {
              title: "Today's Lessons",
              value: todaysLessonsStudied.length,
              icon: BookOpen,
              color: "text-blue-600",
              bgColor: "bg-blue-100",
              label: "chapters studied"
            },
            {
              title: "Missed Chapters",
              value: missedChaptersCount,
              icon: XCircle,
              color: "text-red-600",
              bgColor: "bg-red-100",
              label: "not yet covered"
            },
            {
              title: "Test Results",
              value: testStats.total,
              icon: ClipboardCheck,
              color: "text-indigo-600",
              bgColor: "bg-indigo-100",
              label: testStats.total > 0 ? `Avg: ${testStats.average}%` : 'no tests'
            },
          ].map((stat, idx) => (
            <Card key={idx} className="border-none shadow-soft hover:shadow-medium transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{stat.title}</CardTitle>
                <div className={cn("p-2 rounded-xl transition-transform group-hover:rotate-12", stat.bgColor)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                {stat.value !== undefined ? (
                  <>
                    <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
                  </>
                ) : (
                  <div className="mt-1">{stat.content}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upcoming Meetings Notification */}
        {upcomingMeetings.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Video className="h-5 w-5 text-blue-600" /> Upcoming Meetings
                <Badge variant="secondary">{upcomingMeetings.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingMeetings.map((att: any) => (
                  <div key={att.id} className={`p-3 rounded-lg border ${isToday(new Date(att.meetings?.meeting_date)) ? 'bg-blue-100 border-blue-300' : 'bg-background'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{att.meetings?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {att.meetings?.meeting_type?.charAt(0).toUpperCase() + att.meetings?.meeting_type?.slice(1)} Meeting
                          {att.meetings?.location && ` • ${att.meetings.location}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(new Date(att.meetings?.meeting_date), 'PPP')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(att.meetings?.meeting_date), 'p')}</p>
                        {isToday(new Date(att.meetings?.meeting_date)) && <Badge className="mt-1">Today</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarIcon className="h-5 w-5" /> Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event: any) => (
                  <div key={event.id} className={`p-3 rounded-lg border ${event.is_holiday ? 'bg-red-50 border-red-200' : 'bg-muted/50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(new Date(event.event_date), 'PPP')}</p>
                        {event.is_holiday && <span className="text-xs text-red-600 font-medium">Holiday</span>}
                        {isToday(new Date(event.event_date)) && <Badge className="ml-2">Today</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Toggle and Mini Calendar */}
        <div className="flex justify-between items-center gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" /> Attendance Calendar
          </h3>
          <Button size="sm" onClick={() => setShowMiniCalendar(prev => !prev)}>
            {showMiniCalendar ? 'Hide Calendar' : 'Show Calendar'}
          </Button>
        </div>
        {showMiniCalendar && (
          <MiniCalendar
            attendance={attendance}
            lessonRecords={lessonRecords}
            tests={testResults}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}

        {/* Date Range Filter for Chapter Performance */}
        {/* Date Range Filter - Global */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" /> Date Range Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-sm font-medium">From:</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={e => setDateRange({...dateRange, from: e.target.value})}
                className="w-[150px]"
              />
              <label className="text-sm font-medium">To:</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={e => setDateRange({...dateRange, to: e.target.value})}
                className="w-[150px]"
              />
              <p className="text-xs text-muted-foreground ml-2">This filter applies to attendance, chapter performance, homework, and test reports below</p>
            </div>
          </CardContent>
        </Card>

        {/* Chapter-wise Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Chapter-wise Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeStudentId ? (
              <ParentChapterPerformanceTable
                chapterPerformanceData={chapterPerformanceData}
                onViewDetails={handleViewChapterDetails}
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">Please select a student to view chapter performance.</p>
            )}
          </CardContent>
        </Card>

        {/* Test Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Test Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTestResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No test results found for the selected date range.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date Taken</TableHead>
                      <TableHead>Marks Obtained</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTestResults.map((tr: any) => {
                      const percentage = tr.tests?.total_marks 
                        ? Math.round((tr.marks_obtained / tr.tests.total_marks) * 100)
                        : 0;
                      const getGradeColor = (pct: number) => {
                        if (pct >= 90) return 'text-green-600 font-semibold';
                        if (pct >= 75) return 'text-blue-600 font-semibold';
                        if (pct >= 60) return 'text-yellow-600 font-semibold';
                        if (pct >= 50) return 'text-orange-600 font-semibold';
                        return 'text-red-600 font-semibold';
                      };
                      const getGrade = (pct: number) => {
                        if (pct >= 90) return 'A+';
                        if (pct >= 80) return 'A';
                        if (pct >= 75) return 'B+';
                        if (pct >= 70) return 'B';
                        if (pct >= 60) return 'C+';
                        if (pct >= 50) return 'C';
                        return 'F';
                      };
                      return (
                        <TableRow key={tr.id}>
                          <TableCell className="font-medium">{tr.tests?.name || 'N/A'}</TableCell>
                          <TableCell>{tr.tests?.subject || 'N/A'}</TableCell>
                          <TableCell>{safeFormatDate(tr.date_taken, 'PPP')}</TableCell>
                          <TableCell className="font-semibold">{tr.marks_obtained}</TableCell>
                          <TableCell>{tr.tests?.total_marks || 'N/A'}</TableCell>
                          <TableCell className={getGradeColor(percentage)}>{percentage}%</TableCell>
                          <TableCell className={getGradeColor(percentage)}>{getGrade(percentage)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {filteredTestResults.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Tests</p>
                    <p className="font-semibold">{testStats.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Average Score</p>
                    <p className="font-semibold">{testStats.average}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Highest Score</p>
                    <p className="font-semibold text-green-600">{testStats.highest}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lowest Score</p>
                    <p className="font-semibold text-red-600">{testStats.lowest}%</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Missed Chapters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Missed Chapters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missedChaptersCount === 0 ? (
              <p className="text-muted-foreground text-center py-4">No missed chapters. Great job!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Chapter</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Lesson Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allLessonPlans
                      .filter(lp => {
                        if (!student?.grade) return false;
                        const studentGrade = student.grade;
                        const completedLessonPlanIds = new Set(lessonRecords.map(sc => sc.lesson_plan_id));
                        return (
                          lp.grade === studentGrade &&
                          !completedLessonPlanIds.has(lp.id) &&
                          new Date(lp.lesson_date) <= today
                        );
                      })
                      .map((lp) => (
                        <TableRow key={lp.id}>
                          <TableCell className="font-medium">{lp.subject || 'N/A'}</TableCell>
                          <TableCell>{lp.chapter || 'N/A'}</TableCell>
                          <TableCell>{lp.topic || 'N/A'}</TableCell>
                          <TableCell>{safeFormatDate(lp.lesson_date, 'PPP')}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Homework */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" /> Overdue Homework
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueHomeworksOnly.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No overdue homework. Keep up the good work!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueHomeworksOnly.map((hs: any) => (
                      <TableRow key={hs.id}>
                        <TableCell className="font-medium">{hs.homework?.title || 'N/A'}</TableCell>
                        <TableCell>{hs.homework?.subject || 'N/A'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 ${
                            hs.status === 'completed' || hs.status === 'checked' 
                              ? 'text-green-600' 
                              : hs.status === 'in_progress' 
                              ? 'text-yellow-600' 
                              : 'text-red-600'
                          }`}>
                            {hs.status === 'completed' || hs.status === 'checked' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : hs.status === 'in_progress' ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            {hs.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          {hs.homework?.due_date ? safeFormatDate(hs.homework.due_date, 'PPP') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" /> Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No upcoming events.</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event: any) => (
                  <div key={event.id} className={`p-3 rounded-lg border ${event.is_holiday ? 'bg-red-50 border-red-200' : 'bg-muted/50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(new Date(event.event_date), 'PPP')}</p>
                        {event.is_holiday && <span className="text-xs text-red-600 font-medium">Holiday</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" /> Daily Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{safeFormatDate(a.date, "PPP")}</TableCell>
                      <TableCell className={a.status === 'present' ? 'text-green-600' : 'text-red-600'}>
                        {a.status}
                      </TableCell>

                      <TableCell>
                        {formatTimeValue(a.time_in, a.date)}
                      </TableCell>

                      <TableCell>
                        {formatTimeValue(a.time_out, a.date)}
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chapter Detail Modal */}
      <ParentChapterDetailModal
        open={showChapterDetailModal}
        onOpenChange={setShowChapterDetailModal}
        chapterGroup={selectedChapterGroup}
      />
    </div>
  );
};

const ParentDashboard = () => (
  <QueryClientProvider client={queryClient}>
    <ParentDashboardContent />
  </QueryClientProvider>
);

export default ParentDashboard;