"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Clock } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
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

  // Load custom grades from localStorage on mount
  React.useEffect(() => {
    const savedGrades = localStorage.getItem(`custom_grades_${user?.center_id}`);
    if (savedGrades) {
      setCustomGrades(JSON.parse(savedGrades));
    }
  }, [user?.center_id]);

  // Combined grades list
  const allGrades = [...new Set([...DEFAULT_GRADES, ...customGrades])].sort();

  // Period form state
  const [periodNumber, setPeriodNumber] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Schedule form state
  const [scheduleGrade, setScheduleGrade] = useState("");
  const [schedulePeriodId, setSchedulePeriodId] = useState("");
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleSubject, setScheduleSubject] = useState("");
  const [scheduleTeacherId, setScheduleTeacherId] = useState("none");

  // Fetch class periods
  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ["class-periods", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("class_periods")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("is_active", true)
        .order("period_number");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["period-schedules", user?.center_id, selectedGrade],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("period_schedules")
        .select(`
          *,
          class_periods:class_period_id(*),
          teachers:teacher_id(id, name)
        `)
        .eq("center_id", user.center_id)
        .eq("grade", selectedGrade)
        .order("day_of_week");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-list", user?.center_id],
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

  // Period mutations
  const createPeriodMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error } = await supabase.from("class_periods").insert({
        center_id: user.center_id,
        period_number: parseInt(periodNumber),
        start_time: startTime,
        end_time: endTime,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-periods"] });
      toast.success("Period created successfully!");
      resetPeriodForm();
      setShowPeriodDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create period");
    },
  });

  const updatePeriodMutation = useMutation({
    mutationFn: async () => {
      if (!editingPeriod?.id) throw new Error("Period ID not found");
      const { error } = await supabase.from("class_periods").update({
        period_number: parseInt(periodNumber),
        start_time: startTime,
        end_time: endTime,
      }).eq("id", editingPeriod.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-periods"] });
      toast.success("Period updated successfully!");
      resetPeriodForm();
      setShowPeriodDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update period");
    },
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_periods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-periods"] });
      toast.success("Period deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete period");
    },
  });

  // Schedule mutations
  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      
      // Handle "weekdays" option - create for Mon-Fri (days 1-5)
      if (scheduleDay === "weekdays") {
        const weekdayNumbers = [1, 2, 3, 4, 5]; // Monday to Friday
        const scheduleEntries = weekdayNumbers.map(dayNum => ({
          center_id: user.center_id,
          class_period_id: schedulePeriodId,
          grade: scheduleGrade,
          day_of_week: dayNum,
          subject: scheduleSubject,
          teacher_id: scheduleTeacherId === "none" ? null : scheduleTeacherId || null,
        }));
        
        const { error } = await supabase.from("period_schedules").insert(scheduleEntries);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("period_schedules").insert({
          center_id: user.center_id,
          class_period_id: schedulePeriodId,
          grade: scheduleGrade,
          day_of_week: parseInt(scheduleDay),
          subject: scheduleSubject,
          teacher_id: scheduleTeacherId === "none" ? null : scheduleTeacherId || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      toast.success(scheduleDay === "weekdays" ? "Schedule created for all weekdays!" : "Schedule created successfully!");
      resetScheduleForm();
      setShowScheduleDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create schedule");
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!editingSchedule?.id) throw new Error("Schedule ID not found");
      const { error } = await supabase.from("period_schedules").update({
        class_period_id: schedulePeriodId,
        grade: scheduleGrade,
        day_of_week: parseInt(scheduleDay),
        subject: scheduleSubject,
        teacher_id: scheduleTeacherId === "none" ? null : scheduleTeacherId || null,
      }).eq("id", editingSchedule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      toast.success("Schedule updated successfully!");
      resetScheduleForm();
      setShowScheduleDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update schedule");
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("period_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      toast.success("Schedule deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete schedule");
    },
  });

  const resetPeriodForm = () => {
    setPeriodNumber("");
    setStartTime("");
    setEndTime("");
    setEditingPeriod(null);
  };

  const resetScheduleForm = () => {
    setScheduleGrade("");
    setSchedulePeriodId("");
    setScheduleDay("");
    setScheduleSubject("");
    setScheduleTeacherId("none");
    setEditingSchedule(null);
  };

  const handleEditPeriod = (period: any) => {
    setEditingPeriod(period);
    setPeriodNumber(period.period_number.toString());
    setStartTime(period.start_time);
    setEndTime(period.end_time);
    setShowPeriodDialog(true);
  };

  const handleEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule);
    setScheduleGrade(schedule.grade);
    setSchedulePeriodId(schedule.class_period_id);
    setScheduleDay(schedule.day_of_week.toString());
    setScheduleSubject(schedule.subject);
    setScheduleTeacherId(schedule.teacher_id || "none");
    setShowScheduleDialog(true);
  };

  const handlePeriodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPeriod) {
      updatePeriodMutation.mutate();
    } else {
      createPeriodMutation.mutate();
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchedule) {
      updateScheduleMutation.mutate();
    } else {
      createScheduleMutation.mutate();
    }
  };

  // Group schedules by day
  const schedulesByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    schedules: schedules.filter((s: any) => s.day_of_week === day.value)
      .sort((a: any, b: any) => a.class_periods?.period_number - b.class_periods?.period_number),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Class Routine</h1>
      </div>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList>
          <TabsTrigger value="schedule">Class Schedule</TabsTrigger>
          <TabsTrigger value="periods">Manage Periods</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label>Select Grade:</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allGrades.map(grade => (
                    <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={showAddGradeDialog} onOpenChange={setShowAddGradeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Grade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Grade</DialogTitle>
                    <DialogDescription>Enter a new grade to add to the list.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Grade Name</Label>
                      <Input 
                        value={newGrade} 
                        onChange={(e) => setNewGrade(e.target.value)} 
                        placeholder="e.g., 11, Nursery, KG"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddGradeDialog(false)}>Cancel</Button>
                      <Button 
                        onClick={() => {
                          if (newGrade.trim() && !allGrades.includes(newGrade.trim())) {
                            const updatedGrades = [...customGrades, newGrade.trim()];
                            setCustomGrades(updatedGrades);
                            localStorage.setItem(`custom_grades_${user?.center_id}`, JSON.stringify(updatedGrades));
                            setSelectedGrade(newGrade.trim());
                            toast.success(`Grade "${newGrade.trim()}" added!`);
                            setNewGrade("");
                            setShowAddGradeDialog(false);
                          } else if (allGrades.includes(newGrade.trim())) {
                            toast.error("Grade already exists");
                          }
                        }}
                        disabled={!newGrade.trim()}
                      >
                        Add Grade
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {/* Delete custom grades */}
              {customGrades.length > 0 && (
                <Select 
                  value="" 
                  onValueChange={(gradeToDelete) => {
                    if (gradeToDelete) {
                      const updatedGrades = customGrades.filter(g => g !== gradeToDelete);
                      setCustomGrades(updatedGrades);
                      localStorage.setItem(`custom_grades_${user?.center_id}`, JSON.stringify(updatedGrades));
                      if (selectedGrade === gradeToDelete) {
                        setSelectedGrade(DEFAULT_GRADES[0]);
                      }
                      toast.success(`Grade "${gradeToDelete}" removed!`);
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Delete Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {customGrades.map(grade => (
                      <SelectItem key={grade} value={grade}>
                        <Trash2 className="h-3 w-3 inline mr-1" /> {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Dialog open={showScheduleDialog} onOpenChange={(open) => {
              setShowScheduleDialog(open);
              if (!open) resetScheduleForm();
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Schedule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSchedule ? "Edit Schedule" : "Add Schedule"}</DialogTitle>
                  <DialogDescription>Add a class schedule entry. Use "Apply to Weekdays" to create the same schedule for Mon-Fri.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Grade *</Label>
                      <Select value={scheduleGrade} onValueChange={setScheduleGrade}>
                        <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          {allGrades.map(grade => (
                            <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Period *</Label>
                      <Select value={schedulePeriodId} onValueChange={setSchedulePeriodId}>
                        <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                        <SelectContent>
                          {periods.map((period: any) => (
                            <SelectItem key={period.id} value={period.id}>
                              Period {period.period_number} ({period.start_time} - {period.end_time})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Day *</Label>
                      <Select value={scheduleDay} onValueChange={setScheduleDay}>
                        <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekdays">All Weekdays (Mon-Fri)</SelectItem>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value.toString()}>{day.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Input value={scheduleSubject} onChange={(e) => setScheduleSubject(e.target.value)} placeholder="e.g., Mathematics" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Teacher</Label>
                    <Select value={scheduleTeacherId} onValueChange={setScheduleTeacherId}>
                      <SelectTrigger><SelectValue placeholder="Select teacher (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No teacher assigned</SelectItem>
                        {teachers.map((teacher: any) => (
                          <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {scheduleDay === "weekdays" && (
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      This will create the same schedule for Monday through Friday.
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={!scheduleGrade || !schedulePeriodId || !scheduleDay || !scheduleSubject}>
                      {editingSchedule ? "Update" : scheduleDay === "weekdays" ? "Create for All Weekdays" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {schedulesLoading ? (
            <p>Loading schedule...</p>
          ) : (
            <div className="grid gap-4">
              {schedulesByDay.filter(d => d.schedules.length > 0 || d.value >= 1 && d.value <= 5).map(day => (
                <Card key={day.value}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg">{day.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {day.schedules.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No classes scheduled</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {day.schedules.map((schedule: any) => (
                            <TableRow key={schedule.id}>
                              <TableCell>Period {schedule.class_periods?.period_number}</TableCell>
                              <TableCell>{schedule.class_periods?.start_time} - {schedule.class_periods?.end_time}</TableCell>
                              <TableCell className="font-medium">{schedule.subject}</TableCell>
                              <TableCell>{schedule.teachers?.name || "-"}</TableCell>
                              <TableCell className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEditSchedule(schedule)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteScheduleMutation.mutate(schedule.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="periods" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showPeriodDialog} onOpenChange={(open) => {
              setShowPeriodDialog(open);
              if (!open) resetPeriodForm();
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Period</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPeriod ? "Edit Period" : "Add Period"}</DialogTitle>
                  <DialogDescription>Define a class period with start and end times.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePeriodSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Period Number *</Label>
                    <Input type="number" value={periodNumber} onChange={(e) => setPeriodNumber(e.target.value)} placeholder="e.g., 1" required min="1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time *</Label>
                      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time *</Label>
                      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowPeriodDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={!periodNumber || !startTime || !endTime}>
                      {editingPeriod ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Class Periods</CardTitle>
            </CardHeader>
            <CardContent>
              {periodsLoading ? (
                <p>Loading periods...</p>
              ) : periods.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No periods defined. Add periods first.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((period: any) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">Period {period.period_number}</TableCell>
                        <TableCell>{period.start_time}</TableCell>
                        <TableCell>{period.end_time}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditPeriod(period)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deletePeriodMutation.mutate(period.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
