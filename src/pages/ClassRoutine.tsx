"use client";
import React, { useState, useMemo, useEffect } from "react";
import { UserRole } from "@/types/roles";
import {
  CalendarIcon, Calendar, Clock, Edit, Plus, Trash2, Download,
  FileSpreadsheet, FileText, Printer, CheckCircle, XCircle,
  Upload, AlertCircle, Loader2, UserMinus, UserCheck, RefreshCw,
  BookOpen
} from "lucide-react";

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
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { hasActionPermission, hasPermission } from "@/utils/permissions";
import { logger } from "@/utils/logger";
import { useNavigate } from "react-router-dom";

// Sunday(0) to Friday(5) only
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const DEFAULT_GRADES = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export default function ClassRoutine() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Strict permission guard
  useEffect(() => {
    if (user && !hasPermission(user, 'class_routine', '/class-routine')) {
      navigate(user.role === UserRole.TEACHER ? '/teacher-dashboard' : '/dashboard');
    }
  }, [user, navigate]);

  if (user && !hasPermission(user, 'class_routine', '/class-routine')) {
    return null;
  }







  const canEdit = hasActionPermission(user, 'class_routine', 'edit');
  const today = new Date().toISOString().split("T")[0];

  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [selectedGrade, setSelectedGrade] = useState("8");
  const [customGrades, setCustomGrades] = useState<string[]>([]);
  const [newGrade, setNewGrade] = useState("");
  const [showAddGradeDialog, setShowAddGradeDialog] = useState(false);
  const [summaryDay, setSummaryDay] = useState<number>(new Date().getDay() === 6 ? 0 : new Date().getDay());

  // Substitution state
  const [selectedVacantClass, setSelectedVacantClass] = useState<any>(null);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<{total: number, success: number, failed: number} | null>(null);

  React.useEffect(() => {
    const savedGrades = localStorage.getItem(`custom_grades_${user?.center_id}`);
    if (savedGrades) setCustomGrades(JSON.parse(savedGrades));
  }, [user?.center_id]);

  const allGrades = useMemo(() => [...new Set([...DEFAULT_GRADES, ...customGrades])], [customGrades]);

  const [periodNumber, setPeriodNumber] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [subjectName, setSubjectName] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

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

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["period-schedules", user?.center_id, selectedGrade, isRestricted, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("period_schedules")
        .select(`*, class_periods:class_periods(*), teachers:teachers!period_schedules_teacher_id_fkey(id, name, expected_check_in, expected_check_out), substitute_teacher:teachers!period_schedules_substitute_teacher_id_fkey(id, name)`)
        .eq("center_id", user.center_id)
        .eq("grade", selectedGrade);

      if (isRestricted) {
        query = query.eq('teacher_id', user?.teacher_id);
      }

      const { data, error } = await query.order("day_of_week");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: allSchedules = [] } = useQuery({
    queryKey: ["all-period-schedules", user?.center_id, isRestricted, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("period_schedules")
        .select(`*, class_periods:class_periods(*), teachers:teachers!period_schedules_teacher_id_fkey(id, name, expected_check_in, expected_check_out), substitute_teacher:teachers!period_schedules_substitute_teacher_id_fkey(id, name)`)
        .eq("center_id", user.center_id);

      if (isRestricted) {
        query = query.eq('teacher_id', user?.teacher_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: registeredSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["registered-subjects", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("subjects").select("*").eq("center_id", user.center_id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-list", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("teachers").select("*").eq("center_id", user.center_id).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: teacherAttendance = [] } = useQuery({
    queryKey: ["teacher-attendance-routine", user?.center_id, today],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("teacher_attendance").select("*").eq("center_id", user.center_id).eq("date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: substitutions = [] } = useQuery({
    queryKey: ["class-substitutions-routine", user?.center_id, today],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("class_substitutions").select("*, substitute_teacher:teachers!substitute_teacher_id(name)").eq("center_id", user.center_id).eq("date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["approved-leaves-routine", user?.center_id, today],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("leave_applications")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const createSubjectMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to manage subjects.");
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error } = await supabase.from("subjects").insert({ center_id: user.center_id, name: subjectName });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["registered-subjects"] }); toast.success("Subject added!"); setSubjectName(""); setShowSubjectDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to add subject") });

  const updateSubjectMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to manage subjects.");
      if (!editingSubjectId) throw new Error("Subject ID not found");
      const { error } = await supabase.from("subjects").update({ name: subjectName }).eq("id", editingSubjectId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["registered-subjects"] }); toast.success("Subject updated!"); setSubjectName(""); setEditingSubjectId(null); setShowSubjectDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to update subject") });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to delete subjects.");
      const { error } = await supabase.from("subjects").delete().eq("id", id); if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["registered-subjects"] }); toast.success("Subject deleted!"); },
    onError: (error: any) => toast.error(error.message || "Failed to delete subject") });

  const createPeriodMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to manage slots.");
      if (!user?.center_id) throw new Error("Center ID not found");
      const { error } = await supabase.from("class_periods").insert({ center_id: user.center_id, period_number: parseInt(periodNumber), start_time: startTime, end_time: endTime });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["class-periods"] }); toast.success("Period created!"); resetPeriodForm(); setShowPeriodDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to create period") });

  const updatePeriodMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to manage slots.");
      if (!editingPeriod?.id) throw new Error("Period ID not found");
      const { error } = await supabase.from("class_periods").update({ period_number: parseInt(periodNumber), start_time: startTime, end_time: endTime }).eq("id", editingPeriod.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["class-periods"] }); toast.success("Period updated!"); resetPeriodForm(); setShowPeriodDialog(false); },
    onError: (error: any) => toast.error(error.message || "Failed to update period") });

  const deletePeriodMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to delete slots.");
      const { error } = await supabase.from("class_periods").delete().eq("id", id); if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["class-periods"] }); toast.success("Period deleted!"); },
    onError: (error: any) => toast.error(error.message || "Failed to delete period") });

  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to manage schedule.");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
      toast.success("Schedule created!");
      resetScheduleForm();
      setShowScheduleDialog(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to create schedule") });

  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to manage schedule.");
      if (!editingSchedule?.id) throw new Error("Schedule ID not found");
      const dayNum = parseInt(scheduleDay);
      if (isNaN(dayNum)) throw new Error("Invalid day selected");
      const { error } = await supabase.from("period_schedules").update({ class_period_id: schedulePeriodId, grade: scheduleGrade, day_of_week: dayNum, subject: scheduleSubject, teacher_id: scheduleTeacherId === "none" ? null : scheduleTeacherId || null }).eq("id", editingSchedule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
      toast.success("Schedule updated!");
      resetScheduleForm();
      setShowScheduleDialog(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to update schedule") });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to delete schedule.");
      const { error } = await supabase.from("period_schedules").delete().eq("id", id); if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
      toast.success("Schedule deleted!");
    },
    onError: (error: any) => toast.error(error.message || "Failed to delete schedule") });

  const publishRoutineMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to publish routine.");
      const { error } = await supabase.from("class_periods").update({ is_published: publish }).eq("center_id", user?.center_id);
      if (error) throw error;
    },
    onSuccess: (_, publish) => {
      queryClient.invalidateQueries({ queryKey: ["class-periods"] });
      toast.success(publish ? "Routine published!" : "Routine unpublished!");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const importRoutineMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to import routine.");
      if (!user?.center_id || importPreview.length === 0) return;

      if (importMode === "replace") {
        const { error: deleteError } = await supabase.from("period_schedules").delete().eq("center_id", user.center_id);
        if (deleteError) throw deleteError;
      }

      const entries = importPreview.map(p => ({
        center_id: user.center_id,
        class_period_id: p.class_period_id,
        grade: p.grade,
        day_of_week: p.day_of_week,
        subject: p.subject,
        teacher_id: p.teacher_id
      }));

      const { error } = await supabase.from("period_schedules").insert(entries);
      if (error) throw error;

      return entries.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["period-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["all-period-schedules"] });
      setImportResults({ total: importPreview.length, success: count || 0, failed: 0 });
      toast.success(`Successfully imported ${count} entries!`);
      setShowImportDialog(false);
      resetImport();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const assignSubstitutionMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to assign substitutions.");
      const { error } = await supabase.from('class_substitutions').insert({
        center_id: user?.center_id,
        period_schedule_id: selectedVacantClass.id,
        date: today,
        substitute_teacher_id: teacherId,
        original_teacher_id: selectedVacantClass.teacher_id || null,
        status: 'assigned'
      });
      if (error) throw error;

      // Notify substitute
      const subTeacher = teachers.find(t => t.id === teacherId);
      if (subTeacher?.user_id) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: subTeacher.user_id,
          center_id: user?.center_id,
          title: 'New Substitution Assigned',
          message: `You have been assigned to cover Grade ${selectedVacantClass.grade} ${selectedVacantClass.subject} today.`,
          type: 'info',
          link: '/teacher/class-routine'
        });
        if (notifError) logger.error("Notification error:", notifError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-substitutions-routine"] });
      toast.success("Substitution assigned!");
      setSelectedVacantClass(null);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const resetPeriodForm = () => { setPeriodNumber(""); setStartTime(""); setEndTime(""); setEditingPeriod(null); };
  const resetScheduleForm = () => { setScheduleGrade(""); setSchedulePeriodId(""); setScheduleDay(""); setScheduleSubject(""); setScheduleTeacherId("none"); setEditingSchedule(null); };
  const resetSubjectForm = () => { setSubjectName(""); setEditingSubjectId(null); };
  const resetImport = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportErrors([]);
    setImportResults(null);
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

    // Handle potential joined objects from Supabase (alias:column_name replaces the column with the object)
    const periodId = typeof schedule.class_period_id === 'object' ? schedule.class_period_id?.id : schedule.class_period_id;
    const teacherId = typeof schedule.teacher_id === 'object' ? schedule.teacher_id?.id : schedule.teacher_id;

    setSchedulePeriodId(periodId);
    setScheduleDay(schedule.day_of_week.toString());
    setScheduleSubject(schedule.subject);
    setScheduleTeacherId(teacherId || "none");
    setShowScheduleDialog(true);
  };

  const handleEditSubject = (subject: any) => {
    setEditingSubjectId(subject.id);
    setSubjectName(subject.name);
    setShowSubjectDialog(true);
  };

  const handlePeriodSubmit = (e: React.FormEvent) => { e.preventDefault(); editingPeriod ? updatePeriodMutation.mutate() : createPeriodMutation.mutate(); };
  const handleScheduleSubmit = (e: React.FormEvent) => { e.preventDefault(); editingSchedule ? updateScheduleMutation.mutate() : createScheduleMutation.mutate(); };
  const handleSubjectSubmit = (e: React.FormEvent) => { e.preventDefault(); editingSubjectId ? updateSubjectMutation.mutate() : createSubjectMutation.mutate(); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      return;
    }
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  };

  const processCSV = (text: string) => {
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return;
    if (lines.length > 2001) {
      toast.error("Maximum 2000 rows allowed");
      return;
    }

    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    const dataRows = lines.slice(1);

    const preview: any[] = [];
    const errors: string[] = [];
    const teacherAssignments: Record<string, Set<string>> = {}; // day-period -> set of teachers

    dataRows.forEach((row, index) => {
      const values = row.split(",").map(v => v.trim());
      const record: any = {};
      headers.forEach((h, i) => { record[h] = values[i]; });

      const rowNum = index + 2;

      // Basic Validation
      const required = ["day", "period", "start_time", "end_time", "grade", "subject", "teacher"];
      const missing = required.filter(r => !record[r]);
      if (missing.length > 0) {
        errors.push(`Row ${rowNum}: Missing fields (${missing.join(", ")})`);
        return;
      }

      // Day Validation
      const dayEntry = DAYS_OF_WEEK.find(d => d.label.toLowerCase() === record.day.toLowerCase());
      if (!dayEntry) {
        errors.push(`Row ${rowNum}: Invalid day "${record.day}"`);
        return;
      }

      // Period Validation
      const periodEntry = periods.find((p: any) =>
        p.period_number.toString() === record.period &&
        p.start_time === record.start_time &&
        p.end_time === record.end_time
      );
      if (!periodEntry) {
        errors.push(`Row ${rowNum}: Period ${record.period} with timing ${record.start_time}-${record.end_time} not found in configuration`);
        return;
      }

      // Teacher Validation
      const teacherEntry = teachers.find((t: any) => t.name.toLowerCase() === record.teacher.toLowerCase());
      if (record.teacher.toLowerCase() !== "n/a" && !teacherEntry) {
        errors.push(`Row ${rowNum}: Teacher "${record.teacher}" not found`);
        return;
      }

      // Conflict Validation
      const conflictKey = `${dayEntry.value}-${periodEntry.id}`;
      if (teacherEntry) {
        if (!teacherAssignments[conflictKey]) teacherAssignments[conflictKey] = new Set();
        if (teacherAssignments[conflictKey].has(teacherEntry.id)) {
          errors.push(`Row ${rowNum}: Teacher "${record.teacher}" already assigned in this period`);
          return;
        }
        teacherAssignments[conflictKey].add(teacherEntry.id);
      }

      preview.push({
        day_label: dayEntry.label,
        day_of_week: dayEntry.value,
        period_label: `Period ${periodEntry.period_number}`,
        class_period_id: periodEntry.id,
        grade: record.grade,
        subject: record.subject,
        teacher_name: record.teacher,
        teacher_id: teacherEntry?.id || null
      });
    });

    setImportPreview(preview);
    setImportErrors(errors);
  };

  const getStatus = (entry: any) => {
    if (!entry) return null;
    if (summaryDay !== new Date().getDay() && new Date().getDay() !== 6) return 'scheduled';

    const sub = substitutions.find((s: any) => s.period_schedule_id === entry.id);
    if (sub) return 'vacant-fulfilled';

    if (!entry.teacher_id) return 'vacant';

    // Check for approved leave
    const leave = approvedLeaves.find((l: any) => l.teacher_id === entry.teacher_id);
    if (leave) {
      // If it's a mid-day leave, check if this period falls within leave time
      if (leave.start_time && leave.end_time) {
        const [sh, sm] = (entry.class_periods?.start_time || "").split(':').map(Number);
        const [eh, em] = (entry.class_periods?.end_time || "").split(':').map(Number);
        const periodStart = sh * 60 + sm;
        const periodEnd = eh * 60 + em;

        const [lsh, lsm] = leave.start_time.split(':').map(Number);
        const [leh, lem] = leave.end_time.split(':').map(Number);
        const leaveStart = lsh * 60 + lsm;
        const leaveEnd = leh * 60 + lem;

        // If period overlaps with leave
        if (periodStart < leaveEnd && periodEnd > leaveStart) {
          return 'absent';
        }
      } else {
        return 'absent'; // Full day leave
      }
    }

    const att = teacherAttendance.find((a: any) => a.teacher_id === entry.teacher_id);
    if (att) {
      return att.status === 'present' ? 'present' : 'absent';
    }

    // Check if expected check-in has passed
    if (entry.teachers?.expected_check_in) {
      const [h, m] = entry.teachers.expected_check_in.split(':').map(Number);
      const cutoff = new Date(); cutoff.setHours(h, m, 0);
      if (new Date() > cutoff) return 'absent';
    }

    return 'scheduled';
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present': return 'bg-emerald-500';
      case 'absent': return 'bg-rose-500';
      case 'vacant': return 'bg-amber-500';
      case 'vacant-fulfilled': return 'bg-blue-500';
      default: return 'bg-slate-300';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'present': return 'Teacher Present';
      case 'absent': return 'Teacher Absent / On Leave';
      case 'vacant': return 'Vacant';
      case 'vacant-fulfilled': return 'Vacant Fulfilled';
      default: return 'Scheduled';
    }
  };

  const availableTeachers = useMemo(() => {
    if (!selectedVacantClass) return [];

    const presentTeachers = teacherAttendance
      .filter((a: any) => a.status === 'present')
      .map((a: any) => a.teacher_id);

    const busyTeachers = allSchedules
      .filter((s: any) => s.day_of_week === summaryDay && s.class_period_id === selectedVacantClass.class_period_id)
      .map((s: any) => s.teacher_id);

    const busyBySub = substitutions
      .filter((s: any) => {
        const ps = allSchedules.find(p => p.id === s.period_schedule_id);
        return ps?.class_period_id === selectedVacantClass.class_period_id;
      })
      .map((s: any) => s.substitute_teacher_id);

    return teachers.filter(t =>
      presentTeachers.includes(t.id) &&
      !busyTeachers.includes(t.id) &&
      !busyBySub.includes(t.id)
    );
  }, [selectedVacantClass, teacherAttendance, allSchedules, substitutions, teachers, summaryDay]);

  // Only show Sun-Fri
  const schedulesByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    schedules: schedules.filter((s: any) => s.day_of_week === day.value).sort((a: any, b: any) => a.class_periods?.period_number - b.class_periods?.period_number) }));

  const isAnyPeriodPublished = periods.some((p: any) => p.is_published);

  const exportToCSV = () => {
    const headers = ["Day", "Period", "Start Time", "End Time", "Grade", "Subject", "Teacher"];
    const rows = allSchedules.map((s: any) => [
      DAYS_OF_WEEK.find(d => d.value === s.day_of_week)?.label,
      s.class_periods?.period_number,
      s.class_periods?.start_time,
      s.class_periods?.end_time,
      s.grade,
      s.subject,
      s.teachers?.name || "N/A"
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `routine_full_${user?.center_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplate = () => {
    const headers = ["day", "period", "start_time", "end_time", "grade", "subject", "teacher"];
    const example = ["Monday", "1", "10:00", "10:40", "Grade 8", "English", "Joshna Nagarkoti"];
    const csvContent = [headers, example].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "routine_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printRoutine = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 print:space-y-0 print:p-0 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Clock className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Scheduling Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Institutional Routine Matrix</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={printRoutine}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          {canEdit && (
            <Button
              variant={isAnyPeriodPublished ? "destructive" : "default"}
              size="sm"
              onClick={() => publishRoutineMutation.mutate(!isAnyPeriodPublished)}
            >
              {isAnyPeriodPublished ? <XCircle className="h-4 w-4 mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              {isAnyPeriodPublished ? "Unpublish Routine" : "Publish Routine"}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="flex flex-nowrap w-full overflow-x-auto h-14 bg-card/40 backdrop-blur-md rounded-[2rem] p-1.5 border border-border/40 shadow-soft print:hidden custom-scrollbar">
          <TabsTrigger value="summary" className="rounded-[1.5rem] flex-1 min-w-[120px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Summary Table
          </TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-[1.5rem] flex-1 min-w-[120px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Schedule
          </TabsTrigger>
          <TabsTrigger value="periods" className="rounded-[1.5rem] flex-1 min-w-[120px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Slots
          </TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-[1.5rem] flex-1 min-w-[120px] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-medium flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all duration-300">
            Subjects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-black uppercase tracking-widest">Timetable Matrix</CardTitle>
              <div className="flex items-center gap-2 print:hidden">
                <Select value={summaryDay.toString()} onValueChange={(v) => setSummaryDay(parseInt(v))}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => (
                      <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="border-collapse border border-slate-200">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="border border-slate-200 bg-slate-50 font-black text-[10px] uppercase tracking-widest text-center min-w-[120px]">Period / Time</TableHead>
                      {allGrades.map(g => (
                        <TableHead key={g} className="border border-slate-200 bg-slate-50 font-black text-[10px] uppercase tracking-widest text-center min-w-[120px]">Grade {g}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell
                          className={cn(
                            "border border-slate-200 font-bold text-center text-xs py-4 transition-colors",
                            canEdit ? "cursor-pointer hover:bg-slate-50" : ""
                          )}
                          onClick={() => canEdit && handleEditPeriod(p)}
                        >
                          <div className="font-black text-primary">Period {p.period_number}</div>
                          <div className="text-[10px] text-muted-foreground">{p.start_time} - {p.end_time}</div>
                        </TableCell>
                        {allGrades.map(g => {
                          // In restricted mode, teachers can only see their own classes.
                          // However, we still show the grade columns.
                          // If there's no entry found because of the filter in allSchedules, it will show as vacant.
                          const entry = allSchedules.find((s: any) => {
                            const pid = typeof s.class_period_id === 'object' ? s.class_period_id?.id : s.class_period_id;
                            return (pid === p.id || s.class_periods?.id === p.id) &&
                                   s.grade === g &&
                                   s.day_of_week === summaryDay;
                          });
                          const status = getStatus(entry);
                          const sub = entry ? substitutions.find((s: any) => s.period_schedule_id === entry.id) : null;

                          return (
                            <TableCell
                              key={g}
                              className={cn(
                                "border border-slate-200 text-center p-2 min-h-[80px] transition-colors relative",
                                canEdit ? "cursor-pointer hover:bg-slate-50" : ""
                              )}
                              onClick={() => {
                                if (!canEdit) return;
                                if (entry) {
                                  handleEditSchedule(entry);
                                } else {
                                  resetScheduleForm();
                                  setScheduleGrade(g);
                                  setSchedulePeriodId(p.id);
                                  setScheduleDay(summaryDay.toString());
                                  setShowScheduleDialog(true);
                                }
                              }}
                            >
                              {entry ? (
                                <div className="space-y-1">
                                  <div className="font-black text-xs text-slate-800 uppercase tracking-tight leading-tight">{entry.subject}</div>
                                  <div className="text-[10px] font-medium text-slate-500 italic">
                                    {entry.substitute_teacher?.name ? (
                                      <span className="text-blue-600 font-bold">{entry.substitute_teacher.name} (Sub)</span>
                                    ) : (
                                      entry.teachers?.name || "Unassigned"
                                    )}
                                  </div>

                                  {status && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className={cn("h-1.5 w-1.5 rounded-full mx-auto mt-1", getStatusColor(status))} />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-[10px] font-bold uppercase">{getStatusLabel(status)}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}

                                  {sub && (
                                    <div className="mt-1 flex flex-col items-center">
                                      <div className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">Fulfilled By:</div>
                                      <div className="text-[9px] font-bold text-blue-800">{sub.substitute_teacher?.name}</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic opacity-30">Vacant</div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-6 flex flex-wrap gap-4 justify-center print:hidden">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Teacher Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Teacher Absent / Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Vacant</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Vacant Fulfilled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{allGrades.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
              </Select>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setShowAddGradeDialog(true)}><Plus className="h-4 w-4 mr-1" /> Grade</Button>
              )}
            </div>

            {canEdit && (
              <Button size="sm" onClick={() => { resetScheduleForm(); setShowScheduleDialog(true); }}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
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
                              {(schedule.teachers?.name || schedule.substitute_teacher?.name) && (
                                <div className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                                  {schedule.substitute_teacher?.name ? (
                                    <span className="text-blue-600 font-bold">{schedule.substitute_teacher.name} (Sub)</span>
                                  ) : (
                                    schedule.teachers.name
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
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

        <TabsContent value="subjects" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end print:hidden">
              <Button onClick={() => setShowSubjectDialog(true)} className="rounded-xl shadow-strong font-black uppercase text-[10px] tracking-widest h-10 px-6">
                <Plus className="h-4 w-4 mr-2" /> Add Subject
              </Button>
            </div>
          )}

          <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <BookOpen className="h-6 w-6 text-primary" /> Curricular Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjectsLoading ? <p>Loading...</p> : registeredSubjects.length === 0 ? <p className="text-muted-foreground text-center py-4">No subjects defined.</p> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Name</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest print:hidden">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registeredSubjects.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-bold">{s.name}</TableCell>
                          <TableCell className="flex gap-1 print:hidden">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditSubject(s)}><Edit className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSubjectMutation.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
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

        <TabsContent value="periods" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end print:hidden">
              <Button onClick={() => setShowPeriodDialog(true)} className="rounded-xl shadow-strong font-black uppercase text-[10px] tracking-widest h-10 px-6">
                <Plus className="h-4 w-4 mr-2" /> Add Slot
              </Button>
            </div>
          )}

          <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <Clock className="h-6 w-6 text-primary" /> Time Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              {periodsLoading ? <p>Loading...</p> : periods.length === 0 ? <p className="text-muted-foreground text-center py-4">No periods defined.</p> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Period</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Start</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">End</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest print:hidden">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-bold">Period {p.period_number}</TableCell>
                          <TableCell className="text-sm font-medium">{p.start_time}</TableCell>
                          <TableCell className="text-sm font-medium">{p.end_time}</TableCell>
                          <TableCell>
                            <Badge variant={p.is_published ? "default" : "secondary"} className="text-[10px] font-black uppercase tracking-widest">
                              {p.is_published ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell className="flex gap-1 print:hidden">
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPeriod(p)}><Edit className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePeriodMutation.mutate(p.id)}><Trash2 className="h-3 w-3" /></Button>
                              </>
                            )}
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

      {/* Global Dialogs */}
      <Dialog open={showImportDialog} onOpenChange={(open) => { setShowImportDialog(open); if (!open) resetImport(); }}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Routine CSV</DialogTitle>
            <DialogDescription>Bulk upload class schedule from a CSV file (Max 2000 rows, 5MB).</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select CSV File</Label>
                <Input type="file" accept=".csv" onChange={handleFileUpload} />
              </div>
              <div className="space-y-2">
                <Label>Import Mode</Label>
                <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">Merge (Update existing & add new)</SelectItem>
                    <SelectItem value="replace">Replace (Delete all & import new)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription className="max-h-[150px] overflow-y-auto">
                  <ul className="list-disc pl-4">
                    {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label className="font-bold">Preview ({importPreview.length} records)</Label>
                <div className="rounded-md border max-h-[300px] overflow-y-auto">
                  <div className="overflow-x-auto">
  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Teacher</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{p.day_label}</TableCell>
                          <TableCell>{p.period_label}</TableCell>
                          <TableCell>{p.grade}</TableCell>
                          <TableCell>{p.subject}</TableCell>
                          <TableCell>{p.teacher_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
</div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
              <Button
                onClick={() => importRoutineMutation.mutate()}
                disabled={importPreview.length === 0 || importErrors.length > 0 || importRoutineMutation.isPending}
              >
                {importRoutineMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedVacantClass} onOpenChange={(open) => !open && setSelectedVacantClass(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl" aria-labelledby="vacant-fulfillment-title" aria-describedby="vacant-fulfillment-description">
          <DialogHeader>
            <DialogTitle id="vacant-fulfillment-title">Vacant Period Fulfilment</DialogTitle>
            <DialogDescription id="vacant-fulfillment-description">
              Assign a substitute for Grade {selectedVacantClass?.grade} {selectedVacantClass?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Available Teachers (Present & Free)</h4>
            <div className="border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
  <Table>
                <TableHeader className="bg-muted/5">
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Main Subject</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">No available teachers found.</TableCell>
                    </TableRow>
                  ) : (
                    availableTeachers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-bold">{t.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.subject}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => assignSubstitutionMutation.mutate(t.id)}>Assign</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddGradeDialog} onOpenChange={setShowAddGradeDialog}>
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

      <Dialog open={showScheduleDialog} onOpenChange={(open) => { setShowScheduleDialog(open); if (!open) resetScheduleForm(); }}>
        <DialogContent className="w-[95vw] sm:max-w-lg">
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
                <Select value={scheduleSubject || "none"} onValueChange={(v) => setScheduleSubject(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Subject</SelectItem>
                    {registeredSubjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                    {scheduleSubject && !registeredSubjects.some((s: any) => s.name === scheduleSubject) && (
                      <SelectItem key="legacy-subject" value={scheduleSubject}>{scheduleSubject}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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

      <Dialog open={showSubjectDialog} onOpenChange={(open) => { setShowSubjectDialog(open); if (!open) resetSubjectForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSubjectId ? "Edit Subject" : "Add Subject"}</DialogTitle><DialogDescription>Define a subject name.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubjectSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject Name *</Label>
              <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Mathematics" required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowSubjectDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!subjectName}>{editingSubjectId ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPeriodDialog} onOpenChange={(open) => { setShowPeriodDialog(open); if (!open) resetPeriodForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPeriod ? "Edit Slot" : "Add Slot"}</DialogTitle><DialogDescription>Define a class period time slot.</DialogDescription></DialogHeader>
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
  );
}
