"use client";
import React, { useState } from "react";
import { CalendarIcon, Clock, Edit, Plus, Trash2 } from "lucide-react";

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
  const queryClient = useQueryClient();
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [selectedGrade, setSelectedGrade] = useState("8");
  const [customGrades, setCustomGrades] = useState<string[]>([]);
  const [newGrade, setNewGrade] = useState("");
  const [showAddGradeDialog, setShowAddGradeDialog] = useState(false);

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
    queryKey: ["class-periods", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("class_periods").select("*").eq("center_id", user.center_id).eq("is_active", true).order("period_number");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["period-schedules", user?.center_id, selectedGrade, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("period_schedules").select(`*, class_periods:class_period_id(*), teachers:teacher_id(id, name)`).eq("center_id", user.center_id).eq("grade", selectedGrade);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq('teacher_id', user.teacher_id);
      }

      const { data, error } = await query.order("day_of_week");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-list", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("teachers").select("id, name").eq("center_id", user.center_id).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

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
      if (!editingPeriod?.id) throw new Error("Period ID not found");
      const { error } = await supabase.from("class_periods").update({ period_number: parseInt(periodNumber), start_time: startTime, end_time: endTime }).eq("id", editingPeriod.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["class-periods"] }); toast.success("Period updated!"); resetPeriodForm(); setShowPeriodDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to update period") });

  const deletePeriodMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("class_periods").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["class-periods"] }); toast.success("Period deleted!"); },
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
      if (!editingSchedule?.id) throw new Error("Schedule ID not found");
      const dayNum = parseInt(scheduleDay);
      if (isNaN(dayNum)) throw new Error("Invalid day selected");
      const { error } = await supabase.from("period_schedules").update({ class_period_id: schedulePeriodId, grade: scheduleGrade, day_of_week: dayNum, subject: scheduleSubject, teacher_id: scheduleTeacherId === "none" ? null : scheduleTeacherId || null }).eq("id", editingSchedule.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["period-schedules"] }); toast.success("Schedule updated!"); resetScheduleForm(); setShowScheduleDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to update schedule") });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("period_schedules").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["period-schedules"] }); toast.success("Schedule deleted!"); },
    onError: (error: any) => toast.error(error.message || "Failed to delete schedule") });

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
        <TabsList className="grid w-full grid-cols-2 h-14 bg-card/40 backdrop-blur-md rounded-[2rem] p-1.5 border border-border/40 shadow-soft">
          <TabsTrigger value="schedule" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Institutional Schedule
          </TabsTrigger>
          <TabsTrigger value="periods" className="rounded-[1.5rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Time Slots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
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

        <TabsContent value="periods" className="space-y-4">
          <div className="flex justify-end">
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
    </div>
  );
}
