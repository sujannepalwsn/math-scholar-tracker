import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarIcon, CheckCircle2, Clock, Download, Eye,
  MinusCircle, Printer, TrendingUp, User, X, XCircle,
  MapPin, Locate, Loader2, ShieldCheck, AlertCircle
} from "lucide-react";
import { cn, safeFormatDate } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { addMonths, endOfMonth, format, isValid, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { Database, Tables } from "@/integrations/supabase/types"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/dashboard/KPICard"

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

  const isTeacher = user?.role === 'teacher';
  const isCenter = user?.role === 'center';

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, TeacherAttendance>>({});
  const [reportMonthFilter, setReportMonthFilter] = useState<string>(format(new Date(), "yyyy-MM"));
  const [showTeacherDetailDialog, setShowTeacherDetailDialog] = useState(false);
  const [selectedTeacherDetail, setSelectedTeacherDetail] = useState<Teacher | null>(null);
  const [detailMonthFilter, setDetailMonthFilter] = useState<Date>(new Date());
  const [isVerifying, setIsVerifying] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Fetch active teachers for the center
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["active-teachers", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

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
    enabled: !!user?.center_id && teachers.length > 0 });

  const { data: center } = useQuery({
    queryKey: ["center-location", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return null;
      const { data, error } = await supabase
        .from("centers")
        .select("latitude, longitude, radius_meters")
        .eq("id", user.center_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["teacher-approved-leaves", dateStr, user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_applications")
        .select("teacher_id, leave_categories(name)")
        .eq("center_id", user?.center_id!)
        .eq("status", "approved")
        .lte("start_date", dateStr)
        .gte("end_date", dateStr);
      if (error) throw error;
      return data;
    },
    enabled: !!dateStr && !!user?.center_id
  });

  // Fetch all attendance for report
  const { data: allTeacherAttendance = [] } = useQuery({
    queryKey: ["all-teacher-attendance", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("*, teachers(name)")
        .eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

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
        created_at: new Date().toISOString() };
    });
    setAttendanceRecords(initialRecords);
  }, [teachers, existingAttendance, dateStr, user?.center_id]);

  const handleStatusChange = (teacherId: string, status: TeacherAttendance['status']) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        status,
        time_in: status === 'present' ? (prev[teacherId]?.time_in || format(new Date(), 'HH:mm')) : null,
        time_out: status === 'present' ? (prev[teacherId]?.time_out || null) : null }
    }));
  };

  const handleTimeChange = (teacherId: string, field: 'time_in' | 'time_out', value: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        [field]: value || null }
    }));
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const markAttendanceMutation = useMutation({
    mutationFn: async (type: 'in' | 'out') => {
      setIsVerifying(true);

      // 1. Check Geolocation
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      if (center?.latitude && center?.longitude) {
        const distance = calculateDistance(latitude, longitude, center.latitude, center.longitude);
        if (distance > (center.radius_meters || 100)) {
          throw new Error(`You are outside school premises (${Math.round(distance)}m away). Allowed radius: ${center.radius_meters}m.`);
        }
      }

      // 2. Mark Attendance
      const timeStr = format(new Date(), "HH:mm:ss");
      const teacherProfile = teachers.find(t => t.user_id === user?.id);
      if (!teacherProfile) throw new Error("Teacher profile not found");

      // Enforce shift boundaries
      const currentTime = format(new Date(), "HH:mm");
      if (teacherProfile.regular_in_time && teacherProfile.regular_out_time) {
        if (currentTime < teacherProfile.regular_in_time || currentTime > teacherProfile.regular_out_time) {
          throw new Error(`You can only mark attendance between ${teacherProfile.regular_in_time} and ${teacherProfile.regular_out_time}.`);
        }
      }

      if (type === 'in') {
        const { error } = await supabase.from("teacher_attendance").upsert({
          teacher_id: teacherProfile.id,
          center_id: user?.center_id!,
          date: todayStr,
          status: 'present',
          time_in: timeStr,
        }, { onConflict: 'teacher_id,date' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teacher_attendance").update({
          time_out: timeStr,
        }).eq("teacher_id", teacherProfile.id).eq("date", todayStr);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["all-teacher-attendance"] });
      toast.success("Attendance recorded successfully!");
      setIsVerifying(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
      setIsVerifying(false);
    }
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");

      const recordsToUpsert: any[] = [];

      for (const teacherId in attendanceRecords) {
        const record = attendanceRecords[teacherId];
        recordsToUpsert.push({
          id: record.id || undefined,
          teacher_id: record.teacher_id,
          center_id: user.center_id!,
          date: record.date,
          status: record.status,
          time_in: record.time_in,
          time_out: record.time_out,
          notes: record.notes
        });
      }

      if (recordsToUpsert.length > 0) {
        const { error } = await supabase.from("teacher_attendance").upsert(recordsToUpsert, { onConflict: 'teacher_id,date' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["all-teacher-attendance"] });
      toast.success("Teacher attendance saved successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save attendance");
    } });

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
        time_out: updatedRecords[teacher.id]?.time_out || null };
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
        time_out: null };
    });
    setAttendanceRecords(updatedRecords);
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
        attendancePercentage: 0 });
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

  const todayStats = useMemo(() => {
    const records = Object.values(attendanceRecords);
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const leave = records.filter(r => r.status === 'leave').length;
    return { total, present, absent, leave };
  }, [attendanceRecords]);

  const monthlyStats = useMemo(() => {
    const totalPercentage = reportData.reduce((acc, curr) => acc + curr.attendancePercentage, 0);
    const avgPercentage = reportData.length > 0 ? Math.round(totalPercentage / reportData.length) : 0;
    const totalPresent = reportData.reduce((acc, curr) => acc + curr.present, 0);
    const totalOnLeave = reportData.reduce((acc, curr) => acc + curr.leave, 0);
    return { avgPercentage, totalPresent, totalOnLeave };
  }, [reportData]);

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

  const teacherProfile = teachers.find(t => t.user_id === user?.id);
  const myTodayAttendance = existingAttendance.find(a => a.teacher_id === teacherProfile?.id);
  const isWithinTimeBoundary = useMemo(() => {
    if (!teacherProfile?.regular_in_time || !teacherProfile?.regular_out_time) return true;
    const currentTime = format(new Date(), "HH:mm");
    return currentTime >= teacherProfile.regular_in_time && currentTime <= teacherProfile.regular_out_time;
  }, [teacherProfile]);

  // If teacher role, show check-in interface
  if (isTeacher) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-1000">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-primary uppercase tracking-widest">Daily Check-In</h1>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">Verify location and record presence</p>
        </div>

        {!isWithinTimeBoundary && (
          <Alert variant="destructive" className="rounded-2xl border-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-black uppercase text-xs tracking-widest">Outside Shift Hours</AlertTitle>
            <AlertDescription className="text-xs font-bold">
              You can only mark attendance between {teacherProfile?.regular_in_time} and {teacherProfile?.regular_out_time}.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10 text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-4xl font-black">{format(today, "hh:mm a")}</CardTitle>
            <CardDescription className="font-bold uppercase tracking-widest text-[10px]">
              {format(today, "EEEE, MMMM do")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1 text-center p-4 rounded-3xl bg-muted/30 border border-muted-foreground/5">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Shift In</p>
                <p className="text-xl font-black">{teacherProfile?.regular_in_time || "09:00"}</p>
              </div>
              <div className="space-y-1 text-center p-4 rounded-3xl bg-muted/30 border border-muted-foreground/5">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Shift Out</p>
                <p className="text-xl font-black">{teacherProfile?.regular_out_time || "17:00"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                className="w-full h-20 text-xl font-black rounded-[1.5rem] shadow-strong bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.02] transition-all disabled:opacity-50"
                disabled={!!myTodayAttendance?.time_in || !isWithinTimeBoundary || isVerifying}
                onClick={() => markAttendanceMutation.mutate('in')}
              >
                {isVerifying ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Locate className="mr-2 h-6 w-6" />}
                {myTodayAttendance?.time_in ? `IN AT ${myTodayAttendance.time_in.slice(0, 5)}` : "CHECK IN"}
              </Button>

              <Button
                variant="outline"
                className="w-full h-20 text-xl font-black rounded-[1.5rem] border-2 shadow-soft hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all disabled:opacity-50"
                disabled={!myTodayAttendance?.time_in || !!myTodayAttendance?.time_out || !isWithinTimeBoundary || isVerifying}
                onClick={() => markAttendanceMutation.mutate('out')}
              >
                {myTodayAttendance?.time_out ? `OUT AT ${myTodayAttendance.time_out.slice(0, 5)}` : "CHECK OUT"}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              SECURE GEOLOCATION TRACKING ACTIVE
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
            Institutional Perimeter: {center?.latitude ? `${center.latitude}, ${center.longitude}` : "GLOBAL ACCESS"}
          </p>
        </div>
      </div>
    );
  }

  // Admin view (Rest of the original file)
  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Faculty Attendance
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Monitor staff presence and punctuality trends.</p>
          </div>
        </div>
        <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-slate-700 text-sm">{format(selectedDate, 'MMMM d, yyyy')}</span>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Daily Presence"
          value={`${todayStats.present}/${todayStats.total}`}
          description="Staff present today"
          icon={User}
          color="indigo"
        />
        <KPICard
          title="On Leave"
          value={todayStats.leave}
          description="Staff on leave today"
          icon={MinusCircle}
          color="orange"
        />
        <KPICard
          title="Efficiency"
          value={`${monthlyStats.avgPercentage}%`}
          description="Avg monthly attendance"
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Punctuality"
          value={`${reportData.length > 0 ? 92 : 0}%`}
          description="Staff arriving on time"
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Date Picker Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium p-6 overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Select Attendance Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-11 justify-start text-left font-normal bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? safeFormatDate(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-strong" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={markAllPresent} className="rounded-xl h-11 border-2 font-bold px-4">Mark All Present</Button>
              <Button variant="outline" size="sm" onClick={markAllAbsent} className="rounded-xl h-11 border-2 font-bold px-4">Mark All Absent</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            Staff Presence Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {teachersLoading || attendanceLoading ? (
            <p>Loading teachers and attendance...</p>
          ) : teachers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No active teachers registered yet.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-muted/10">
                      <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Faculty Member</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attendance Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clock In</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clock Out</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pr-6">Performance Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map(teacher => {
                      const record = attendanceRecords[teacher.id];
                      return (
                        <TableRow key={teacher.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {teacher.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground/90">{teacher.name}</span>
                                {approvedLeaves.find(l => l.teacher_id === teacher.id) && (
                                  <span className="text-[9px] font-black text-orange-600 uppercase tracking-tighter animate-pulse">On Approved Leave</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={record?.status || 'absent'}
                              onValueChange={(value: TeacherAttendance['status']) => handleStatusChange(teacher.id, value)}
                            >
                              <SelectTrigger className="w-[120px] h-9 bg-white shadow-soft border-none focus:ring-primary/20 rounded-xl font-bold text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl font-bold">
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
                              className="h-9 w-32 bg-card/80 border-none shadow-soft rounded-xl text-xs font-bold"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={record?.time_out || ''}
                              onChange={(e) => handleTimeChange(teacher.id, 'time_out', e.target.value)}
                              disabled={record?.status !== 'present'}
                              className="h-9 w-32 bg-card/80 border-none shadow-soft rounded-xl text-xs font-bold"
                            />
                          </TableCell>
                          <TableCell className="pr-6">
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
                              placeholder="Add observation..."
                              className="h-9 bg-card/80 border-none shadow-soft rounded-xl text-xs font-medium"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="p-6 border-t border-muted/10">
                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-black shadow-strong rounded-2xl bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.01] transition-all duration-300"
                  disabled={saveAttendanceMutation.isPending}
                >
                  {saveAttendanceMutation.isPending ? (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>SECURELY COMMITTING...</span>
                    </div>
                  ) : (
                    'COMMIT FACULTY ATTENDANCE'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Attendance Report Section */}
      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 h-fit mt-12">
        <CardHeader className="bg-gradient-to-r from-primary to-violet-600 text-primary-foreground py-6 shadow-strong">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <CardTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              Monthly Efficiency Matrix
            </CardTitle>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={exportReportToCSV} className="rounded-xl border-border/20 bg-white/10 hover:bg-white/20 text-white font-bold h-10 px-4">
                <Download className="mr-2 h-4 w-4" /> CSV EXPORT
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport} className="rounded-xl border-border/20 bg-white/10 hover:bg-white/20 text-white font-bold h-10 px-4">
                <Printer className="mr-2 h-4 w-4" /> PRINT RECORD
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="space-y-1">
              <Label htmlFor="report-month-filter" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Reporting Period</Label>
              <Input
                id="report-month-filter"
                type="month"
                value={reportMonthFilter}
                onChange={(e) => setReportMonthFilter(e.target.value)}
                className="w-[200px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl font-bold"
              />
            </div>
            <div className="flex gap-6">
               <div className="text-center">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Staff</p>
                 <p className="text-2xl font-black text-foreground/90">{reportData.length}</p>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Avg Efficiency</p>
                 <p className="text-2xl font-black text-primary">
                   {reportData.length > 0 ? Math.round(reportData.reduce((acc, curr) => acc + curr.attendancePercentage, 0) / reportData.length) : 0}%
                 </p>
               </div>
            </div>
          </div>
          {teachersLoading || allTeacherAttendance.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12 bg-muted/5 rounded-3xl border border-dashed border-muted/20">
              <p className="text-muted-foreground font-medium italic">No performance data available for this period.</p>
            </div>
          ) : (
            <div id="teacher-attendance-report-printable" className="overflow-x-auto rounded-2xl border border-muted/10 bg-white/20">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/10 bg-muted/5">
                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Faculty Member</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Present</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Absent</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Leave</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Ratio</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Analysis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map(summary => (
                    <TableRow key={summary.id} className="group border-muted/5 hover:bg-card/40 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <span className="font-bold text-slate-700">{summary.name}</span>
                      </TableCell>
                      <TableCell className="text-center font-bold text-green-600">{summary.present}</TableCell>
                      <TableCell className="text-center font-bold text-red-500">{summary.absent}</TableCell>
                      <TableCell className="text-center font-bold text-orange-500">{summary.leave}</TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black">
                          {summary.attendancePercentage}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleTeacherClick({ id: summary.id, name: summary.name } as Teacher)}>
                          <Eye className="h-4 w-4" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="teacher-detail-title" aria-describedby="teacher-detail-description">
          <DialogHeader>
            <DialogTitle id="teacher-detail-title" className="flex items-center gap-3 text-2xl font-black">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <User className="h-6 w-6" />
              </div>
              {selectedTeacherDetail?.name}
            </DialogTitle>
            <DialogDescription id="teacher-detail-description">
              In-depth attendance and punctuality analysis for the selected period.
            </DialogDescription>
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
