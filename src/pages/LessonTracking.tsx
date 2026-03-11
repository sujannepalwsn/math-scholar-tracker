import React, { useEffect, useMemo, useState } from "react";
import { Book, BookOpen, CheckCircle, ChevronDown, ChevronUp, Clock, Edit, Eye, FileText, Plus, Star, Trash2, User, Users, XCircle } from "lucide-react";
import { cn } from "@/lib/utils"
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import EditStudentLessonRecord from "@/components/center/EditStudentLessonRecord"; // Import the new component

type LessonPlan = Tables<'lesson_plans'>;
type Student = Tables<'students'>;
type StudentChapter = Tables<'student_chapters'>;
type TestResult = Tables<'test_results'>;
type Test = Tables<'tests'>;
type Homework = Tables<'homework'>;
type StudentHomeworkRecord = Tables<'student_homework_records'>;

interface GroupedLessonRecord {
  lessonPlan: LessonPlan;
  students: (StudentChapter & { 
    students: Student; 
    recorded_by_teacher?: Tables<'teachers'>;
    linked_test_results?: (TestResult & { tests: Test })[]; // Added linked test results
    linked_homework_records?: (StudentHomeworkRecord & { homework: Homework })[]; // Added linked homework records
  })[];
}

export default function LessonTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State for recording new lessons
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState("none");
  const [generalLessonNotes, setGeneralLessonNotes] = useState(""); // Renamed from 'notes'
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStudent, setFilterStudent] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // State for editing individual student lesson records
  const [showEditStudentRecordDialog, setShowEditStudentRecordDialog] = useState(false);
  const [editingStudentChapterId, setEditingStudentChapterId] = useState<string | null>(null);

  const [bulkEvaluationSelected, setBulkEvaluationSelected] = useState<string[]>([]);
  const [bulkRating, setBulkRating] = useState<number>(5);
  const [bulkTeacherNotes, setBulkTeacherNotes] = useState("");

  const [showViewLessonDialog, setShowViewLessonDialog] = useState(false);
  const [viewingLessonGroup, setViewingLessonGroup] = useState<GroupedLessonRecord | null>(null);

  // Track which lesson plans have students shown
  const [showStudentsMap, setShowStudentsMap] = useState<{ [lessonPlanId: string]: boolean }>({});

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["students", user?.center_id],
    queryFn: async () => {
      let query = supabase.from("students").select("id, name, grade").order("name");
      if (user?.role !== "admin" && user?.center_id) {
        query = query.eq("center_id", user.center_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.center_id, // Ensure this is enabled for center users
  });

  // Fetch lesson plans for dropdown and listing
  const { data: lessonPlans = [] } = useQuery({
    queryKey: ["lesson-plans-for-tracking", user?.center_id, filterSubject, user?.teacher_id],
    queryFn: async () => {
      let query = supabase
        .from("lesson_plans")
        .select("id, subject, chapter, topic, grade, lesson_date, notes, lesson_file_url")
        .eq("center_id", user?.center_id!)
        .order("lesson_date", { ascending: false });

      if (filterSubject !== "all") query = query.eq("subject", filterSubject);

      if (user?.role === 'teacher') {
        query = query.eq('teacher_id', user.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id, // Ensure this is enabled for center users
  });

  // Fetch student_chapters (now linked to lesson_plans)
  const { data: studentLessonRecordsRaw = [] } = useQuery({
    queryKey: ["student-lesson-records", user?.center_id, filterSubject, filterStudent, filterGrade, user?.teacher_id],
    queryFn: async () => {
      let query = supabase
        .from("student_chapters")
        .select(`
          *,
          students(id, name, grade, center_id),
          lesson_plans(id, chapter, subject, topic, grade, lesson_date, lesson_file_url),
          recorded_by_teacher:recorded_by_teacher_id(name)
        `)
        .eq("students.center_id", user?.center_id!);

      if (filterStudent !== "all") query = query.eq("student_id", filterStudent);
      if (filterGrade !== "all") query = query.eq("students.grade", filterGrade);
      if (filterSubject !== "all") query = query.eq("lesson_plans.subject", filterSubject); // Filter by lesson plan subject

      if (user?.role === 'teacher') {
        query = query.eq('recorded_by_teacher_id', user.teacher_id);
      }

      const { data, error } = await query.order("completed_at", { ascending: false });
      if (error) throw error;

      // Filter out records where student or lesson_plan data might be missing
      return data?.filter((d: any) => d.students && d.lesson_plans) || [];
    },
    enabled: !!user?.center_id });

  // NEW: Fetch all test results for the center, including test details and linked lesson_plan_id
  const { data: allTestResults = [] } = useQuery({
    queryKey: ["all-test-results-for-lesson-tracking", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("test_results")
        .select(`
          id,
          student_id,
          marks_obtained,
          tests(id, name, subject, total_marks, lesson_plan_id)
        `) // Removed lesson_plans(chapter) as it's not directly on tests
        .eq("tests.center_id", user.center_id); // Ensure tests belong to the same center
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  // NEW: Fetch all student homework records for the center, including homework details and linked lesson_plan_id
  const { data: allHomeworkRecords = [] } = useQuery({
    queryKey: ["all-homework-records-for-lesson-tracking", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("student_homework_records")
        .select(`
          id,
          student_id,
          status,
          teacher_remarks,
          homework(id, title, subject, due_date, lesson_plan_id)
        `)
        .eq("homework.center_id", user.center_id); // Ensure homework belongs to the same center
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  // Group studentLessonRecords by lesson_plan
  const groupedLessonRecords: GroupedLessonRecord[] = useMemo(() => {
    const groups = new Map<string, GroupedLessonRecord>();

    studentLessonRecordsRaw.forEach((record: any) => {
      const lessonPlan = record.lesson_plans;
      if (!lessonPlan) {
        return;
      }

      if (!groups.has(lessonPlan.id)) {
        groups.set(lessonPlan.id, {
          lessonPlan: lessonPlan,
          students: [] });
      }
      
      // Filter relevant test results for this specific student and lesson plan
      const linkedTestResults = allTestResults.filter(tr => {
        const testLessonPlanId = (tr.tests as Test)?.lesson_plan_id;
        const recordStudentId = record.students?.id;
        const recordLessonPlanId = record.lesson_plan_id;

        const isStudentMatch = recordStudentId && tr.student_id === recordStudentId;
        const isLessonPlanMatch = recordLessonPlanId && testLessonPlanId === recordLessonPlanId;

        // console.log(`DEBUG: Checking test result ${tr.id} for student ${recordStudentId} (match: ${isStudentMatch}) and lesson plan ${recordLessonPlanId} (match: ${isLessonPlanMatch}). Test's LP ID: ${testLessonPlanId}`);
        return isStudentMatch && isLessonPlanMatch;
      });

      // Filter relevant homework records for this student and lesson plan
      const linkedHomeworkRecords = allHomeworkRecords.filter(hr => {
        const homeworkLessonPlanId = (hr.homework as Homework)?.lesson_plan_id;
        const recordStudentId = record.students?.id;
        const recordLessonPlanId = record.lesson_plan_id;

        const isStudentMatch = recordStudentId && hr.student_id === recordStudentId;
        const isLessonPlanMatch = recordLessonPlanId && homeworkLessonPlanId === recordLessonPlanId;

        // console.log(`DEBUG: Checking homework record ${hr.id} for student ${recordStudentId} (match: ${isStudentMatch}) and lesson plan ${recordLessonPlanId} (match: ${isLessonPlanMatch}). Homework's LP ID: ${homeworkLessonPlanId}`);
        return isStudentMatch && isLessonPlanMatch;
      });

      // console.log(`DEBUG: For lesson plan ${lessonPlan.id}, student ${record.students?.name}: Found ${linkedTestResults.length} linked tests and ${linkedHomeworkRecords.length} linked homeworks.`);

      groups.get(lessonPlan.id)?.students.push({
        ...record,
        linked_test_results: linkedTestResults,
        linked_homework_records: linkedHomeworkRecords });
    });

    return Array.from(groups.values());
  }, [studentLessonRecordsRaw, allTestResults, allHomeworkRecords]);


  // Fetch attendance for auto-selecting present students
  const { data: attendanceForDate = [] } = useQuery({
    queryKey: ["attendance-by-date", date, user?.center_id],
    queryFn: async () => {
      const studentIds = students.map((s: any) => s.id);
      if (!studentIds.length) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .in("student_id", studentIds)
        .eq("date", date);
      if (error) throw error;
      return data || [];
    },
    enabled: students.length > 0 && !!date });

  // Mutations
  const recordLessonMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || selectedLessonPlanId === "none" || selectedStudentIds.length === 0) {
        throw new Error("Select a lesson plan and at least one student.");
      }
      // Allow center users to record. If user.role is 'center', user.teacher_id will be null,
      // which is fine for the nullable recorded_by_teacher_id foreign key.
      // No explicit check for user.role === 'teacher' is needed here.

      const studentLessonRecordsToInsert = selectedStudentIds.map((studentId) => ({
        student_id: studentId,
        lesson_plan_id: selectedLessonPlanId,
        completed: true,
        completed_at: date,
        notes: generalLessonNotes || null, // Use generalLessonNotes
        recorded_by_teacher_id: user.teacher_id || null, // Set to null if not a teacher
      }));

      const { error: linkError } = await supabase.from("student_chapters").insert(studentLessonRecordsToInsert);
      if (linkError) throw linkError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-lesson-records"] });
      toast.success("Lesson recorded for selected students!");
      setSelectedStudentIds([]);
      setSelectedLessonPlanId("none");
      setGeneralLessonNotes(""); // Reset general notes
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record lesson");
    } });

  const deleteStudentLessonRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-lesson-records"] });
      toast.success("Student lesson record deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete student lesson record");
    } });

  const bulkEvaluateMutation = useMutation({
    mutationFn: async () => {
      if (bulkEvaluationSelected.length === 0) return;
      const { error } = await supabase
        .from("student_chapters")
        .update({
          evaluation_rating: bulkRating,
          teacher_notes: bulkTeacherNotes || null })
        .in("id", bulkEvaluationSelected);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-lesson-records"] });
      toast.success(`Evaluated ${bulkEvaluationSelected.length} students`);
      setBulkEvaluationSelected([]);
      setBulkTeacherNotes("");
    } });

  // Helpers
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const filteredStudentsForModal = useMemo(() => {
    return (students || []).filter((s: any) => (filterGrade === "all" ? true : s.grade === filterGrade));
  }, [students, filterGrade]);

  const selectAllStudents = () => {
    setSelectedStudentIds(filteredStudentsForModal.map((s: any) => s.id));
  };

  const presentStudentIdsForDate: string[] = useMemo(() => {
    return (attendanceForDate || [])
      .filter((a: any) => a.status === "present")
      .map((a: any) => a.student_id);
  }, [attendanceForDate]);

  useEffect(() => {
    if (!students) return;
    const currentFilteredIds = filteredStudentsForModal.map((s: any) => s.id);
    const autoSelect = presentStudentIdsForDate.filter((id) => currentFilteredIds.includes(id));
    setSelectedStudentIds(autoSelect);
  }, [filterGrade, date, attendanceForDate, students, filteredStudentsForModal]);

  const subjects = Array.from(new Set(lessonPlans.map((lp: any) => lp.subject).filter(Boolean)));
  const grades = Array.from(new Set(students.map((s: any) => s.grade).filter(Boolean)));

  const toggleShowStudents = (lessonPlanId: string) => {
    setShowStudentsMap((prev) => ({ ...prev, [lessonPlanId]: !prev[lessonPlanId] }));
  };

  const getRatingStars = (rating: number | null) => {
    if (rating === null) return "N/A";
    return Array(rating).fill("⭐").join("");
  };

  const getHomeworkStatusIcon = (status: StudentHomeworkRecord['status']) => {
    switch (status) {
      case 'completed':
      case 'checked':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'assigned':
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* HEADER + MODAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Instructional Pulse
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Monitor pedagogical execution and comprehension dynamics.</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-2xl shadow-strong h-12 px-6 text-sm font-black tracking-tight bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all duration-300">
              <Plus className="h-5 w-5 mr-2" />
              RECORD SESSION
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl" aria-labelledby="record-lesson-title" aria-describedby="record-lesson-description">
            <DialogHeader>
              <DialogTitle id="record-lesson-title" className="text-2xl font-black tracking-tight">Instructional Log: Session Entry</DialogTitle>
              <DialogDescription id="record-lesson-description" className="text-[10px] font-black uppercase tracking-widest text-primary">
                Finalizing pedagogical delivery data and cohort attendance.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Execution Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cohort Classification (Grade)</Label>
                  <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold">
                      <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/90 border-none rounded-2xl shadow-strong">
                      <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest">All Grades</SelectItem>
                      {grades.map((g) => <SelectItem key={g} value={g} className="font-black text-[10px] uppercase tracking-widest">Grade {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Strategy Blueprint (Lesson Plan) *</Label>
                <Select value={selectedLessonPlanId} onValueChange={setSelectedLessonPlanId}>
                  <SelectTrigger className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold">
                    <SelectValue placeholder="Identify teaching roadmap..." />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-card/90 border-none rounded-2xl shadow-strong">
                    <SelectItem value="none" className="font-black text-[10px] uppercase tracking-widest text-slate-400">Identify teaching roadmap...</SelectItem>
                    {lessonPlans.map((lp: any) => (
                      <SelectItem key={lp.id} value={lp.id} className="font-black text-[10px] uppercase tracking-widest">
                        {lp.subject} | {lp.chapter} - {lp.topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Session Observations</Label>
                <Textarea
                  value={generalLessonNotes}
                  onChange={(e) => setGeneralLessonNotes(e.target.value)}
                  rows={2}
                  placeholder="Record pedagogical delivery notes..."
                  className="rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cohort Attendance ({selectedStudentIds.length} Verified)</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={selectAllStudents} className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 text-primary">SELECT ALL</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudentIds([])} className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 text-slate-400">CLEAR</Button>
                  </div>
                </div>

                <div className="border-none bg-slate-50/50 rounded-2xl p-4 max-h-56 overflow-y-auto space-y-2 custom-scrollbar shadow-inner">
                  {filteredStudentsForModal.map((student: any) => {
                    const isPresent = presentStudentIdsForDate.includes(student.id);
                    return (
                      <div key={student.id} className={cn(
                        "flex items-center space-x-3 p-3 rounded-xl transition-all border border-transparent",
                        selectedStudentIds.includes(student.id) ? "bg-white shadow-soft border-primary/10" : "hover:bg-white/50"
                      )}>
                        <Checkbox
                          id={student.id}
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                          className="h-5 w-5 rounded-lg border-2 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label htmlFor={student.id} className="flex-1 text-xs font-black text-slate-700 cursor-pointer flex justify-between items-center">
                          {student.name}
                          <Badge variant="outline" className="text-[8px] font-black uppercase bg-primary/5 border-primary/10 text-primary">Grade {student.grade}</Badge>
                        </label>
                        {isPresent && (
                          <div className="flex items-center gap-1">
                             <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[8px] font-black text-emerald-600 uppercase">Verified Present</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredStudentsForModal.length === 0 && (
                    <div className="text-center py-8 space-y-2">
                       <Users className="h-8 w-8 text-slate-200 mx-auto" />
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No profiles discovered for this cohort.</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={() => recordLessonMutation.mutate()}
                disabled={selectedStudentIds.length === 0 || selectedLessonPlanId === "none" || recordLessonMutation.isPending}
                className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all active:scale-95 mt-4"
              >
                {recordLessonMutation.isPending ? "PROCESSING..." : `COMMIT LOG FOR ${selectedStudentIds.length} STUDENTS`}
              </Button>
            </div>
</DialogContent>
        </Dialog>
      </div>

      {/* LESSON RECORDS LIST */}
      <Card className="border-none shadow-medium bg-card/60 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/30 p-8">
        <div className="flex flex-wrap gap-6">
            {/* Filters */}
            <div className="flex-1 min-w-[150px]">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Subject</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Student</Label>
              <Select value={filterStudent} onValueChange={setFilterStudent}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Grade</Label>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
      </Card>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            Instructional History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted/10">
                  <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Details</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Cohort Size</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedLessonRecords.map((group) => (
                  <React.Fragment key={group.lessonPlan.id}>
                    <TableRow className="group border-muted/5 hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => toggleShowStudents(group.lessonPlan.id)}>
                      <TableCell className="pl-6 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground/90 leading-none">{group.lessonPlan.chapter}</p>
                          <p className="text-xs text-muted-foreground italic">{group.lessonPlan.topic}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                             <Clock className="h-3 w-3" />
                             {format(new Date(group.lessonPlan.lesson_date), "MMM d, yyyy")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {group.lessonPlan.subject}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">
                            <Users className="h-3 w-3" />
                            {group.students.length}
                         </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                         <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10"
                             onClick={() => {
                               setViewingLessonGroup(group);
                               setShowViewLessonDialog(true);
                             }}
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             className={cn(
                               "h-8 w-8 rounded-xl bg-white shadow-soft transition-all",
                               showStudentsMap[group.lessonPlan.id] ? "bg-primary text-white rotate-180" : "text-slate-600"
                             )}
                             onClick={() => toggleShowStudents(group.lessonPlan.id)}
                           >
                             <ChevronDown className="h-4 w-4" />
                           </Button>
                         </div>
                      </TableCell>
                    </TableRow>

                {showStudentsMap[group.lessonPlan.id] && (
                  <TableRow className="bg-muted/5 border-none hover:bg-muted/5">
                    <TableCell colSpan={4} className="p-6">
                       <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Cohort Participation Matrix</h4>
                       <span className="text-[10px] font-bold text-primary">{group.students.length} Students Logged</span>
                    </div>

                    {/* Bulk Evaluation Section */}
                    <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 space-y-4 mx-2">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600"><Star className="h-4 w-4" /></div>
                          <h4 className="text-sm font-black uppercase tracking-widest">Bulk Evaluation Portal</h4>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-bold uppercase ml-1">Assign Rating</Label>
                             <Select value={bulkRating.toString()} onValueChange={(v) => setBulkRating(parseInt(v))}>
                                <SelectTrigger className="bg-white rounded-xl h-10 shadow-sm border-none"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                   {[1, 2, 3, 4, 5].map(r => <SelectItem key={r} value={r.toString()}>{r} Stars</SelectItem>)}
                                </SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-bold uppercase ml-1">Shared Remarks</Label>
                             <Input
                                placeholder="Excellent participation!"
                                value={bulkTeacherNotes}
                                onChange={e => setBulkTeacherNotes(e.target.value)}
                                className="bg-white rounded-xl h-10 shadow-sm border-none"
                             />
                          </div>
                          <Button
                            onClick={() => bulkEvaluateMutation.mutate()}
                            disabled={bulkEvaluationSelected.length === 0 || bulkEvaluateMutation.isPending}
                            className="rounded-xl h-10 font-bold bg-amber-500 hover:bg-amber-600"
                          >
                            Rate {bulkEvaluationSelected.length} Students
                          </Button>
                       </div>
                    </div>

                    <div className="overflow-x-auto border border-border/40 rounded-2xl bg-white/20 backdrop-blur-sm">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-muted/10">
                            <TableHead className="w-[50px] text-center">
                               <Checkbox
                                 checked={bulkEvaluationSelected.length === group.students.length}
                                 onCheckedChange={(checked) => {
                                   if (checked) setBulkEvaluationSelected(group.students.map(s => s.id));
                                   else setBulkEvaluationSelected([]);
                                 }}
                               />
                            </TableHead>
                            <TableHead className="pl-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rating & Remarks</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Academic Links</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.students.map((record) => (
                            <TableRow key={record.id} className="group/row border-muted/5 hover:bg-card/40 transition-colors">
                              <TableCell className="text-center">
                                 <Checkbox
                                   checked={bulkEvaluationSelected.includes(record.id)}
                                   onCheckedChange={(checked) => {
                                     if (checked) setBulkEvaluationSelected(prev => [...prev, record.id]);
                                     else setBulkEvaluationSelected(prev => prev.filter(id => id !== record.id));
                                   }}
                                 />
                              </TableCell>
                              <TableCell className="pl-2 py-4">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-700 leading-none">{record.students?.name}</p>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Grade {record.students?.grade}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1.5 min-w-[200px]">
                                  {record.evaluation_rating && (
                                    <Badge className="bg-yellow-500/10 text-yellow-700 border-none rounded-lg px-2 py-0.5 text-[9px] font-black">
                                      <Star className="h-2.5 w-2.5 mr-1 fill-yellow-500" />
                                      {record.evaluation_rating}/5
                                    </Badge>
                                  )}
                                  {record.teacher_notes && (
                                    <p className="text-[11px] text-slate-600 italic line-clamp-1">"{record.teacher_notes}"</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5">
                                  {record.linked_test_results?.map(tr => (
                                    <Badge key={tr.id} variant="outline" className="bg-primary/5 border-primary/10 text-primary text-[8px] font-black uppercase">
                                      {tr.marks_obtained}/{tr.tests?.total_marks}
                                    </Badge>
                                  ))}
                                  {record.linked_homework_records?.map(hr => (
                                    <Badge key={hr.id} variant="outline" className="bg-orange-500/5 border-orange-500/10 text-orange-600 text-[8px] font-black uppercase">
                                      {hr.status}
                                    </Badge>
                                  ))}
                                  {!record.linked_test_results?.length && !record.linked_homework_records?.length && (
                                    <span className="text-[10px] text-slate-400 font-bold">NONE</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex justify-end gap-1 opacity-0 group-row:opacity-100 group-hover/row:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10"
                                    onClick={() => {
                                      setEditingStudentChapterId(record.id);
                                      setShowEditStudentRecordDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive hover:bg-destructive/10"
                                    onClick={() => deleteStudentLessonRecordMutation.mutate(record.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {groupedLessonRecords.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground italic font-medium">No instructional history recorded yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Lesson Dialog */}
      <Dialog open={showViewLessonDialog} onOpenChange={setShowViewLessonDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Instructional Audit: Performance Matrix</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary">Complete log of student performance and academic linkage for this session.</DialogDescription>
          </DialogHeader>
          {viewingLessonGroup && (
            <div className="space-y-8 py-6">
              <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-inner space-y-3 relative overflow-hidden group/header">
                <div className="absolute top-0 right-0 p-4">
                   <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Session Archive
                   </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-2xl text-slate-800">{viewingLessonGroup.lessonPlan.subject}</h3>
                  <p className="font-black text-primary uppercase tracking-widest text-sm">{viewingLessonGroup.lessonPlan.chapter}</p>
                </div>
                <p className="font-bold text-slate-500 italic text-sm">{viewingLessonGroup.lessonPlan.topic}</p>
                <div className="flex gap-4 pt-2">
                  <div className="flex items-center gap-1.5 bg-white shadow-soft px-3 py-1 rounded-lg">
                    <Calendar className="h-3 w-3 text-violet-600" />
                    <span className="text-[10px] font-black text-slate-600 uppercase">{format(new Date(viewingLessonGroup.lessonPlan.lesson_date), "MMM d, yyyy")}</span>
                  </div>
                  {viewingLessonGroup.lessonPlan.grade && (
                    <div className="flex items-center gap-1.5 bg-white shadow-soft px-3 py-1 rounded-lg">
                      <GraduationCap className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-black text-slate-600 uppercase">Grade {viewingLessonGroup.lessonPlan.grade}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                     <Users className="h-4 w-4" /> Participation Matrix ({viewingLessonGroup.students.length} Profiles)
                   </h4>
                </div>
                <div className="grid gap-4">
                  {viewingLessonGroup.students.map((record) => (
                    <div key={record.id} className="border-none bg-white shadow-soft rounded-[2rem] p-6 space-y-6 transition-all hover:shadow-medium border border-slate-50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                             {record.students?.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-lg text-slate-700 leading-none">{record.students?.name}</p>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Profile: Grade {record.students?.grade}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {record.evaluation_rating && (
                            <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1.5 rounded-xl">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs font-black text-yellow-700">{record.evaluation_rating}/5</span>
                            </div>
                          )}
                          <Badge className={cn(
                            "rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none",
                            record.completed ? "bg-emerald-500" : "bg-amber-500"
                          )}>
                            {record.completed ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Faculty Observations</Label>
                          <div className="text-xs font-bold text-slate-600 bg-slate-50/50 p-4 rounded-2xl italic leading-relaxed shadow-inner">
                            "{record.teacher_notes || "No operational observations recorded for this profile."}"
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cross-Academic Integration</Label>
                          <div className="space-y-2">
                            {record.linked_test_results?.length ? (
                              <div className="space-y-1.5">
                                {record.linked_test_results.map(tr => (
                                  <div key={tr.id} className="flex justify-between items-center p-3 bg-primary/5 rounded-xl border border-primary/10">
                                    <span className="text-[10px] font-black uppercase text-primary/80 truncate max-w-[150px]">{tr.tests?.name}</span>
                                    <Badge className="bg-primary text-white text-[10px] font-black">{tr.marks_obtained}/{tr.tests?.total_marks}</Badge>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {record.linked_homework_records?.length ? (
                              <div className="space-y-1.5">
                                {record.linked_homework_records.map(hr => (
                                  <div key={hr.id} className="flex justify-between items-center p-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
                                    <span className="text-[10px] font-black uppercase text-orange-600/80 truncate max-w-[150px]">{hr.homework?.title}</span>
                                    <Badge className="bg-orange-500 text-white text-[10px] font-black uppercase">{hr.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {!record.linked_test_results?.length && !record.linked_homework_records?.length && (
                              <div className="text-center py-4 bg-slate-50/30 rounded-2xl border-2 border-dashed border-slate-100">
                                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Integrated Records</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Lesson Record Dialog */}
      <Dialog open={showEditStudentRecordDialog} onOpenChange={setShowEditStudentRecordDialog}>
        <DialogContent className="max-w-xl rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl" aria-labelledby="edit-student-lesson-record-title" aria-describedby="edit-student-lesson-record-description">
          <DialogHeader>
            <DialogTitle id="edit-student-lesson-record-title" className="text-2xl font-black tracking-tight">Profile Audit: Session Update</DialogTitle>
            <DialogDescription id="edit-student-lesson-record-description" className="text-[10px] font-black uppercase tracking-widest text-primary">
              Updating evaluation metrics and faculty observations for the selected profile.
            </DialogDescription>
          </DialogHeader>
          {editingStudentChapterId && (
            <EditStudentLessonRecord
              studentChapterId={editingStudentChapterId}
              onSave={() => setShowEditStudentRecordDialog(false)}
              onCancel={() => setShowEditStudentRecordDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
