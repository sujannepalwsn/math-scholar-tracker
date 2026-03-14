"use client";
import React, { useState } from "react";
import { CalendarIcon, Clock, Edit, Plus, Trash2, FileDown, FileUp, UserCheck, AlertCircle, LayoutGrid } from "lucide-react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns";

// Sunday(0) to Friday(5) only
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const DEFAULT_GRADES = ["8", "9", "10"];

export default function ClassRoutine() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [selectedGrade, setSelectedGrade] = useState("8");
  const [customGrades, setCustomGrades] = useState<string[]>([]);
  const [newGrade, setNewGrade] = useState("");
  const [showAddGradeDialog, setShowAddGradeDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importCsv, setImportCsv] = useState("");

  const [selectedDaySummary, setSelectedDaySummary] = useState<number>(new Date().getDay() > 5 ? 0 : new Date().getDay());
  const [showSubstituteDialog, setShowSubstituteDialog] = useState(false);
  const [substitutionData, setSubstitutionData] = useState<any>(null);
  const [substituteTeacherId, setSubstituteTeacherId] = useState("");

  React.useEffect(() => {
    const savedGrades = localStorage.getItem(`custom_grades_${user?.center_id}`);
    if (savedGrades) setCustomGrades(JSON.parse(savedGrades));
  }, [user?.center_id]);

  const allGrades = [...new Set([...DEFAULT_GRADES, ...customGrades])].sort();

  const [periodNumber, setPeriodNumber] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [scheduleGrade, setScheduleGrade] = useState("");
  const [schedulePeriodId, setSchedulePeriodId] = useState("");
  const [scheduleDay, setScheduleDay] = useState<string>("");
  const [scheduleSubject, setScheduleSubject] = useState("");
  const [scheduleTeacherId, setScheduleTeacherId] = useState("none");

  const isValidDay = scheduleDay === "weekdays" || (scheduleDay !== "" && !isNaN(parseInt(scheduleDay)));

  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ["class-periods", user?.center_id, user?.role],
    queryFn: async () => {
      if (!user?.center_id && !isAdmin) return [];
      const { data, error } = await supabase
        .from("class_periods")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("is_active", true)
        .order("period_number");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id || isAdmin
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["period-schedules", user?.center_id, selectedGrade, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id && !isAdmin) return [];
      let query = supabase
        .from("period_schedules")
        .select(`*, class_periods:class_period_id(*), teachers!left(id, name)`)
        .eq("center_id", user.center_id)
        .eq("grade", selectedGrade);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq('teacher_id', user.teacher_id);
      }

      const { data, error } = await query.order("day_of_week");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id || isAdmin });

  const { data: allSchedules = [], isLoading: allSchedulesLoading } = useQuery({
    queryKey: ["all-period-schedules", user?.center_id, user?.role],
    queryFn: async () => {
      if (!user?.center_id && !isAdmin) return [];

      const { data: baseSchedules, error } = await supabase
        .from("period_schedules")
        .select(`*, class_periods:class_period_id(*), teachers!left(id, name)`)
        .eq("center_id", user.center_id)
        .order("day_of_week");
      if (error) throw error;

      // Also get substitutions for today
      const { data: substitutions } = await supabase
        .from("class_substitutions")
        .select("*, teachers:substitute_teacher_id(id, name)")
        .eq("center_id", user.center_id)
        .eq("date", format(new Date(), "yyyy-MM-dd"));

      return (baseSchedules || []).map(s => {
        const sub = substitutions?.find(sub => sub.period_schedule_id === s.id);
        return {
          ...s,
          substitution: sub ? { id: sub.id, teacher_id: sub.substitute_teacher_id, teacher_name: sub.teachers?.name } : null
        };
      });
    },
    enabled: !!user?.center_id || isAdmin
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-list", user?.center_id, user?.role],
    queryFn: async () => {
      if (!user?.center_id && !isAdmin) return [];
      let query = supabase.from("teachers").select("id, name");
      if (!isAdmin) query = query.eq("center_id", user.center_id);
      const { data, error } = await query.eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id || isAdmin });

  const createPeriodMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error } = await supabase.from("class_periods").insert({ center_id: user.center_id, period_number: parseInt(periodNumber), start_time: startTime, end_time: endTime });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["class-periods"] }); toast.success("Period created!"); resetPeriodForm(); setShowPeriodDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to create period") });

  const updatePeriodMutation = useMutation({
    mutationFn: async () => {
      if (!editingPeriod?.id || !user?.center_id) throw new Error("Period ID or Center ID not found");
      const { error } = await supabase.from("class_periods").update({ period_number: parseInt(periodNumber), start_time: startTime, end_time: endTime }).eq("id", editingPeriod.id).eq("center_id", user.center_id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["class-periods"] }); toast.success("Period updated!"); resetPeriodForm(); setShowPeriodDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to update period") });

  const deletePeriodMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.center_id) return;
      const { error } = await supabase.from("class_periods").delete().eq("id", id).eq("center_id", user.center_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
      toast.success("Schedule deleted!");
    },
    onError: (error: any) => toast.error(error.message || "Failed to delete period") });

  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      // Sunday to Friday weekdays = 0-5
      if (scheduleDay === "weekdays") {
        const weekdayNumbers = [0, 1, 2, 3, 4, 5]; // Sun-Fri
        const entries = weekdayNumbers.map(dayNum => ({
          center_id: user.center_id,
          class_period_id: schedulePeriodId,
          grade: scheduleGrade,
          day_of_week: dayNum,
          subject: scheduleSubject,
          teacher_id: scheduleTeacherId === "none" ? null : scheduleTeacherId || null }));
        const { error } = await supabase.from("period_schedules").insert(entries);
        if (error) throw error;
      } else {
        const dayNum = parseInt(scheduleDay);
        if (isNaN(dayNum)) throw new Error("Invalid day selected");
        const { error } = await supabase.from("period_schedules").insert({
          center_id: user.center_id,
          class_period_id: schedulePeriodId,
          grade: scheduleGrade,
          day_of_week: dayNum,
          subject: scheduleSubject,
          teacher_id: scheduleTeacherId === "none" ? null : scheduleTeacherId || null });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["period-schedules"] }); toast.success("Schedule created!"); resetScheduleForm(); setShowScheduleDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to create schedule") });

  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!editingSchedule?.id || !user?.center_id) throw new Error("Schedule ID or Center ID not found");
      const dayNum = parseInt(scheduleDay);
      if (isNaN(dayNum)) throw new Error("Invalid day selected");
      const { error } = await supabase.from("period_schedules").update({ class_period_id: schedulePeriodId, grade: scheduleGrade, day_of_week: dayNum, subject: scheduleSubject, teacher_id: scheduleTeacherId === "none" ? null : scheduleTeacherId || null }).eq("id", editingSchedule.id).eq("center_id", user.center_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
      toast.success("Schedule updated!"); resetScheduleForm(); setShowScheduleDialog(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to update schedule") });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.center_id) return;
      const { error } = await supabase.from("period_schedules").delete().eq("id", id).eq("center_id", user.center_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
      toast.success("Schedule deleted!");
    },
    onError: (error: any) => toast.error(error.message || "Failed to delete schedule") });

  const createSubstitutionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || !substitutionData || !substituteTeacherId) throw new Error("Missing data");
      const { error } = await supabase.from("class_substitutions").insert({
        center_id: user.center_id,
        period_schedule_id: substitutionData.session.id,
        substitute_teacher_id: substituteTeacherId,
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "Automated substitution assignment"
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
      toast.success("Substitution assigned!");
      setShowSubstituteDialog(false);
      setSubstitutionData(null);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const resetPeriodForm = () => { setPeriodNumber(""); setStartTime(""); setEndTime(""); setEditingPeriod(null); };
  const resetScheduleForm = () => { setScheduleGrade(""); setSchedulePeriodId(""); setScheduleDay(""); setScheduleSubject(""); setScheduleTeacherId("none"); setEditingSchedule(null); };

  const handleEditPeriod = (period: any) => { setEditingPeriod(period); setPeriodNumber(period.period_number.toString()); setStartTime(period.start_time); setEndTime(period.end_time); setShowPeriodDialog(true); };
  const handleEditSchedule = (schedule: any) => { setEditingSchedule(schedule); setScheduleGrade(schedule.grade); setSchedulePeriodId(schedule.class_period_id); setScheduleDay(schedule.day_of_week.toString()); setScheduleSubject(schedule.subject); setScheduleTeacherId(schedule.teacher_id || "none"); setShowScheduleDialog(true); };

  const handlePeriodSubmit = (e: React.FormEvent) => { e.preventDefault(); editingPeriod ? updatePeriodMutation.mutate() : createPeriodMutation.mutate(); };
  const handleScheduleSubmit = (e: React.FormEvent) => { e.preventDefault(); editingSchedule ? updateScheduleMutation.mutate() : createScheduleMutation.mutate(); };

  // Only show Sun-Fri
  const schedulesByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    schedules: schedules.filter((s: any) => s.day_of_week === day.value).sort((a: any, b: any) => a.class_periods?.period_number - b.class_periods?.period_number) }));

  const today = new Date().getDay();
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["teacher-attendance-today", user?.center_id, user?.role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("teacher_id, status")
        .eq("center_id", user?.center_id!)
        .eq("date", format(new Date(), "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id || isAdmin
  });

  const getTeacherStatus = (teacherId: string | null) => {
    if (!teacherId) return "vacant";
    const record = todayAttendance.find(a => a.teacher_id === teacherId);
    return record?.status || "present"; // Default to present if no attendance record yet
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Scheduling Matrix
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Define and manage institutional class routines.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-card/40 backdrop-blur-md rounded-[2rem] p-1.5 border border-border/40 shadow-soft">
          <TabsTrigger value="schedule" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Schedule View
          </TabsTrigger>
          <TabsTrigger value="summary" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Matrix Summary
          </TabsTrigger>
          <TabsTrigger value="periods" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Time Slots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const headers = ["Grade", "Day", "Period", "Subject", "Teacher"];
                const csv = [
                  headers.join(","),
                  ...schedules.map((s: any) => [
                    s.grade,
                    DAYS_OF_WEEK.find(d => d.value === s.day_of_week)?.label,
                    s.class_periods?.period_number,
                    s.subject,
                    s.teachers?.name || ""
                  ].join(","))
                ].join("\n");
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `routine_grade_${selectedGrade}.csv`;
                a.click();
              }}>
                <FileDown className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileUp className="h-4 w-4 mr-1" /> Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Routine CSV</DialogTitle>
                    <DialogDescription>
                      Paste CSV content. Format: Grade,Day,Period,Subject,TeacherName
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <Textarea
                      placeholder="8,Monday,1,Mathematics,John Doe"
                      className="min-h-[200px] font-mono text-xs"
                      value={importCsv}
                      onChange={(e) => setImportCsv(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
                      <Button onClick={async () => {
                        try {
                          const rows = importCsv.split("\n").filter(r => r.trim());
                          if (rows.length === 0) return;

                          const entries = [];
                          for (const row of rows) {
                            const [grade, dayStr, periodNum, subject, teacherName] = row.split(",").map(s => s?.trim());
                            if (!grade || !dayStr || !periodNum || !subject) continue;

                            const day = DAYS_OF_WEEK.find(d => d.label.toLowerCase() === dayStr.toLowerCase());
                            const period = periods.find(p => p.period_number === parseInt(periodNum));
                            const teacher = teachers.find(t => t.name.toLowerCase() === teacherName?.toLowerCase());

                            if (day && period) {
                              entries.push({
                                center_id: user?.center_id,
                                grade,
                                day_of_week: day.value,
                                class_period_id: period.id,
                                subject,
                                teacher_id: teacher?.id || null
                              });
                            }
                          }

                          if (entries.length > 0) {
                            const { error } = await supabase.from("period_schedules").insert(entries.map(e => ({ ...e, center_id: user?.center_id })));
                            if (error) throw error;
                            toast.success(`Imported ${entries.length} records!`);
                            queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
                            queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
                            setImportCsv("");
                            setShowImportDialog(false);
                          }
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}>Import</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{allGrades.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
              </Select>
              <Dialog open={showAddGradeDialog} onOpenChange={setShowAddGradeDialog}>
                <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Grade</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Grade</DialogTitle><DialogDescription>Enter a new grade name.</DialogDescription></DialogHeader>
                  <div className="space-y-4 py-2">
                    <Input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="e.g., 11, Nursery" />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddGradeDialog(false)}>Cancel</Button>
                      <Button onClick={() => {
                        if (newGrade.trim() && !allGrades.includes(newGrade.trim())) {
                          const updated = [...customGrades, newGrade.trim()];
                          setCustomGrades(updated);
                          localStorage.setItem(`custom_grades_${user?.center_id}`, JSON.stringify(updated));
                          setSelectedGrade(newGrade.trim());
                          toast.success(`Grade "${newGrade.trim()}" added!`);
                          setNewGrade(""); setShowAddGradeDialog(false);
                        }
                      }} disabled={!newGrade.trim()}>Add</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {user?.role === 'center' && (
            <Dialog open={showScheduleDialog} onOpenChange={(open) => { setShowScheduleDialog(open); if (!open) resetScheduleForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Schedule</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingSchedule ? "Edit Schedule" : "Add Schedule"}</DialogTitle><DialogDescription>Configure a class schedule entry.</DialogDescription></DialogHeader>
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Grade *</Label>
                      <Select value={scheduleGrade} onValueChange={setScheduleGrade}>
                        <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                        <SelectContent>{allGrades.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Period *</Label>
                      <Select value={schedulePeriodId} onValueChange={setSchedulePeriodId}>
                        <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
                        <SelectContent>{periods.map((p: any) => <SelectItem key={p.id} value={p.id}>Period {p.period_number} ({p.start_time}-{p.end_time})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Day *</Label>
                      <Select value={scheduleDay} onValueChange={setScheduleDay}>
                        <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekdays">All Days (Sun-Fri)</SelectItem>
                          {DAYS_OF_WEEK.map(day => <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Subject *</Label>
                      <Input value={scheduleSubject} onChange={(e) => setScheduleSubject(e.target.value)} placeholder="Mathematics" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Teacher (Optional)</Label>
                    <Select value={scheduleTeacherId} onValueChange={setScheduleTeacherId}>
                      <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No teacher</SelectItem>
                        {teachers.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={!scheduleGrade || !schedulePeriodId || !isValidDay || !scheduleSubject}>
                      {editingSchedule ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>

          {schedulesLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schedulesByDay.map(day => (
                <Card key={day.value} className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
                  <CardHeader className="border-b border-muted/20 bg-primary/5 py-4">
                    <CardTitle className="text-base font-black flex items-center gap-3 text-foreground/90 uppercase tracking-widest">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                      </div>
                      {day.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {day.schedules.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-40 italic text-pretty">No Sessions Programmed</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-muted/10">
                        {day.schedules.map((schedule: any) => (
                          <div key={schedule.id} className="group flex items-center justify-between p-4 transition-all duration-300 hover:bg-card/60">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="font-black text-foreground/90 text-sm group-hover:text-primary transition-colors truncate">{schedule.subject}</div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase">Slot {schedule.class_periods?.period_number}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{schedule.class_periods?.start_time} - {schedule.class_periods?.end_time}</span>
                              </div>
                              {schedule.teachers?.name && (
                                <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                                  {schedule.teachers.name}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-soft" onClick={() => handleEditSchedule(schedule)}>
                                <Edit className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-soft hover:bg-destructive/10" onClick={() => deleteScheduleMutation.mutate(schedule.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-4">
              <Select value={selectedDaySummary.toString()} onValueChange={(v) => setSelectedDaySummary(parseInt(v))}>
                <SelectTrigger className="w-[180px] h-9 bg-card/60 backdrop-blur-sm border-border/40 font-bold">
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              Live Matrix for {DAYS_OF_WEEK.find(d => d.value === selectedDaySummary)?.label}
            </div>
          </div>
          <Card className="border-none shadow-strong rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/20">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                Institutional Matrix Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-center border-r">Time Period</TableHead>
                      {allGrades.map(grade => (
                        <TableHead key={grade} className="text-center font-black uppercase text-[10px] tracking-widest min-w-[120px]">
                          Grade {grade}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map(period => (
                      <TableRow key={period.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="text-center border-r bg-muted/5">
                          <div className="font-black text-[10px] uppercase">Period {period.period_number}</div>
                          <div className="text-[9px] font-medium text-muted-foreground normal-case">{period.start_time}-{period.end_time}</div>
                        </TableCell>
                        {allGrades.map(grade => {
                          const session = allSchedules.find(s =>
                            s.grade === grade &&
                            s.class_period_id === period.id &&
                            s.day_of_week === selectedDaySummary
                          );

                          if (!session) {
                            return <TableCell key={grade} className="p-2 border-r last:border-r-0 text-center bg-slate-50/50 italic text-[10px] text-muted-foreground/30">Vacant</TableCell>;
                          }

                          const status = getTeacherStatus(session.teacher_id);
                          const isSubstituted = !!session.substitution;

                          const statusColors = {
                            present: "bg-emerald-500",
                            leave: "bg-amber-500",
                            absent: "bg-rose-500",
                            vacant: "bg-slate-300",
                            unknown: "bg-slate-300"
                          };

                          return (
                            <TableCell
                              key={grade}
                              className={cn(
                                "p-2 border-r last:border-r-0 text-center transition-all cursor-pointer",
                                (status === 'leave' || status === 'absent') && !isSubstituted && "bg-rose-50/50 animate-pulse"
                              )}
                              onClick={() => {
                                if (user?.role === 'center' && (status === 'leave' || status === 'absent') && !isSubstituted) {
                                  setSubstitutionData({ session, status });
                                  setShowSubstituteDialog(true);
                                }
                              }}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <div className="font-black text-[10px] uppercase truncate max-w-[100px]">{session.subject}</div>
                                <div className="flex items-center gap-1.5">
                                  <div className={`h-2 w-2 rounded-full ${statusColors[status as keyof typeof statusColors] || "bg-slate-300"}`} />
                                  <div className="text-[9px] font-medium text-muted-foreground truncate max-w-[80px]">
                                    {isSubstituted ? session.substitution.teacher_name : (session.teachers?.name || "No Teacher")}
                                  </div>
                                </div>
                                {isSubstituted && (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-1.5 py-0 text-[8px] font-black uppercase">Covered</Badge>
                                )}
                                {(status === 'leave' || status === 'absent') && !isSubstituted && (
                                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-1.5 py-0 text-[8px] font-black uppercase tracking-tighter">Substitute Needed</Badge>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-4 justify-center py-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
              <div className="h-3 w-3 rounded-full bg-emerald-500" /> Present
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
              <div className="h-3 w-3 rounded-full bg-amber-500" /> Leave
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
              <div className="h-3 w-3 rounded-full bg-rose-500" /> Absent
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
              <div className="h-3 w-3 rounded-full bg-slate-300" /> Vacant
            </div>
          </div>
        </TabsContent>

        <TabsContent value="periods" className="space-y-4">
          <div className="flex justify-end">
            {user?.role === 'center' && (
            <Dialog open={showPeriodDialog} onOpenChange={(open) => { setShowPeriodDialog(open); if (!open) resetPeriodForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Period</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingPeriod ? "Edit Period" : "Add Period"}</DialogTitle><DialogDescription>Define a class period.</DialogDescription></DialogHeader>
                <form onSubmit={handlePeriodSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Period Number *</Label>
                    <Input type="number" value={periodNumber} onChange={(e) => setPeriodNumber(e.target.value)} placeholder="1" required min="1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Start *</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></div>
                    <div className="space-y-1.5"><Label>End *</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowPeriodDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={!periodNumber || !startTime || !endTime}>{editingPeriod ? "Update" : "Create"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-4 w-4" /> Class Periods</CardTitle></CardHeader>
            <CardContent>
              {periodsLoading ? <p>Loading...</p> : periods.length === 0 ? <p className="text-muted-foreground text-center py-4">No periods defined.</p> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {periods.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">Period {p.period_number}</TableCell>
                          <TableCell>{p.start_time}</TableCell>
                          <TableCell>{p.end_time}</TableCell>
                          <TableCell className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPeriod(p)}><Edit className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePeriodMutation.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={showSubstituteDialog} onOpenChange={setShowSubstituteDialog}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Assign Substitute</DialogTitle>
            <DialogDescription className="font-medium text-rose-600">
              Teacher is currently {substitutionData?.status}. Assign coverage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
              <div className="flex justify-between">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Original Subject</span>
                <span className="text-sm font-bold">{substitutionData?.session?.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-black uppercase text-muted-foreground">Original Teacher</span>
                <span className="text-sm font-bold">{substitutionData?.session?.teachers?.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Suggested Leisure Teachers</Label>
              <Select value={substituteTeacherId} onValueChange={setSubstituteTeacherId}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="Select available teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.filter(t => {
                    // Filter teachers who are free this period/day
                    const isFree = !allSchedules.some(s =>
                      s.teacher_id === t.id &&
                      s.class_period_id === substitutionData?.session?.class_period_id &&
                      s.day_of_week === selectedDaySummary
                    );
                    return isFree;
                  }).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic px-2">Showing only teachers who do not have a scheduled class in this slot.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 rounded-xl font-bold" onClick={() => setShowSubstituteDialog(false)}>CANCEL</Button>
            <Button
              className="flex-1 rounded-xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 shadow-soft"
              onClick={() => createSubstitutionMutation.mutate()}
              disabled={!substituteTeacherId || createSubstitutionMutation.isPending}
            >
              {createSubstitutionMutation.isPending ? "ASSIGNING..." : "CONFIRM COVERAGE"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
