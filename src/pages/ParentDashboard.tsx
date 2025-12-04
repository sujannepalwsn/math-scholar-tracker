import { useState, useMemo } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar as CalendarIcon, BookOpen, FileText, LogOut, DollarSign, Book, Paintbrush, AlertTriangle, CheckCircle, XCircle, Clock, Star, MessageSquare, Radio } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isPast, isToday } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { safeFormatDate } from '@/lib/utils';

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
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 p-2 bg-white border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 text-xs">
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
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: '', to: ''});

  // NEW: State for the currently selected child
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(user?.linked_students?.[0]?.id);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  if (!user || user.role !== 'parent' || !user.linked_students) {
    navigate('/login-parent');
    return null;
  }

  if (user.linked_students.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader><CardTitle>No Children Linked</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              It looks like no students are linked to your parent account.
              Please contact your center administrator to link your child(ren).
            </p>
            <Button onClick={handleLogout}>Logout</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // The currently selected student object
  const currentStudent = user.linked_students.find(s => s.id === selectedChildId);

  // Fetch student details for the selected child
  const { data: student } = useQuery({
    queryKey: ['student', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return null;
      const { data, error } = await supabase.from('students').select('*').eq('id', selectedChildId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChildId, // Only enable if a child is selected
  });

  // Fetch latest broadcast message for this parent's conversation
  // This query remains dependent on user.id, as broadcasts are for the parent user.
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

  // Attendance for the selected child
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const { data, error } = await supabase.from('attendance').select('*').eq('student_id', selectedChildId).order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChildId,
  });

  // Tests (for MiniCalendar tooltip) for the selected child
  const { data: testResults = [] } = useQuery({
    queryKey: ['test-results-mini-calendar', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const { data, error } = await supabase.from('test_results').select('*, tests(*)').eq('student_id', selectedChildId).order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChildId,
  });

  // Lesson Records (student_chapters now links to lesson_plans) for the selected child
  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['student-lesson-records-mini-calendar', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      let query = supabase.from('student_chapters').select(`
        *,
        lesson_plans(id, subject, chapter, topic, lesson_date)
      `).eq('student_id', selectedChildId).order('completed_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChildId,
  });

  // Homework Records for the selected child
  const { data: homeworkStatus = [] } = useQuery({
    queryKey: ['student-homework-records', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const { data, error } = await supabase.from('student_homework_records').select('*, homework(*)').eq('student_id', selectedChildId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChildId,
  });

  // Discipline Issues for the selected child
  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ['student-discipline-issues', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const { data, error } = await supabase.from('discipline_issues').select('*').eq('student_id', selectedChildId).order('issue_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedChildId,
  });

  // Fetch Invoices for Pending Fees for the selected child
  const { data: invoices = [] } = useQuery({
    queryKey: ['student-invoices-dashboard', selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return [];
      const { data, error } = await supabase.from('invoices').select('*').eq('student_id', selectedChildId);
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!selectedChildId,
  });

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

  const handleLogout = () => {
    logout();
    navigate('/login-parent');
  };

  // --------------------------
  // Helper: robust time formatter
  // --------------------------
  const formatTimeValue = (timeVal: string | null, dateVal: string | null) => {
    if (!timeVal) return '-';

    // Try parsing directly as a Date object (e.g., if it's an ISO string)
    let d = new Date(timeVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

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
      d = new Date(`${datePart}T${timeVal}`);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // If all parsing fails, return placeholder
    return '-';
  };

  // --- New Dashboard Card Data Calculations ---

  // Today's Homework
  const todaysHomework = homeworkStatus.filter((hs: any) => 
    hs.homework?.due_date && isToday(new Date(hs.homework.due_date)) && 
    !['completed', 'checked'].includes(hs.status)
  );

  // Missed or Due Homeworks (excluding today's)
  const missedOrDueHomeworks = homeworkStatus.filter((hs: any) => {
    if (!hs.homework?.due_date) return false;
    const dueDate = new Date(hs.homework.due_date);
    const isNotCompleted = !['completed', 'checked'].includes(hs.status);
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isUpcoming = !isPast(dueDate) && !isToday(dueDate);
    return isNotCompleted && (isOverdue || isUpcoming);
  });

  // Pending Fees
  const pendingFees = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
  }, [invoices]);

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Parent Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {user.username}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>

        {/* Student Selector */}
        {user.linked_students.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Child</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedChildId}
                onValueChange={(value) => setSelectedChildId(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {user.linked_students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} (Grade {s.grade})
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
              <p className="text-muted-foreground">Select a child to view their information.</p>
            )}
          </CardContent>
        </Card>

        {/* NEW SUMMARY CARDS */}
        {selectedChildId && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Latest Broadcast Message */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Latest Broadcast</CardTitle>
                <Radio className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                {latestBroadcastMessage ? (
                  <>
                    <p className="text-sm font-bold line-clamp-2">{latestBroadcastMessage.message_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(latestBroadcastMessage.sent_at), 'MMM d, h:mm a')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No new messages</p>
                )}
              </CardContent>
            </Card>

            {/* Today's Homework */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Homework</CardTitle>
                <Book className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaysHomework.length}</div>
                <p className="text-xs text-muted-foreground">due today</p>
              </CardContent>
            </Card>

            {/* Missed or Due Homeworks */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Homework</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{missedOrDueHomeworks.length}</div>
                <p className="text-xs text-muted-foreground">missed or upcoming</p>
              </CardContent>
            </Card>

            {/* Pending Fees */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingFees > 0 ? `₹${pendingFees.toFixed(2)}` : '₹0.00'}</div>
                <p className="text-xs text-muted-foreground">outstanding</p>
              </CardContent>
            </Card>

            {/* Today's Attendance */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
                <CalendarIcon className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${todaysAttendance?.status === 'present' ? 'text-green-600' : 'text-red-600'}`}>
                  {todaysAttendance ? todaysAttendance.status.toUpperCase() : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {todaysAttendance?.time_in ? `In: ${formatTimeValue(todaysAttendance.time_in, todaysAttendance.date)}` : ''}
                  {todaysAttendance?.time_out ? ` Out: ${formatTimeValue(todaysAttendance.time_out, todaysAttendance.date)}` : ''}
                </p>
              </CardContent>
            </Card>

            {/* Today's Lessons Studied */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Lessons</CardTitle>
                <BookOpen className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaysLessonsStudied.length}</div>
                <p className="text-xs text-muted-foreground">chapters studied</p>
              </CardContent>
            </Card>

            {/* Today's Discipline Issues */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Discipline</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todaysDisciplineIssues.length}</div>
                <p className="text-xs text-muted-foreground">issues reported</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Attendance Toggle and Mini Calendar */}
        {selectedChildId && (
          <>
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
          </>
        )}

        {/* Date Range Filter */}
        {selectedChildId && (
          <div className="flex items-center gap-2">
            <label>From:</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="border p-1 rounded"/>
            <label>To:</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="border p-1 rounded"/>
          </div>
        )}

        {/* ATTENDANCE SUMMARY */}
        {selectedChildId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" /> Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{totalDays}</p>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{presentDays}</p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{absentDays}</p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{attendancePercentage}%</p>
                  <p className="text-sm text-muted-foreground">Attendance</p>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 transition-all duration-300" style={{ width: `${attendancePercentage}%` }} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* DAILY ATTENDANCE TABLE */}
        {selectedChildId && (
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
        )}
      </div>
    </div>
  );
};

const ParentDashboard = () => (
  <QueryClientProvider client={queryClient}>
    <ParentDashboardContent />
  </QueryClientProvider>
);

export default ParentDashboard;