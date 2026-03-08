import React, { useEffect, useState } from "react";
import { CalendarIcon, ChevronDown, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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

interface Student {
  id: string;
  name: string;
  grade: string;
}

interface AttendanceRecord {
  studentId: string;
  present: boolean;
  timeIn: string;
  timeOut: string;
}

export default function TakeAttendance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch class teacher assignments if teacher role
  const { data: classTeacherGrades = [] } = useQuery({
    queryKey: ["my-class-teacher-grades", user?.teacher_id],
    queryFn: async () => {
      if (!user?.teacher_id) return [];
      const { data, error } = await supabase.from("class_teacher_assignments").select("grade").eq("teacher_id", user.teacher_id);
      if (error) throw error;
      return data.map(d => d.grade);
    },
    enabled: !!user?.teacher_id && user?.role === 'teacher' });

  const isTeacher = user?.role === 'teacher';
  const isCenter = user?.role === 'center';

  const { data: students } = useQuery({
    queryKey: ["students", user?.center_id],
    queryFn: async () => {
      let query = supabase.from("students").select("id, name, grade").eq("is_active", true).order("name");
      if (user?.role !== "admin" && user?.center_id) {
        query = query.eq("center_id", user.center_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    } });

  const { data: existingAttendance } = useQuery({
    queryKey: ["attendance", dateStr, user?.center_id, user?.id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("attendance")
        .select("student_id, status, time_in, time_out, is_locked")
        .eq("date", dateStr)
        .eq("center_id", user.center_id);

      if (user?.role === 'teacher') {
        query = query.eq('marked_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!dateStr && !!user?.center_id });

  // Check if attendance is locked for this date
  const isLocked = existingAttendance?.some((a: any) => a.is_locked) || false;
  const canEdit = isCenter; // Only center admin can edit locked attendance

  // For teachers, filter available grades to their assigned grades
  const availableGrades = students ? Array.from(new Set(students.map(s => s.grade))).sort() : [];
  const allowedGrades = isTeacher && classTeacherGrades.length > 0 ? availableGrades.filter(g => classTeacherGrades.includes(g)) : availableGrades;

  // Auto-set grade filter for teachers with only one assigned grade
  useEffect(() => {
    if (isTeacher && classTeacherGrades.length === 1 && gradeFilter === "all") {
      setGradeFilter(classTeacherGrades[0]);
    }
  }, [isTeacher, classTeacherGrades]);

  useEffect(() => {
    if (students) {
      const newAttendance: Record<string, AttendanceRecord> = {};
      students.forEach((student) => {
        const record = existingAttendance?.find((a: any) => a.student_id === student.id);
        newAttendance[student.id] = {
          present: record ? record.status === "present" : false,
          timeIn: record?.time_in || "",
          timeOut: record?.time_out || "",
          studentId: student.id };
      });
      setAttendance(newAttendance);
    }
  }, [students, existingAttendance]);

  // Filter students by grade - for teachers, only show their assigned grades
  const filteredStudents = students?.filter(s => {
    if (isTeacher && classTeacherGrades.length > 0) {
      if (gradeFilter !== "all") return s.grade === gradeFilter;
      return classTeacherGrades.includes(s.grade);
    }
    return gradeFilter === "all" || s.grade === gradeFilter;
  });

  const handleToggle = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], present: !prev[studentId]?.present } }));
  };

  const handleTimeChange = (studentId: string, field: "timeIn" | "timeOut", value: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const markAllPresent = () => {
    if (!filteredStudents) return;
    const updated: Record<string, AttendanceRecord> = { ...attendance };
    filteredStudents.forEach((student) => {
      updated[student.id] = { ...updated[student.id], present: true };
    });
    setAttendance(updated);
  };

  const markAllAbsent = () => {
    if (!filteredStudents) return;
    const updated: Record<string, AttendanceRecord> = { ...attendance };
    filteredStudents.forEach((student) => {
      updated[student.id] = { ...updated[student.id], present: false, timeIn: "", timeOut: "" };
    });
    setAttendance(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!filteredStudents || !user?.center_id) return;
      // Delete existing records for these students on this date
      await supabase.from("attendance").delete().eq("date", dateStr).in("student_id", filteredStudents.map((s) => s.id));
      // Insert ALL filtered students - present AND absent
      const records = filteredStudents.map((student) => ({
        student_id: student.id,
        center_id: user.center_id!,
        date: dateStr,
        status: attendance[student.id]?.present ? "present" : "absent",
        time_in: attendance[student.id]?.timeIn || null,
        time_out: attendance[student.id]?.timeOut || null,
        marked_by: user.id,
        is_locked: true, // Lock after submission
      }));
      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance saved and locked!");
    },
    onError: () => toast.error("Failed to save attendance") });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked && !canEdit) {
      toast.error("Attendance is locked. Only center admin can edit.");
      return;
    }
    saveMutation.mutate();
  };

  const presentCount = filteredStudents?.filter(s => attendance[s.id]?.present).length || 0;
  const absentCount = (filteredStudents?.length || 0) - presentCount;

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Attendance Center
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Manage daily presence and tracking.</p>
          </div>
        </div>
        <div className="bg-card/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-border/40 shadow-soft flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarIcon className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-slate-700 text-sm">{format(selectedDate, 'PPP')}</span>
        </div>
      </div>

      {isLocked && !canEdit && (
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
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-strong" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-[160px] space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Filter Grade</label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                  {isTeacher && classTeacherGrades.length > 0 ? null : <SelectItem value="all">All Grades</SelectItem>}
                  {allowedGrades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                Daily Attendance Roll
              </CardTitle>
              <div className="flex gap-4 ml-11">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Present: {presentCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Absent: {absentCount}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={markAllPresent} disabled={isLocked && !canEdit} className="rounded-xl border-2 hover:bg-green-50 hover:border-green-200 hover:text-green-600 h-10 px-4">
                Mark All Present
              </Button>
              <Button variant="outline" size="sm" onClick={markAllAbsent} disabled={isLocked && !canEdit} className="rounded-xl border-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 h-10 px-4">
                Mark All Absent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents && filteredStudents.length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={cn(
                      "rounded-3xl border transition-all duration-500 p-6 flex flex-col gap-4",
                      attendance[student.id]?.present
                        ? "border-green-500/20 bg-green-500/5 shadow-medium"
                        : "border-border/40 bg-white/30 backdrop-blur-sm shadow-soft grayscale-[0.5] opacity-80"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          attendance[student.id]?.present ? "bg-green-500 text-white shadow-soft" : "bg-slate-200 text-slate-500"
                        )}>
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <Label
                            htmlFor={student.id}
                            className="text-lg font-black text-foreground/90 cursor-pointer"
                          >
                            {student.name}
                          </Label>
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold">
                            Grade {student.grade}
                          </Badge>
                        </div>
                      </div>
                      <Checkbox
                        id={student.id}
                        checked={attendance[student.id]?.present || false}
                        onCheckedChange={() => handleToggle(student.id)}
                        disabled={isLocked && !canEdit}
                        className="h-7 w-7 rounded-xl border-2 border-slate-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Arrival</Label>
                        <Input
                          type="time"
                          value={attendance[student.id]?.timeIn || ""}
                          onChange={(e) => handleTimeChange(student.id, "timeIn", e.target.value)}
                          disabled={isLocked && !canEdit}
                          className="h-10 bg-card/40 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">Departure</Label>
                        <Input
                          type="time"
                          value={attendance[student.id]?.timeOut || ""}
                          onChange={(e) => handleTimeChange(student.id, "timeOut", e.target.value)}
                          disabled={isLocked && !canEdit}
                          className="h-10 bg-card/40 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="submit"
                className="w-full h-16 text-xl font-black shadow-strong rounded-[2rem] bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.01] transition-all duration-300"
                disabled={saveMutation.isPending || (isLocked && !canEdit)}
              >
                {saveMutation.isPending ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>SECURELY SAVING...</span>
                  </div>
                ) : (
                  `COMMIT ROLL CALL (${presentCount} PRESENT / ${absentCount} ABSENT)`
                )}
              </Button>
            </form>
          ) : (
            <p className="text-center text-muted-foreground">
              {isTeacher && classTeacherGrades.length === 0 ? "You are not assigned as class teacher for any grade. Contact your center admin." : "No students found for this filter."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
