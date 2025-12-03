import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format, parseISO, isWithinInterval, differenceInMinutes, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { CalendarIcon, Download, Printer, User, Clock, TrendingUp, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentAttendanceRecord {
  id: string;
  student_id: string;
  status: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  students: {
    name: string;
    grade: string;
  };
}

interface StudentDetail {
  id: string;
  name: string;
  grade: string;
}

interface StudentDetailAttendance {
  id: string;
  date: string;
  status: string;
  time_in: string | null;
  time_out: string | null;
}

export default function ViewRecords() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const [showStudentDetailDialog, setShowStudentDetailDialog] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);
  const [detailMonthFilter, setDetailMonthFilter] = useState<Date>(new Date());

  // Fetch students for this center
  const { data: students = [] } = useQuery({
    queryKey: ['students', user?.center_id],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, name, grade')
        .eq('center_id', user?.center_id!)
        .order('name');
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const filteredStudents = students.filter(s => gradeFilter === "all" || s.grade === gradeFilter);

  // Fetch attendance records for selected date & filtered students
  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance-records", dateStr, gradeFilter, user?.center_id],
    queryFn: async () => {
      const studentIds = filteredStudents.map(s => s.id);
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          id,
          student_id,
          status,
          date,
          time_in,
          time_out,
          students (
            name,
            grade
          )
        `)
        .in("student_id", studentIds)
        .eq("date", dateStr)
        .order("students(name)");
      if (error) throw error;
      return data as StudentAttendanceRecord[];
    },
    enabled: filteredStudents.length > 0,
  });

  // Fetch all attendance for a specific student for the detail dialog
  const { data: studentDetailAttendance = [], refetch: refetchStudentDetailAttendance } = useQuery({
    queryKey: ["student-detail-attendance", selectedStudentDetail?.id, detailMonthFilter],
    queryFn: async () => {
      if (!selectedStudentDetail?.id) return [];
      const start = startOfMonth(detailMonthFilter);
      const end = endOfMonth(detailMonthFilter);
      const { data, error } = await supabase
        .from("attendance")
        .select("id, date, status, time_in, time_out")
        .eq("student_id", selectedStudentDetail.id)
        .gte("date", format(start, "yyyy-MM-dd")) // Corrected format string
        .lte("date", format(end, "yyyy-MM-dd"))
        .order("date");
      if (error) throw error;
      return data as StudentDetailAttendance[];
    },
    enabled: false, // We'll manually trigger this when needed
  });

  // Refetch student detail attendance when dialog opens or month changes
  useEffect(() => {
    if (showStudentDetailDialog && selectedStudentDetail?.id) {
      refetchStudentDetailAttendance();
    }
  }, [showStudentDetailDialog, selectedStudentDetail?.id, detailMonthFilter, refetchStudentDetailAttendance]);

  const presentCount = records?.filter(r => r.status === "present").length || 0;
  const absentCount = records?.filter(r => r.status === "absent").length || 0;

  const exportToCSV = () => {
    if (!records || records.length === 0) return;
    const headers = ["Name", "Grade", "Status", "Date", "Time In", "Time Out"];
    const rows = records.map(r => [
      r.students.name,
      r.students.grade,
      r.status,
      format(new Date(r.date), "yyyy-MM-dd"),
      r.time_in || "-",
      r.time_out || "-",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${dateStr}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStudentClick = (studentId: string, studentName: string, studentGrade: string) => {
    setSelectedStudentDetail({ id: studentId, name: studentName, grade: studentGrade });
    setDetailMonthFilter(new Date()); // Reset month filter for new student
    setShowStudentDetailDialog(true);
  };

  // Calculate punctuality and average time in for student detail dialog
  const { punctualityPercentage, avgTimeIn, absentDays } = useMemo(() => {
    let punctualCount = 0;
    let totalPresentDays = 0;
    let totalMinutesIn = 0;
    let absentDaysList: string[] = [];

    studentDetailAttendance.forEach(record => {
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
  }, [studentDetailAttendance]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Records</h2>
          <p className="text-muted-foreground">
            View daily attendance records. For monthly summaries, please visit the{" "}
            <a href="/attendance-summary" className="text-primary hover:underline">Attendance Summary</a> page.
          </p>
        </div>
      </div>

      {/* Filters Row */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          {/* Grade Filter */}
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {Array.from(new Set(students.map(s => s.grade))).map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Picker */}
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
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => date && setSelectedDate(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Export / Print */}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance for {format(selectedDate, "MMMM d, yyyy")}</CardTitle>
              <CardDescription>
                {presentCount} Present • {absentCount} Absent
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading records...</p>
          ) : records && records.length > 0 ? (
            <div className="overflow-x-auto max-h-96 border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.students.name}</TableCell>
                      <TableCell>{r.students.grade}</TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === "present" ? "default" : "destructive"}
                          className={r.status === "present" ? "bg-secondary hover:bg-secondary/80" : ""}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.time_in || "-"}</TableCell>
                      <TableCell>{r.time_out || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleStudentClick(r.student_id, r.students.name, r.students.grade)}>
                          <User className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No attendance records found for this date
            </p>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={showStudentDetailDialog} onOpenChange={(open) => {
        setShowStudentDetailDialog(open);
        if (!open) {
          setSelectedStudentDetail(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedStudentDetail?.name} - Grade {selectedStudentDetail?.grade}
                </DialogTitle>
                <DialogDescription>
                  Detailed attendance report for {selectedStudentDetail?.name}.
                </DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowStudentDetailDialog(false)}>
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
                  <TrendingUp className="h-5 w-5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Punctuality %</p>
                    <p className="text-xl font-bold">{punctualityPercentage}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Time In</p>
                    <p className="text-xl font-bold">{avgTimeIn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-5 w-5" />
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
                        {format(new Date(date), "MMM d")}
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
                {studentDetailAttendance.length === 0 ? (
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
                        {studentDetailAttendance.map(record => (
                          <TableRow key={record.id}>
                            <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                            <TableCell>
                              <Badge
                                variant={record.status === "present" ? "default" : "destructive"}
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