import { useState, useMemo } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar as CalendarIcon, BookOpen, FileText, LogOut, DollarSign, Book, Paintbrush, AlertTriangle, CheckCircle, XCircle, Clock, Star } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isPast } from 'date-fns';
import { Tables } from '@/integrations/supabase/types';
import { safeFormatDate } from '@/lib/utils'; // Import safeFormatDate

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
  // Removed subjectFilter from here, it will be on dedicated pages

  if (!user || user.role !== 'parent' || !user.student_id) {
    navigate('/login-parent');
    return null;
  }

  // Fetch student details
  const { data: student } = useQuery({
    queryKey: ['student', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').eq('id', user.student_id).single();
      if (error) throw error;
      return data;
    },
  });

  // Attendance
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('*').eq('student_id', user.student_id).order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Tests (for MiniCalendar tooltip)
  const { data: testResults = [] } = useQuery({
    queryKey: ['test-results-mini-calendar', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('test_results').select('*, tests(*)').eq('student_id', user.student_id).order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Lesson Records (for MiniCalendar tooltip)
  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['student-lesson-records-mini-calendar', user.student_id],
    queryFn: async () => {
      let query = supabase.from('student_chapters').select(`
        *,
        lesson_plans(id, subject, chapter, topic, lesson_date)
      `).eq('student_id', user.student_id).order('completed_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
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

        {/* Removed Finance Card - now in sidebar */}
        {/* Removed Homework Card - now in sidebar */}
        {/* Removed Activities Card - now in sidebar */}
        {/* Removed Discipline Card - now in sidebar */}

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

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <label>From:</label>
          <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="border p-1 rounded"/>
          <label>To:</label>
          <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="border p-1 rounded"/>
        </div>

        {/* ATTENDANCE SUMMARY */}
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

        {/* DAILY ATTENDANCE TABLE */}
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

        {/* Removed Chapter Rating Report - now in sidebar */}
        {/* Removed Test Results - now in sidebar */}
        {/* Removed Lesson Records - now in sidebar */}

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