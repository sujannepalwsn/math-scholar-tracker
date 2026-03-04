import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { CalendarIcon, ChevronDown, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

interface MiniDayNote {
  holiday: boolean;
  note: string;
}

export default function TakeAttendance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [attendanceDates, setAttendanceDates] = useState<string[]>([]);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(new Date());
  const [miniCalendar, setMiniCalendar] = useState<Record<string, MiniDayNote>>({});

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: students } = useQuery({
    queryKey: ["students", user?.center_id],
    queryFn: async () => {
      let query = supabase.from("students").select("id, name, grade").order("name");
      if (user?.role !== "admin" && user?.center_id) {
        query = query.eq("center_id", user.center_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    },
  });

  const centerStudentIds = students?.map((s) => s.id) || [];

  const { data: existingAttendance } = useQuery({
    queryKey: ["attendance", dateStr, centerStudentIds.join(",")],
    queryFn: async () => {
      if (!centerStudentIds.length) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id, status, time_in, time_out, date, center_id")
        .eq("date", dateStr)
        .in("student_id", centerStudentIds);
      if (error) throw error;
      return data;
    },
    enabled: !!dateStr && centerStudentIds.length > 0,
  });

  useEffect(() => {
    async function fetchAttendanceDates() {
      if (!centerStudentIds.length) return;
      const { data, error } = await supabase
        .from("attendance")
        .select("date")
        .in("student_id", centerStudentIds)
        .order("date", { ascending: false });
      if (!error && data) {
        const uniqueDates = Array.from(new Set(data.map((d: any) => d.date)));
        setAttendanceDates(uniqueDates);
      }
    }
    fetchAttendanceDates();
  }, [centerStudentIds.join(",")]);

  useEffect(() => {
    if (students) {
      const newAttendance: Record<string, AttendanceRecord> = {};
      students.forEach((student) => {
        const record = existingAttendance?.find((a) => a.student_id === student.id);
        newAttendance[student.id] = {
          present: record?.status === "present",
          timeIn: record?.time_in || "",
          timeOut: record?.time_out || "",
          studentId: student.id,
        };
      });
      setAttendance(newAttendance);
    }
  }, [students, existingAttendance]);

  const filteredStudents = gradeFilter === "all" ? students : students?.filter((s) => s.grade === gradeFilter);

  useEffect(() => {
    if (!filteredStudents) return;
    const updated: Record<string, AttendanceRecord> = { ...attendance };
    filteredStudents.forEach((student) => {
      if (!(student.id in updated)) {
        updated[student.id] = { studentId: student.id, present: false, timeIn: "", timeOut: "" };
      }
    });
    setAttendance(updated);
  }, [gradeFilter, students]);

  const handleToggle = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], present: !prev[studentId]?.present },
    }));
  };

  const handleTimeChange = (studentId: string, field: "timeIn" | "timeOut", value: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
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
      if (!students || !filteredStudents) return;
      const studentsToSave = filteredStudents.filter((s) => attendance[s.id]?.present !== undefined);
      await supabase.from("attendance").delete().eq("date", dateStr).in("student_id", studentsToSave.map((s) => s.id));
      const records = studentsToSave.map((student) => ({
        student_id: student.id,
        center_id: user.center_id!,
        date: dateStr,
        status: attendance[student.id]?.present ? "present" : "absent",
        time_in: attendance[student.id]?.timeIn || null,
        time_out: attendance[student.id]?.timeOut || null,
      }));
      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance saved successfully!");
    },
    onError: () => toast.error("Failed to save attendance"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(miniCalendarMonth), end: endOfMonth(miniCalendarMonth) });

  const toggleMiniHoliday = (date: string) => {
    setMiniCalendar((prev) => ({
      ...prev,
      [date]: { holiday: !prev[date]?.holiday, note: prev[date]?.note || "" },
    }));
  };

  const updateMiniNote = (date: string, note: string) => {
    setMiniCalendar((prev) => ({
      ...prev,
      [date]: { holiday: prev[date]?.holiday || false, note },
    }));
  };

  const selectedStudentsCount = filteredStudents ? filteredStudents.filter((s) => attendance[s.id]?.present !== undefined).length : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Take Attendance</h1>
          <p className="text-muted-foreground text-lg">Manage daily presence for your students.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <span className="font-semibold text-primary">{format(selectedDate, 'PPP')}</span>
        </div>
      </div>

      <Card className="border-none shadow-soft">
        <CardHeader className="pb-4"><CardTitle className="text-xl">Attendance Settings</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs">Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-xs">Filter by Grade</Label>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {students && Array.from(new Set(students.map((s) => s.grade))).map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs">Past Attendance</Label>
            <Select value={dateStr} onValueChange={(val) => setSelectedDate(new Date(val))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select Date" />
              </SelectTrigger>
              <SelectContent>
                {attendanceDates.map((d) => (
                  <SelectItem key={d} value={d}>{format(new Date(d), "PPP")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px] mt-4">
            <Button variant="outline" onClick={() => setShowMiniCalendar((prev) => !prev)}>
              {showMiniCalendar ? "Hide Mini Calendar" : "Show Mini Calendar"} <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {showMiniCalendar && (
        <Card>
          <CardHeader><CardTitle>Mini Month Calendar</CardTitle><CardDescription>Mark holidays & add notes (local only)</CardDescription></CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-2 items-center">
              <Label className="text-xs">Select Month:</Label>
              <input type="month" value={format(miniCalendarMonth, "yyyy-MM")} onChange={(e) => {
                const [year, month] = e.target.value.split("-");
                setMiniCalendarMonth(new Date(parseInt(year), parseInt(month) - 1));
              }} className="border p-1 rounded" />
            </div>
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayData = miniCalendar[dayStr] || { holiday: false, note: "" };
                return (
                  <div key={dayStr} className="flex flex-col items-center border rounded p-1">
                    <button className={`w-full rounded text-sm mb-1 ${dayData.holiday ? "bg-red-500 text-white" : "bg-gray-100"}`} onClick={() => toggleMiniHoliday(dayStr)}>
                      {format(day, "d")}
                    </button>
                    <Input type="text" value={dayData.note} onChange={(e) => updateMiniNote(dayStr, e.target.value)} placeholder="Note" className="text-xs p-1 w-full" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><CardTitle className="text-2xl font-bold">Student List</CardTitle><CardDescription>Select students who are attending today's session</CardDescription></div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={markAllPresent} className="rounded-xl border-2 hover:bg-green-50 hover:border-green-200 hover:text-green-600">Mark All Present</Button>
              <Button variant="outline" size="sm" onClick={markAllAbsent} className="rounded-xl border-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600">Mark All Absent</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents && filteredStudents.length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => (
                <div key={student.id} className={cn("rounded-2xl border-2 p-5 transition-all duration-300 group", attendance[student.id]?.present ? "border-primary/20 bg-primary/5 shadow-soft" : "border-transparent bg-muted/30")}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={cn("p-2 rounded-xl", attendance[student.id]?.present ? "bg-primary text-primary-foreground shadow-medium" : "bg-muted text-muted-foreground")}><Users className="h-5 w-5" /></div>
                      <div className="flex flex-col"><Label htmlFor={student.id} className="cursor-pointer font-bold text-lg leading-tight">{student.name}</Label><Badge variant="outline" className="w-fit mt-1 h-5 text-[10px]">{student.grade}</Badge></div>
                    </div>
                    <Checkbox id={student.id} checked={attendance[student.id]?.present || false} onCheckedChange={() => handleToggle(student.id)} className="h-6 w-6 rounded-lg" />
                  </div>
                  <div className="flex gap-4 ml-7">
                    <div className="flex-1"><Label className="text-xs text-muted-foreground">Time In</Label><Input type="time" value={attendance[student.id]?.timeIn || ""} onChange={(e) => handleTimeChange(student.id, "timeIn", e.target.value)} className="mt-1" /></div>
                    <div className="flex-1"><Label className="text-xs text-muted-foreground">Time Out</Label><Input type="time" value={attendance[student.id]?.timeOut || ""} onChange={(e) => handleTimeChange(student.id, "timeOut", e.target.value)} className="mt-1" /></div>
                  </div>
                </div>
              ))}
              </div>
              <Button type="submit" className="w-full h-14 text-lg font-bold shadow-strong rounded-2xl" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving Records...' : `Finalize Attendance (${selectedStudentsCount} Students)`}
              </Button>
            </form>
          ) : (
            <p className="text-center text-muted-foreground">No students registered yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
