import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, subMonths, addMonths, isValid } from 'date-fns';
import { CalendarIcon, CheckCircle2, XCircle, MinusCircle, Download, Printer, User, X, TrendingUp, Clock } from 'lucide-react';
import { cn, safeFormatDate } from '@/lib/utils'; // Import safeFormatDate
import { Tables, Database } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type Teacher = Tables<'teachers'>;
type TeacherAttendance = Tables<'teacher_attendance'>;

interface TeacherAttendanceSummary {
  id: string;
  name: string;
  present: number;
  absent: number;
  leave: number;
  totalDays: number;
  attendancePercentage: number;
}

interface TeacherDetailAttendance {
  id: string;
  date: string;
  status: string;
  time_in: string | null;
  time_out: string | null;
  notes: string | null;
}

export default function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, TeacherAttendance>>({});
  const [reportMonthFilter, setReportMonthFilter] = useState<string>(format(new Date(), "yyyy-MM"));
  const [showTeacherDetailDialog, setShowTeacherDetailDialog] = useState(false);
  const [selectedTeacherDetail, setSelectedTeacherDetail] = useState<Teacher | null>(null);
  const [detailMonthFilter, setDetailMonthFilter] = useState<Date>(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch active teachers for the center
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["active-teachers", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("teachers")
        .select("id, name")
        .eq("center_id", user.center_id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch existing attendance for the selected date
  const { data: existingAttendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["teacher-attendance", dateStr, user?.center_id],
    queryFn: async () => {
      if (!user?.center_id || teachers.length === 0) return [];
      const teacherIds = teachers.map(t => t.id);
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("*")
        .in("teacher_id", teacherIds)
        .eq("date", dateStr);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id && teachers.length > 0,
  });

  // Fetch all attendance for report
  const { data: allTeacherAttendance = [] } = useQuery({
    queryKey: ["all-teacher-attendance", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("*, teachers(name)")
        .eq("teachers.center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch all attendance for a specific teacher for the detail dialog
  const { data: teacherDetailAttendance = [], refetch: refetchTeacherDetailAttendance } = useQuery({
    queryKey: ["teacher-detail-attendance", selectedTeacherDetail?.id, detailMonthFilter],
    queryFn: async () => {
      if (!selectedTeacherDetail?.id) return [];
      const start = startOfMonth(detailMonthFilter);
      const end = endOfMonth(detailMonthFilter);
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("id, date, status, time_in, time_out, notes")
        .eq("teacher_id", selectedTeacherDetail.id)
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"))
        .order("date");
      if (error) throw error;
      return data as TeacherDetailAttendance[];
    },
    enabled: false, // We'll manually trigger this when needed
  });

  // Refetch teacher detail attendance when dialog opens or month changes
  useEffect(() => {
    if (showTeacherDetailDialog && selectedTeacherDetail?.id) {
      refetchTeacherDetailAttendance();
    }
  }, [showTeacherDetailDialog, selectedTeacherDetail?.id, detailMonthFilter, refetchTeacherDetailAttendance]);

  // Initialize attendance state when teachers or existing attendance changes
  useEffect(() => {
    const initialRecords: Record<string, TeacherAttendance> = {};
    teachers.forEach(teacher => {
      const record = existingAttendance.find(att => att.teacher_id === teacher.id);
      initialRecords[teacher.id] = record || {
        id: '', // Will be generated on insert
        teacher_id: teacher.id,
        center_id: user?.center_id || '',
        date: dateStr,
        status: 'absent', // Default to absent
        time_in: null,
        time_out: null,
        notes: null,
        created_at: new Date().toISOString(),
      };
    });
    setAttendanceRecords(initialRecords);
  }, [teachers, existingAttendance, dateStr]);

  const handleStatusChange = (teacherId: string, status: TeacherAttendance['status']) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        status,
        time_in: status === 'present' ? (prev[teacherId]?.time_in || format(new Date(), 'HH:mm')) : null,
        time_out: status === 'present' ? (prev[teacherId]?.time_out || null) : null,
      }
    }));
  };

  const handleTimeChange = (teacherId: string, field: 'time_in' | 'time_out', value: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        [field]: value || null,
      }
    }));
  };

  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");

      const recordsToInsert: Database['public']['Tables']['teacher_attendance']['Insert'][] = [];
      const recordsToUpdate: Tables<'teacher_attendance'>[] = [];

      for (const teacherId in attendanceRecords) {
        const record = attendanceRecords[teacherId];
        if (record.id) {
          // Existing record, update
          recordsToUpdate.push(record);
        } else {
          // New record, insert
          recordsToInsert.push({
            teacher_id: record.teacher_id,
            center_id: user.center_id!,
            date: record.date,
            status: record.status,
            time_in: record.time_in,
            time_out: record.time_out,
            notes: record.notes,
          });
        }
      }

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase.from("teacher_attendance").insert(recordsToInsert);
        if (insertError) throw insertError;
      }

      if (recordsToUpdate.length > 0) {
        // Perform updates one by one or in a batch if Supabase supports it easily
        for (const record of recordsToUpdate) {
          const { error: updateError } = await supabase.from("teacher_attendance").update({
            status: record.status,
            time_in: record.time_in,
            time_out: record.time_out,
            notes: record.notes,
          }).eq("id", record.id);
          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["all-teacher-attendance"] }); // Invalidate all attendance for report
      toast.success("Teacher attendance saved successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save attendance");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAttendanceMutation.mutate();
  };

  const markAllPresent = () => {
    const updatedRecords = { ...attendanceRecords };
    teachers.forEach(teacher => {
      updatedRecords[teacher.id] = {
        ...updatedRecords[teacher.id],
        status: 'present',
        time_in: updatedRecords[teacher.id]?.time_in || format(new Date(), 'HH:mm'),
        time_out: updatedRecords[teacher.id]?.time_out || null,
      };
    });
    setAttendanceRecords(updatedRecords);
  };

  const markAllAbsent = () => {
    const updatedRecords = { ...attendanceRecords };
    teachers.forEach(teacher => {
      updatedRecords[teacher.id] = {
        ...updatedRecords[teacher.id],
        status: 'absent',
        time_in: null,
        time_out: null,
      };
    });
    setAttendanceRecords(updatedRecords);
  };

  const formatTimeValue = (timeVal: string | null) => {
    if (!timeVal) return '-';

    // Attempt to create a Date object from the time string.
    // Prepend a dummy date to ensure it's parsed as a full datetime.
    const dummyDateString = `2000-01-01T${timeVal}`;
    const dateObj = new Date(dummyDateString);

    // Check if the resulting Date object is valid
    if (isNaN(dateObj.getTime())) {
      // If it's an invalid date, return the original value or a placeholder
      return timeVal; // Or '-' if you prefer to hide malformed data
    }

    // Format the valid date object
    return format(dateObj, 'HH:mm');
  };

  // Prepare data for the report section
  const reportData: TeacherAttendanceSummary[] = useMemo(() => {
    const start = startOfMonth(parseISO(reportMonthFilter + "-01"));
    const end = endOfMonth(parseISO(reportMonthFilter + "-01"));
    
    const filteredByMonth = allTeacherAttendance.filter((att: any) => {
      const attDate = parseISO(att.date);
      return isWithinInterval(attDate, { start, end });
    });

    const summaryMap = new Map<string, TeacherAttendanceSummary>();
    teachers.forEach(teacher => {
      summaryMap.set(teacher.id, {
        id: teacher.id,
        name: teacher.name,
        present: 0,
        absent: 0,
        leave: 0,
        totalDays: 0,
        attendancePercentage: 0,
      });
    });

    filteredByMonth.forEach((att: any) => {
      const teacherSummary = summaryMap.get(att.teacher_id);
      if (teacherSummary) {
        teacherSummary.totalDays += 1;
        if (att.status === 'present') teacherSummary.present += 1;
        else if (att.status === 'absent') teacherSummary.absent += 1;
        else if (att.status === 'leave') teacherSummary.leave += 1;
      }
    });

    summaryMap.forEach(summary => {
      summary.attendancePercentage = summary.totalDays > 0 ? Math.round((summary.present / summary.totalDays) * 100) : 0;
    });

    return Array.from(summaryMap.values());
  }, [allTeacherAttendance, teachers, reportMonthFilter]);

  const exportReportToCSV = () => {
    if (!reportData || reportData.length === 0) return;
    
    const headers = ["Teacher Name", "Present", "Absent", "On Leave", "Total Days", "Attendance %"];
    const rows = reportData.map((teacher) => [
      teacher.name,
      teacher.present,
      teacher.absent,
      teacher.leave,
      teacher.totalDays,
      `${teacher.attendancePercentage}%`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-attendance-report-${reportMonthFilter}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    const content = document.getElementById("teacher-attendance-report-printable");
    if (content) {
      const newWindow = window.open("", "_blank");
      newWindow?.document.write(`
        <html>
        <head>
          <title>Teacher Attendance Report - ${reportMonthFilter}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1, h2, h3 { margin: 0 0 10px 0; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
        </html>
      `);
      newWindow?.document.close();
      newWindow?.focus();
      newWindow?.print();
      newWindow?.close();
    }
  };

  const handleTeacherClick = (teacher: Teacher) => {
    setSelectedTeacherDetail(teacher);
    setDetailMonthFilter(new Date()); // Reset month filter for new teacher
    setShowTeacherDetailDialog(true);
  };

  // Calculate punctuality and average time in for teacher detail dialog
  const { punctualityPercentage, avgTimeIn, absentDays } = useMemo(() => {
    let punctualCount = 0;
    let totalPresentDays = 0;
    let totalMinutesIn = 0;
    let absentDaysList: string[] = [];

    teacherDetailAttendance.forEach(record => {
      if (record.status === 'present' && record.time_in) {
        totalPresentDays++;
        try {
          const [hours, minutes] = record.time_in.split(':').map(Number);
          const timeInDate = new Date();
          timeInDate.setHours(hours, minutes, 0, 0);
          
          // Assuming "on time" is before 9:15 AM for example
          const onTimeCutoff = new Date();
          onTimeCutoff.setHours(9, 15, 0, 0);
          
          if (timeInDate <= onTimeCutoff) {
            punctualCount++;
          }
          
          totalMinutesIn += (hours * 60) + minutes;
        } catch (e) {
          console.error("Error parsing time_in:", record.time_in, e);
        }
      } else if (record.status === 'absent') {
        absentDaysList.push(record.date);
      }
    });

    const punctuality = totalPresentDays > 0 ? Math.round((punctualCount / totalPresentDays) * 100) : 0;
    const averageMinutesIn = totalPresentDays > 0 ? totalMinutesIn / totalPresentDays : 0;
    const avgHours = Math.floor(averageMinutesIn / 60);
    const avgMins = Math.round(averageMinutesIn % 60);
    const formattedAvgTimeIn = totalPresentDays > 0 ? `${String(avgHours).padStart(2, '0')}:${String(avgMins).padStart(2, '0')}` : '-';

    return {
      punctualityPercentage: punctuality,
      avgTimeIn: formattedAvgTimeIn,
      absentDays: absentDaysList
    };
  }, [teacherDetailAttendance]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Teacher Attendance</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full md:w-[220px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? safeFormatDate(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={markAllPresent}>Mark All Present</Button>
            <Button variant="outline" size="sm" onClick={markAllAbsent}>Mark All Absent</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance for {safeFormatDate(selectedDate, "PPP")}</CardTitle>
        </CardHeader>
        <CardContent>
          {teachersLoading || attendanceLoading ? (
            <p>Loading teachers and attendance...</p>
          ) : teachers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No active teachers registered yet.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map(teacher => {
                      const record = attendanceRecords[teacher.id];
                      return (
                        <TableRow key={teacher.id}>
                          <TableCell className="font-medium">{teacher.name}</TableCell>
                          <TableCell>
                            <Select
                              value={record?.status || 'absent'}
                              onValueChange={(value: TeacherAttendance['status']) => handleStatusChange(teacher.id, value)}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="leave">Leave</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={record?.time_in || ''}
                              onChange={(e) => handleTimeChange(teacher.id, 'time_in', e.target.value)}
                              disabled={record?.status !== 'present'}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={record?.time_out || ''}
                              onChange={(e) => handleTimeChange(teacher.id, 'time_out', e.target.value)}
                              disabled={record?.status !== 'present'}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={record?.notes || ''}
                              onChange={(e) => setAttendanceRecords(prev => ({
                                ...prev,
                                [teacher.id]: {
                                  ...prev[teacher.id],
                                  notes: e.target.value || null
                                }
                              }))}
                              placeholder="Notes (optional)"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Button type="submit" className="w-full" disabled={saveAttendanceMutation.isPending}>
                {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Attendance Report Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Attendance Report</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportReportToCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="report-month-filter">Select Month for Report</Label>
            <Input
              id="report-month-filter"
              type="month"
              value={reportMonthFilter}
              onChange={(e) => setReportMonthFilter(e.target.value)}
              className="w-[180px]"
            />
          </div>
          {teachersLoading || allTeacherAttendance.length === 0 ? (
            <p>Loading report data...</p>
          ) : reportData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No attendance data for this month.</p>
          ) : (
            <div id="teacher-attendance-report-printable" className="overflow-x-auto max-h-96 border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher Name</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">On Leave</TableHead>
                    <TableHead className="text-center">Total Days</TableHead>
                    <TableHead className="text-center">Attendance %</TableHead>
                    <TableHead className="text-center">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map(summary => (
                    <TableRow key={summary.id}>
                      <TableCell className="font-medium">{summary.name}</TableCell>
                      <TableCell className="text-center text-green-600">{summary.present}</TableCell>
                      <TableCell className="text-center text-red-600">{summary.absent}</TableCell>
                      <TableCell className="text-center text-orange-600">{summary.leave}</TableCell>
                      <TableCell className="text-center">{summary.totalDays}</TableCell>
                      <TableCell className="text-center font-semibold">{summary.attendancePercentage}%</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleTeacherClick({ id: summary.id, name: summary.name } as Teacher)}>
                          <User className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teacher Detail Dialog */}
      <Dialog open={showTeacherDetailDialog} onOpenChange={(open) => {
        setShowTeacherDetailDialog(open);
        if (!open) {
          setSelectedTeacherDetail(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedTeacherDetail?.name}
                </DialogTitle>
                <DialogDescription>
                  Detailed attendance report for {selectedTeacherDetail?.name}.
                </DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTeacherDetailDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Month Filter for Details */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailMonthFilter(subMonths(detailMonthFilter, 1))}
              >
                Previous Month
              </Button>
              <Input
                type="month"
                value={format(detailMonthFilter, "yyyy-MM")}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setDetailMonthFilter(new Date(parseInt(year), parseInt(month) - 1));
                }}
                className="w-[150px]"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailMonthFilter(addMonths(detailMonthFilter, 1))}
              >
                Next Month
              </Button>
            </div>

            {/* Punctuality & Avg Time In */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Punctuality %</p>
                    <p className="text-xl font-bold">{punctualityPercentage}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Time In</p>
                    <p className="text-xl font-bold">{avgTimeIn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Absent Days</p>
                    <p className="text-xl font-bold">{absentDays.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Absent Days List */}
            {absentDays.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {absentDays.map((date, index) => (
                      <Badge key={index} variant="destructive">
                        {safeFormatDate(date, "MMM d")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Date-wise Attendance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance for {format(detailMonthFilter, "MMMM yyyy")}</CardTitle>
              </CardHeader>
              <CardContent>
                {teacherDetailAttendance.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No attendance records for this month.</p>
                ) : (
                  <div className="overflow-x-auto max-h-64 border rounded">
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
                        {teacherDetailAttendance.map(record => (
                          <TableRow key={record.id}>
                            <TableCell>{safeFormatDate(record.date, "PPP")}</TableCell>
                            <TableCell>
                              <Badge
                                variant={record.status === "present" ? "default" : record.status === "absent" ? "destructive" : "secondary"}
                                className={record.status === "present" ? "bg-secondary hover:bg-secondary/80" : ""}
                              >
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.time_in || "-"}</TableCell>
                            <TableCell>{record.time_out || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}