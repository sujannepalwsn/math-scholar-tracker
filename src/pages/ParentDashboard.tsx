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
  const [subjectFilter, setSubjectFilter] = useState<string>("all"); // New subject filter for parent dashboard

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

  // Tests
  const { data: testResults = [] } = useQuery({
    queryKey: ['test-results', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('test_results').select('*, tests(*)').eq('student_id', user.student_id).order('date_taken', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Lesson Records (student_chapters now links to lesson_plans)
  const { data: lessonRecords = [] } = useQuery({
    queryKey: ['student-lesson-records', user.student_id, subjectFilter], // Add subjectFilter
    queryFn: async () => {
      let query = supabase.from('student_chapters').select(`
        *,
        lesson_plans(id, subject, chapter, topic, lesson_date, file_url, media_url),
        recorded_by_teacher:recorded_by_teacher_id(name)
      `).eq('student_id', user.student_id).order('completed_at', { ascending: false });
      
      if (subjectFilter !== "all") {
        query = query.eq('lesson_plans.subject', subjectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Homework Records
  const { data: homeworkStatus = [] } = useQuery({
    queryKey: ['student-homework-records', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('student_homework_records').select('*, homework(*)').eq('student_id', user.student_id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Student Activities
  const { data: studentActivities = [] } = useQuery({
    queryKey: ['student-activities', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('student_activities').select('*, activities(*)').eq('student_id', user.student_id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Discipline Issues
  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ['student-discipline-issues', user.student_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('discipline_issues').select('*').eq('student_id', user.student_id).order('issue_date', { ascending: false });
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

  const getHomeworkStatusIcon = (status: StudentHomeworkRecord['status']) => {
    switch (status) {
      case 'completed':
      case 'checked':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'assigned':
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getSeverityColor = (severity: DisciplineIssue['severity']) => {
    switch (severity) {
      case "low": return "text-green-600";
      case "medium": return "text-orange-600";
      case "high": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getRatingStars = (rating: number | null) => {
    if (rating === null) return "N/A";
    return Array(rating).fill("⭐").join("");
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const upcomingHomework = homeworkStatus.filter((hs: any) => hs.status !== 'completed' && hs.status !== 'checked' && !isPast(new Date(hs.homework?.due_date)));
  const completedHomework = homeworkStatus.filter((hs: any) => hs.status === 'completed' || hs.status === 'checked');
  const todaysHomework = homeworkStatus.filter((hs: any) => safeFormatDate(hs.homework?.due_date, "yyyy-MM-dd") === today && hs.status !== 'completed' && hs.status !== 'checked');

  // Chapter Rating Calculations for Parent Dashboard
  const chapterRatingsBySubject = useMemo(() => {
    const subjectMap = new Map<string, { totalRating: number; count: number; chapters: (StudentChapter & { lesson_plans: LessonPlan; recorded_by_teacher?: Tables<'teachers'> })[] }>();

    lessonRecords.forEach((record: any) => {
      if (record.lesson_plans?.subject && record.evaluation_rating !== null) {
        const subject = record.lesson_plans.subject;
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, { totalRating: 0, count: 0, chapters: [] });
        }
        const entry = subjectMap.get(subject)!;
        entry.totalRating += record.evaluation_rating;
        entry.count += 1;
        entry.chapters.push(record);
      }
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      averageRating: data.count > 0 ? (data.totalRating / data.count).toFixed(1) : 'N/A',
      chapters: data.chapters.sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()),
    }));
  }, [lessonRecords]);

  const allSubjects = Array.from(new Set(lessonRecords.map((lr: any) => lr.lesson_plans?.subject).filter(Boolean)));

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

        {/* Finance Card */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/parent-finance')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Finance & Invoices
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">View Finances</div>
            <p className="text-xs text-muted-foreground">
              Check invoices and payment history
            </p>
          </CardContent>
        </Card>

        {/* Homework Card */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/parent-homework')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Homework
            </CardTitle>
            <Book className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">View Homework</div>
            <p className="text-xs text-muted-foreground">
              Today's, upcoming, and completed assignments
            </p>
          </CardContent>
        </Card>

        {/* Activities Card */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/parent-activities')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Preschool Activities
            </CardTitle>
            <Paintbrush className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Activity Gallery</div>
            <p className="text-xs text-muted-foreground">
              Photos, videos, and descriptions of activities
            </p>
          </CardContent>
        </Card>

        {/* Discipline Card */}
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/parent-discipline')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Discipline Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">View Alerts</div>
            <p className="text-xs text-muted-foreground">
              Track any discipline issues and actions taken
            </p>
          </CardContent>
        </Card>

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

        {/* Chapter Rating Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" /> Chapter Rating Report
              </CardTitle>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {allSubjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {chapterRatingsBySubject.length === 0 ? (
              <p className="text-muted-foreground">No chapter ratings available for your child.</p>
            ) : (
              <div className="space-y-6">
                {/* Accumulated Subject-wise Rating */}
                <h3 className="font-semibold text-lg mb-2">Subject-wise Average Ratings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {chapterRatingsBySubject.map((subjectData) => (
                    <Card key={subjectData.subject} className="p-4">
                      <h4 className="font-medium text-md">{subjectData.subject}</h4>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        {subjectData.averageRating} <span className="text-yellow-500">⭐</span>
                      </p>
                      <p className="text-sm text-muted-foreground">{subjectData.chapters.length} chapters rated</p>
                    </Card>
                  ))}
                </div>

                {/* Individual Chapter Ratings */}
                <h3 className="font-semibold text-lg mb-2">Individual Chapter Ratings</h3>
                <div className="overflow-x-auto max-h-96 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">Subject</th>
                        <th className="border px-2 py-1">Chapter</th>
                        <th className="border px-2 py-1">Topic</th>
                        <th className="border px-2 py-1">Date Completed</th>
                        <th className="border px-2 py-1">Rating</th>
                        <th className="border px-2 py-1">Teacher Notes</th>
                        <th className="border px-2 py-1">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapterRatingsBySubject.flatMap(subjectData =>
                        subjectData.chapters.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell className="border px-2 py-1">{record.lesson_plans?.subject || '-'} </TableCell>
                            <TableCell className="border px-2 py-1">{record.lesson_plans?.chapter || '-'}</TableCell>
                            <TableCell className="border px-2 py-1">{record.lesson_plans?.topic || '-'}</TableCell>
                            <TableCell className="border px-2 py-1">{safeFormatDate(record.completed_at, "PPP")}</TableCell>
                            <TableCell className="border px-2 py-1 flex items-center gap-1">
                              {getRatingStars(record.evaluation_rating)}
                            </TableCell>
                            <TableCell className="border px-2 py-1">{record.teacher_notes || '-'}</TableCell>
                            <TableCell className="border px-2 py-1 flex items-center gap-1">
                              {record.recorded_by_teacher?.name || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TEST RESULTS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No test results available</p>
            ) : (
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.map(result => {
                      const percentage = result.tests?.total_marks
                        ? Math.round((result.marks_obtained / result.tests.total_marks) * 100)
                        : 0;
                      return (
                        <TableRow key={result.id}>
                          <TableCell>{result.tests?.name || '-'}</TableCell>
                          <TableCell>{result.tests?.subject || '-'}</TableCell>
                          <TableCell>{safeFormatDate(result.date_taken, "PPP")}</TableCell>
                          <TableCell>{result.marks_obtained}/{result.tests?.total_marks || 0}</TableCell>
                          <TableCell className={
                            percentage >= 75 ? 'text-green-600 font-semibold' :
                            percentage >= 50 ? 'text-yellow-600 font-semibold' :
                            'text-red-600 font-semibold'
                          }>{percentage}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LESSON RECORDS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Lessons Studied
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessonRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No lessons recorded</p>
            ) : (
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Chapter</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Date Taught</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessonRecords.map((lr: any) => (
                      <TableRow key={lr.id}>
                        <TableCell>{lr.lesson_plans?.subject || '-'}</TableCell>
                        <TableCell>{lr.lesson_plans?.chapter || '-'}</TableCell>
                        <TableCell>{lr.lesson_plans?.topic || '-'}</TableCell>
                        <TableCell>{safeFormatDate(lr.completed_at, "PPP")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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