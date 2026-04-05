import { logger } from "@/utils/logger";
import React, { useEffect, useState } from "react";
import { UserRole } from "@/types/roles";
import { CalendarIcon, Calendar as CalendarIconLucide, ChevronDown, Lock, Users, ShieldAlert, Check, X, Clock, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { hasPermission, hasActionPermission } from "@/utils/permissions";
import { tracking } from "@/utils/tracking";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Student {
  id: string;
  name: string;
  grade: string;
}

type AttendanceStatus = "present" | "absent" | "late" | "pending";

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  timeIn: string;
  timeOut: string;
}

export default function TakeAttendance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [bulkAction, setBulkAction] = useState<{ type: 'present' | 'absent' | null, open: boolean }>({ type: null, open: false });

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: currentAcademicYear } = useQuery({
    queryKey: ["current-academic-year", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return null;
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ["school-calendar-status", dateStr, user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("date", dateStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!dateStr && !!user?.center_id
  });

  const holidayEvent = calendarEvents.find(e => !e.is_school_day);
  const isOperationalDay = !holidayEvent;

  // Fetch class teacher assignments if teacher role (ONLY from official assignments)
  const { data: classTeacherGrades = [] } = useQuery({
    queryKey: ["my-class-teacher-grades", user?.teacher_id],
    queryFn: async () => {
      if (!user?.teacher_id) return [];
      const { data: assignments, error: assignmentsError } = await supabase
        .from("class_teacher_assignments")
        .select("grade")
        .eq("teacher_id", user.teacher_id);

      if (assignmentsError) throw assignmentsError;

      const grades = new Set([
        ...(assignments?.map(a => a.grade) || [])
      ]);

      return Array.from(grades).filter(Boolean);
    },
    enabled: !!user?.teacher_id && user?.role === UserRole.TEACHER });

  const isTeacher = user?.role === UserRole.TEACHER;
  const isCenter = user?.role === UserRole.CENTER || user?.role === UserRole.ADMIN;

  // Restricted by default for teachers. ONLY explicitly 'full' bypasses.
  const isRestricted = React.useMemo(() => {
    if (isCenter) return false;
    // For teachers, treat as restricted if mode is 'restricted', null, undefined, or anything not 'full'
    if (isTeacher) return user?.teacher_scope_mode !== 'full';
    // Any other role is restricted by default on this page
    return true;
  }, [isTeacher, isCenter, user?.teacher_scope_mode]);

  const hasEditPermission = hasActionPermission(user, 'take_attendance', 'edit');

  // Security Audit Logging - restricted to development environment only.
  // Sensitive IDs and security scopes are never logged in production console.
  useEffect(() => {
    if (user && import.meta.env.DEV) {
      logger.debug("TakeAttendance [Security Audit]:", {
        userId: user.id,
        role: user.role,
        teacherId: user.teacher_id,
        teacherScopeMode: user.teacher_scope_mode,
        isRestricted,
        classTeacherGrades,
        canMarkAttendance: hasActionPermission(user, 'take_attendance', 'edit')
      });
    }
  }, [user, isRestricted, classTeacherGrades]);

  const { data: students } = useQuery({
    queryKey: ["students", user?.center_id, isRestricted, classTeacherGrades],
    queryFn: async () => {
      let query = supabase.from("students").select("id, name, grade").eq("is_active", true).order("name");
      if (user?.role !== UserRole.ADMIN && user?.center_id) {
        query = query.eq("center_id", user.center_id);
      }

      // Hardening: Restricted teachers should only fetch students from their assigned grades
      if (isRestricted) {
        if (classTeacherGrades.length > 0) {
          query = query.in('grade', classTeacherGrades);
        } else {
          // If restricted but no grades assigned, return empty list immediately
          return [] as Student[];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!user?.center_id && (!isRestricted || !!classTeacherGrades)
  });

  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["approved-leaves", dateStr, user?.center_id, isRestricted, classTeacherGrades],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("leave_applications")
        .select("student_id, category_id, leave_categories(name), students!inner(grade)")
        .eq("center_id", user.center_id)
        .eq("status", "approved")
        .lte("start_date", dateStr)
        .gte("end_date", dateStr);

      if (isRestricted && classTeacherGrades.length > 0) {
        query = query.in('students.grade', classTeacherGrades);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!dateStr && !!user?.center_id && (!isRestricted || !!classTeacherGrades)
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ["attendance", dateStr, user?.center_id, isRestricted, classTeacherGrades],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("attendance")
        .select("student_id, status, time_in, time_out, is_locked, students!inner(grade)")
        .eq("date", dateStr)
        .eq("center_id", user.center_id);

      // Hardening: Frontend filtering is for UI/UX. RLS enforces the actual restriction.
      if (isRestricted && classTeacherGrades.length > 0) {
        query = query.in('students.grade', classTeacherGrades);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!dateStr && !!user?.center_id && (!isRestricted || !!classTeacherGrades)
  });

  // Check if attendance is locked for this date
  const isLocked = existingAttendance?.some((a: any) => a.is_locked) || false;
  const canModifyLocked = isCenter; // Only center admin can edit locked attendance
  const canMarkAttendance = hasEditPermission;

  // For teachers, filter available grades to their assigned grades
  const availableGrades = React.useMemo(() => {
    if (!students) return [];
    return Array.from(new Set(students.map(s => s.grade))).filter(Boolean).sort();
  }, [students]);

  const allowedGrades = React.useMemo(() => {
    // Center Admin sees all grades found in students
    if (isCenter) return availableGrades;

    // Teachers in Full Scope see all grades found in students
    if (isTeacher && !isRestricted) return availableGrades;

    // Restricted Teachers ONLY see their assigned grades
    if (isTeacher && isRestricted) {
      return Array.from(new Set(classTeacherGrades)).filter(Boolean).sort();
    }

    // Fallback: Default to whatever grades are found in students
    return availableGrades;
  }, [isTeacher, isCenter, isRestricted, classTeacherGrades, availableGrades]);


  useEffect(() => {
    if (students) {
      const newAttendance: Record<string, AttendanceRecord> = {};
      students.forEach((student) => {
        const record = existingAttendance?.find((a: any) => a.student_id === student.id);
        newAttendance[student.id] = {
          status: (record?.status as AttendanceStatus) || "pending",
          timeIn: record?.time_in || "",
          timeOut: record?.time_out || "",
          studentId: student.id };
      });
      setAttendance(newAttendance);
    }
  }, [students, existingAttendance]);

  // Filter students by grade - for restricted teachers, always enforce assigned grades
  const filteredStudents = students?.filter(s => {
    if (isTeacher && isRestricted) {
      const isAssigned = classTeacherGrades.includes(s.grade);
      if (!isAssigned) return false;
      return gradeFilter === "all" || s.grade === gradeFilter;
    }
    return gradeFilter === "all" || s.grade === gradeFilter;
  });

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => {
      const current = prev[studentId];
      let timeIn = current?.timeIn || "";

      // Auto-fill time if marking present/late and time is empty
      if ((status === "present" || status === "late") && !timeIn) {
        timeIn = format(new Date(), "HH:mm");
      } else if (status === "absent") {
        timeIn = "";
      }

      return {
        ...prev,
        [studentId]: { ...current, status, timeIn }
      };
    });
  };

  const handleTimeChange = (studentId: string, field: "timeIn" | "timeOut", value: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const executeBulkAction = () => {
    if (!filteredStudents || !bulkAction.type) return;
    const updated: Record<string, AttendanceRecord> = { ...attendance };
    const currentTime = format(new Date(), "HH:mm");

    filteredStudents.forEach((student) => {
      if (bulkAction.type === 'present') {
        updated[student.id] = { ...updated[student.id], status: "present", timeIn: updated[student.id]?.timeIn || currentTime };
      } else {
        updated[student.id] = { ...updated[student.id], status: "absent", timeIn: "", timeOut: "" };
      }
    });
    setAttendance(updated);
    setBulkAction({ type: null, open: false });
    toast.info(`Marked all as ${bulkAction.type}`);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!filteredStudents || !user?.center_id) return;
      if (!hasEditPermission) throw new Error("Access Denied: You do not have permission to mark attendance.");
      // 1. Security Guard for Restricted Teachers
      const studentsToProcess = filteredStudents || [];
      if (isRestricted) {
        const unauthorizedStudents = studentsToProcess.filter(s => !classTeacherGrades.includes(s.grade));
        if (unauthorizedStudents.length > 0) {
          throw new Error("Access Denied: You are attempting to mark attendance for grades not assigned to you.");
        }
      }

      if (!user.center_id) throw new Error("Missing center context");

      // 2. Delete existing records for these students on this date
      const { error: deleteError } = await supabase.from("attendance").delete().eq("date", dateStr).in("student_id", studentsToProcess.map((s) => s.id));
      if (deleteError) throw deleteError;

      // 3. Insert ALL filtered students
      const records = studentsToProcess.map((student) => ({
        student_id: student.id,
        center_id: user.center_id!,
        date: dateStr,
        academic_year_id: currentAcademicYear?.id || null,
        status: attendance[student.id]?.status || "pending",
        time_in: attendance[student.id]?.timeIn || null,
        time_out: attendance[student.id]?.timeOut || null,
        marked_by: user.id,
        is_locked: true, // Lock after submission
      }));
      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;

      // Notify Parents of Absentees
      const absentees = filteredStudents.filter(s => attendance[s.id]?.status === "absent");
      if (absentees.length > 0) {
        const absenteeIds = absentees.map(s => s.id);
        const { data: parentUsers } = await supabase.from('users').select('id, student_id').in('student_id', absenteeIds).eq('role', 'parent');

        if (parentUsers && parentUsers.length > 0) {
          const notifications = parentUsers.map(pu => ({
            user_id: pu.id,
            center_id: user.center_id!,
            title: "Absence Alert",
            message: `Your child ${absentees.find(a => a.id === pu.student_id)?.name} is marked ABSENT today (${dateStr}).`,
            type: "attendance",
            link: "/parent-dashboard"
          }));
          const { error: notifError } = await supabase.from('notifications').insert(notifications);
          if (notifError) logger.error("Error sending notifications:", notifError);
        }
      }
    },
    onSuccess: () => {
      tracking.trackEvent('feature_action', 'take_attendance', {
        grade: gradeFilter,
        present: presentCount,
        absent: absentCount
      });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance saved and locked!");
    },
    onError: () => toast.error("Failed to save attendance") });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOperationalDay) {
      toast.error("Cannot mark attendance on a non-school day.");
      return;
    }
    if (isLocked && !hasEditPermission) {
      toast.error("Attendance is locked. Only center admin can edit.");
      return;
    }
    saveMutation.mutate();
  };

  const presentCount = filteredStudents?.filter(s => attendance[s.id]?.status === "present").length || 0;
  const lateCount = filteredStudents?.filter(s => attendance[s.id]?.status === "late").length || 0;
  const absentCount = filteredStudents?.filter(s => attendance[s.id]?.status === "absent").length || 0;
  const pendingCount = filteredStudents?.filter(s => attendance[s.id]?.status === "pending").length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <AlertDialog open={bulkAction.open} onOpenChange={(open) => setBulkAction(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black">Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Are you sure you want to mark all filtered students as <span className="font-bold text-foreground underline decoration-primary decoration-2">{bulkAction.type?.toUpperCase()}</span>? This will overwrite individual selections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction} className="rounded-xl font-black bg-primary">Confirm Action</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <CheckCircle2 className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Attendance Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Daily Roll Call Portal</p>
                 {isTeacher && (
                   <Badge
                     variant={isRestricted ? "outline" : "destructive"}
                     className={cn(
                       "ml-2 font-black text-[9px] uppercase tracking-tighter",
                       isRestricted ? "bg-amber-50 text-amber-700 border-amber-200" : "animate-pulse"
                     )}
                   >
                     {isRestricted ? "Restricted Scope" : "Full Center Scope"}
                   </Badge>
                 )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card/60 backdrop-blur-md p-1.5 rounded-2xl shadow-soft border border-border/40 group transition-all hover:shadow-medium">
           <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-primary/5 transition-colors">
              <CalendarIconLucide className="h-4 w-4 text-slate-400 group-hover:text-primary" />
           </div>
           <span className="font-black text-xs uppercase tracking-widest text-slate-700 pr-4">{format(selectedDate, 'EEEE, MMM do')}</span>
        </div>
      </div>

      {!isOperationalDay && (
        <Alert variant="destructive" className="rounded-2xl border-2 animate-in slide-in-from-top-2">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="font-black uppercase text-xs tracking-widest">Attendance Disabled</AlertTitle>
          <AlertDescription className="text-sm font-bold">
          Not a school day. Reason: {calendarEvent?.title || "Institutional Closure"}
          </AlertDescription>
        </Alert>
      )}

      {isTeacher && isRestricted && (
        <Alert className="rounded-2xl border-2 bg-blue-50/50 border-blue-200 animate-in slide-in-from-top-2">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="font-black uppercase text-xs tracking-widest text-blue-800">Security Audit: Assigned Scope</AlertTitle>
          <AlertDescription className="text-sm font-bold text-blue-700">
            You are in RESTRICTED mode. Your assigned grades are: <span className="underline decoration-2">{classTeacherGrades.length > 0 ? classTeacherGrades.join(", ") : "None Detected"}</span>.
            The dropdown and student list are strictly filtered to these grades.
          </AlertDescription>
        </Alert>
      )}

      {isLocked && !hasEditPermission && isOperationalDay && (
        <div className="flex items-center gap-3 p-4 bg-orange-50/50 backdrop-blur-sm border border-orange-200 rounded-2xl text-orange-700 shadow-soft animate-in slide-in-from-top-2">
          <div className="p-2 rounded-xl bg-orange-100">
            <Lock className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold uppercase tracking-tight">Records Locked — Only Center Admin can modify.</span>
        </div>
      )}

      {/* Filters/Settings */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium p-6 overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Select Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-11 justify-start text-left font-normal bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl", !selectedDate && "text-muted-foreground")}>
                    <CalendarIconLucide className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-strong" align="start">
                  <CalendarComponent mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-[160px] space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Filter Grade</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                  {allowedGrades.length === 0 && isRestricted && (
                    <SelectItem value="none" disabled>No assigned grades</SelectItem>
                  )}
                  {allowedGrades.map((g) => (
                    <SelectItem key={g} value={g || "unassigned"}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                Daily Attendance Roll
              </CardTitle>
              <div className="flex flex-wrap gap-4 ml-11">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Present: {presentCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Late: {lateCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Absent: {absentCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Pending: {pendingCount}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" type="button" size="sm" onClick={() => setBulkAction({ type: 'present', open: true })} disabled={(isLocked && !canModifyLocked) || !isOperationalDay || !canMarkAttendance} className="rounded-xl border-2 hover:bg-green-50 hover:border-green-200 hover:text-green-600 h-10 px-4 font-bold">
                Mark All Present
              </Button>
              <Button variant="outline" type="button" size="sm" onClick={() => setBulkAction({ type: 'absent', open: true })} disabled={(isLocked && !canModifyLocked) || !isOperationalDay || !canMarkAttendance} className="rounded-xl border-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 h-10 px-4 font-bold">
                Mark All Absent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents && filteredStudents.length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={cn(
                      "rounded-3xl border transition-all duration-500 p-6 flex flex-col gap-6",
                      attendance[student.id]?.status === "present" ? "border-green-500/20 bg-green-500/5 shadow-medium" :
                      attendance[student.id]?.status === "late" ? "border-yellow-500/20 bg-yellow-500/5 shadow-medium" :
                      attendance[student.id]?.status === "absent" ? "border-red-500/20 bg-red-500/5 shadow-medium" :
                      "border-border/40 bg-white/30 backdrop-blur-sm shadow-soft grayscale-[0.5] opacity-80"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          attendance[student.id]?.status === "present" ? "bg-green-500 text-white shadow-soft" :
                          attendance[student.id]?.status === "late" ? "bg-yellow-500 text-white shadow-soft" :
                          attendance[student.id]?.status === "absent" ? "bg-red-500 text-white shadow-soft" :
                          "bg-slate-200 text-slate-500"
                        )}>
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-lg font-black text-foreground/90">{student.name}</p>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold">
                            Grade {student.grade}
                          </Badge>
                          {approvedLeaves.find(l => l.student_id === student.id) && (
                            <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-600 border-orange-200 rounded-lg px-2 py-0.5 text-[10px] font-bold animate-pulse">
                              ON APPROVED LEAVE
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(student.id, "present")}
                          disabled={(isLocked && !canModifyLocked) || !isOperationalDay || !canMarkAttendance}
                          className={cn(
                            "flex-1 h-10 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all gap-2",
                            attendance[student.id]?.status === "present" ? "bg-green-500 border-green-500 text-white hover:bg-green-600 shadow-soft" : "hover:bg-green-50 text-muted-foreground"
                          )}
                        >
                          <Check className="h-3 w-3" /> Present
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(student.id, "late")}
                          disabled={(isLocked && !canModifyLocked) || !isOperationalDay || !canMarkAttendance}
                          className={cn(
                            "flex-1 h-10 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all gap-2",
                            attendance[student.id]?.status === "late" ? "bg-yellow-500 border-yellow-500 text-white hover:bg-yellow-600 shadow-soft" : "hover:bg-yellow-50 text-muted-foreground"
                          )}
                        >
                          <Clock className="h-3 w-3" /> Late
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(student.id, "absent")}
                          disabled={(isLocked && !canModifyLocked) || !isOperationalDay || !canMarkAttendance}
                          className={cn(
                            "flex-1 h-10 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all gap-2",
                            attendance[student.id]?.status === "absent" ? "bg-red-500 border-red-500 text-white hover:bg-red-600 shadow-soft" : "hover:bg-red-50 text-muted-foreground"
                          )}
                        >
                          <X className="h-3 w-3" /> Absent
                        </Button>
                      </div>

                      {attendance[student.id]?.status !== "absent" && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Arrival Time</Label>
                            <Input
                              type="time"
                              value={attendance[student.id]?.timeIn || ""}
                              onChange={(e) => handleTimeChange(student.id, "timeIn", e.target.value)}
                              disabled={(isLocked && !canModifyLocked) || !isOperationalDay || !canMarkAttendance}
                              className="h-10 bg-card/40 rounded-xl text-xs font-bold border-none shadow-inner"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Departure Time</Label>
                            <Input
                              type="time"
                              value={attendance[student.id]?.timeOut || ""}
                              onChange={(e) => handleTimeChange(student.id, "timeOut", e.target.value)}
                              disabled={(isLocked && !canModifyLocked) || !isOperationalDay || !canMarkAttendance}
                              className="h-10 bg-card/40 rounded-xl text-xs font-bold border-none shadow-inner"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="submit"
                className="w-full h-16 text-xl font-black shadow-strong rounded-[2rem] bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.01] transition-all duration-300 mt-8"
                disabled={saveMutation.isPending || (isLocked && !canModifyLocked) || !isOperationalDay || !canMarkAttendance}
              >
                {saveMutation.isPending ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>SECURELY SAVING...</span>
                  </div>
                ) : !isOperationalDay ? (
                  "ATTENDANCE DISABLED - NOT A SCHOOL DAY"
                ) : (
                  `COMMIT ROLL CALL (${presentCount} PRESENT / ${lateCount} LATE / ${absentCount} ABSENT / ${pendingCount} PENDING)`
                )}
              </Button>
            </form>
          ) : (
            <p className="text-center text-muted-foreground py-12 font-medium italic">
              {isTeacher && classTeacherGrades.length === 0 ? "You are not assigned as class teacher for any grade. Contact your center admin." : "No students found for this filter."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
