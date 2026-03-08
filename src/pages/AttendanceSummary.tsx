import React, { useState } from "react";
import { Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns"

interface AttendanceStats {
  studentId: string;
  studentName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercentage: number;
}

export default function AttendanceSummary() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('all');

  const { data: students = [] } = useQuery({
    queryKey: ['students', user?.center_id],
    queryFn: async () => {
      let query = supabase.from('students').select('id, name, grade').order('name');
      if (user?.role !== 'admin' && user?.center_id) {
        query = query.eq('center_id', user.center_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } });

  const classes = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

  const { data: attendanceData = [] } = useQuery({
    queryKey: ['attendance-summary', selectedMonth.toISOString().slice(0, 7), user?.center_id, user?.id],
    queryFn: async () => {
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      const studentIds = students.map(s => s.id);
      if (studentIds.length === 0) return [];

      let query = supabase
        .from('attendance')
        .select('*, students(name, grade)')
        .in('student_id', studentIds)
        .gte('date', startDate)
        .lte('date', endDate);

      if (user?.role === 'teacher') {
        query = query.eq('marked_by', user.id);
      }

      const { data, error } = await query.order('date');

      if (error) throw error;
      return data;
    },
    enabled: students.length > 0 });

  const filteredStudents = students.filter(s => selectedClass === 'all' || s.grade === selectedClass);

  const calculateStats = (): AttendanceStats[] => {
    const statsMap = new Map<string, AttendanceStats>();

    // Start with students filtered by class and optionally by a specific student
    const studentsToProcess = filteredStudents.filter(s =>
      selectedStudent === 'all' || s.id === selectedStudent
    );

    studentsToProcess.forEach(student => {
      const studentAttendanceRecords = attendanceData.filter(
        (record: any) => record.student_id === student.id
      );

      let totalDays = 0;
      let presentDays = 0;
      let absentDays = 0;

      studentAttendanceRecords.forEach((record: any) => {
        totalDays += 1;
        if (record.status === 'present') {
          presentDays += 1;
        } else {
          absentDays += 1;
        }
      });

      const attendancePercentage = totalDays > 0
        ? Math.round((presentDays / totalDays) * 100)
        : 0;

      statsMap.set(student.id, {
        studentId: student.id,
        studentName: student.name, // Use student.name directly from the filtered students
        totalDays,
        presentDays,
        absentDays,
        attendancePercentage });
    });

    return Array.from(statsMap.values());
  };

  const stats = calculateStats();

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth) });

  const getAttendanceStatus = (date: string, studentId: string) => {
    const record = attendanceData.find((a: any) => format(new Date(a.date), 'yyyy-MM-dd') === date && a.student_id === studentId);
    if (!record) return 'none';
    return record.status === 'present' ? 'present' : 'absent';
  };

  const colors = { present: '#22c55e', absent: '#ef4444', none: '#e5e7eb' };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Attendance Analytics
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Statistical breakdown of student participation.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
            {format(selectedMonth, 'MMMM yyyy')}
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium p-8 overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Month</Label>
              <input
                type="month"
                value={format(selectedMonth, 'yyyy-MM')}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1));
                }}
                className="flex h-11 w-full rounded-xl border border-border/20 bg-card/50 backdrop-blur-sm px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 shadow-sm hover:border-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Class / Grade</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                  <SelectItem value="all">All Students</SelectItem>
                  {filteredStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {selectedStudent !== 'all' && (
        <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
          <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              Monthly Calendar — {format(selectedMonth, 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">{day}</div>
              ))}
              {daysInMonth.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const status = getAttendanceStatus(dateStr, selectedStudent);
                return (
                  <div
                    key={dateStr}
                    className="aspect-square rounded-lg flex items-center justify-center text-sm font-medium"
                    style={{
                      backgroundColor: status === 'present' ? colors.present : status === 'absent' ? colors.absent : colors.none,
                      color: status !== 'none' ? 'white' : 'inherit' }}
                  >
                    {format(date, 'd')}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.length > 0 && (
        <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
          <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Attendance Metrics Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((stat) => (
                <div
                  key={stat.studentId}
                  className="rounded-3xl border border-border/40 bg-card/50 p-6 shadow-medium group relative hover:shadow-strong transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                      <h3 className="font-black text-xl leading-tight text-foreground/90 group-hover:text-primary transition-colors">{stat.studentName}</h3>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Statistical Insight</p>
                    </div>
                    <div className="text-right bg-white p-2.5 rounded-2xl shadow-soft min-w-[90px] border border-primary/5">
                      <p className="text-2xl font-black text-primary leading-none">{stat.attendancePercentage}%</p>
                      <p className="text-[9px] uppercase font-black text-muted-foreground tracking-tighter mt-1 opacity-70">Rate</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                        <span>Presence Log</span>
                        <span className="text-primary">{stat.presentDays} / {stat.totalDays} Days</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted/40 rounded-full overflow-hidden shadow-inner border border-border/40">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-1000 ease-out rounded-full shadow-soft"
                          style={{ width: `${stat.attendancePercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none rounded-lg px-2 py-0.5 text-[9px] font-bold">
                        {stat.presentDays} Present
                      </Badge>
                      <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-none rounded-lg px-2 py-0.5 text-[9px] font-bold">
                        {stat.absentDays} Absent
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
