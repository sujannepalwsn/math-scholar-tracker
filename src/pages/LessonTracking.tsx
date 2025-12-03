import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Users, Plus, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

type LessonPlan = Tables<'lesson_plans'>;
type Student = Tables<'students'>;
type StudentChapter = Tables<'student_chapters'>;

interface GroupedLessonRecord {
  lessonPlan: LessonPlan;
  students: (StudentChapter & { students: Student })[];
}

export default function LessonTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState("none"); // Changed initial state to "none"
  const [notes, setNotes] = useState(""); // Notes for this specific teaching instance
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStudent, setFilterStudent] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
  });

  // Fetch lesson plans for dropdown and listing
  const { data: lessonPlans = [] } = useQuery({
    queryKey: ["lesson-plans-for-tracking", user?.center_id, filterSubject],
    queryFn: async () => {
      let query = supabase
        .from("lesson_plans")
        .select("id, subject, chapter, topic, grade, lesson_date, notes, lesson_file_url")
        .eq("center_id", user?.center_id!)
        .order("lesson_date", { ascending: false });

      if (filterSubject !== "all") query = query.eq("subject", filterSubject);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch student_chapters (now linked to lesson_plans)
  const { data: studentLessonRecordsRaw = [] } = useQuery({
    queryKey: ["student-lesson-records", user?.center_id, filterSubject, filterStudent, filterGrade],
    queryFn: async () => {
      let query = supabase
        .from("student_chapters")
        .select("*, students(id, name, grade, center_id), lesson_plans(id, chapter, subject, topic, grade, lesson_date, lesson_file_url)")
        .eq("students.center_id", user?.center_id!);

      if (filterStudent !== "all") query = query.eq("student_id", filterStudent);
      if (filterGrade !== "all") query = query.eq("students.grade", filterGrade);
      if (filterSubject !== "all") query = query.eq("lesson_plans.subject", filterSubject); // Filter by lesson plan subject

      const { data, error } = await query.order("date_completed", { ascending: false });
      if (error) throw error;

      return data;
    },
    enabled: !!user?.center_id,
  });

  // Group studentLessonRecords by lesson_plan
  const groupedLessonRecords: GroupedLessonRecord[] = useMemo(() => {
    const groups = new Map<string, GroupedLessonRecord>();

    studentLessonRecordsRaw.forEach((record: any) => {
      const lessonPlan = record.lesson_plans;
      if (!lessonPlan) return;

      if (!groups.has(lessonPlan.id)) {
        groups.set(lessonPlan.id, {
          lessonPlan: lessonPlan,
          students: [],
        });
      }
      groups.get(lessonPlan.id)?.students.push(record);
    });

    return Array.from(groups.values());
  }, [studentLessonRecordsRaw]);


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
    enabled: students.length > 0 && !!date,
  });

  // Mutations
  const recordLessonMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || selectedLessonPlanId === "none" || selectedStudentIds.length === 0) { // Updated check
        throw new Error("Select a lesson plan and at least one student.");
      }

      // Link lesson plan to selected students via student_chapters table
      const studentLessonRecordsToInsert = selectedStudentIds.map((studentId) => ({
        student_id: studentId,
        lesson_plan_id: selectedLessonPlanId,
        completed: true,
        completed_at: date,
        notes: notes || null,
      }));

      const { error: linkError } = await supabase.from("student_chapters").insert(studentLessonRecordsToInsert);
      if (linkError) throw linkError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-lesson-records"] });
      toast.success("Lesson recorded for selected students!");
      setSelectedStudentIds([]);
      setSelectedLessonPlanId("none"); // Reset to "none"
      setNotes("");
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record lesson");
    },
  });

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
    },
  });

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
      .filter((a: any) => a.status === "Present")
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

  return (
    <div className="space-y-6">
      {/* HEADER + MODAL */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lesson Tracking</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Record Lesson</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-labelledby="record-lesson-title" aria-describedby="record-lesson-description">
            <DialogHeader>
              <DialogTitle id="record-lesson-title">Record Lesson Taught</DialogTitle>
              <DialogDescription id="record-lesson-description">Select a lesson plan and students who attended</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* DATE */}
              <div>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              {/* SELECT LESSON PLAN */}
              <div className="space-y-3 border rounded-lg p-4">
                <Label className="text-base font-semibold">Select Lesson Plan *</Label>
                <Select value={selectedLessonPlanId} onValueChange={setSelectedLessonPlanId}>
                  <SelectTrigger><SelectValue placeholder="Choose a lesson plan..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose a lesson plan...</SelectItem> {/* Added placeholder item */}
                    {lessonPlans.map((lp: any) => (
                      <SelectItem key={lp.id} value={lp.id}>
                        {lp.subject} - {lp.chapter} - {lp.topic} ({format(new Date(lp.lesson_date), "MMM d")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* NOTES */}
              <div>
                <Label>Notes for this session (Optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Specific observations for this teaching session" />
              </div>

              {/* STUDENTS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Students ({selectedStudentIds.length} selected)</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllStudents}>Select All</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedStudentIds([])}>Clear</Button>
                  </div>
                </div>

                {/* Grade Filter */}
                <div className="mt-2">
                  <Label>Filter by Grade</Label>
                  <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger><SelectValue placeholder="All Grades" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Student List */}
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {filteredStudentsForModal.map((student: any) => {
                    const isPresent = presentStudentIdsForDate.includes(student.id);
                    return (
                      <div key={student.id} className={`flex items-center space-x-2 p-2 rounded ${isPresent ? "bg-green-50" : ""}`}>
                        <Checkbox
                          id={student.id}
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                        />
                        <label htmlFor={student.id} className="text-sm font-medium cursor-pointer">
                          {student.name} - Grade {student.grade}
                        </label>
                        {isPresent && <span className="ml-auto text-xs text-green-700">Present</span>}
                      </div>
                    );
                  })}
                  {filteredStudentsForModal.length === 0 && (
                    <p className="text-sm text-muted-foreground">No students found for selected grade.</p>
                  )}
                </div>
              </div>

              {/* RECORD BUTTON */}
              <Button
                onClick={() => recordLessonMutation.mutate()}
                disabled={selectedStudentIds.length === 0 || selectedLessonPlanId === "none" || recordLessonMutation.isPending} // Updated check
                className="w-full"
              >
                {recordLessonMutation.isPending ? "Recording..." : `Record Lesson for ${selectedStudentIds.length} Student(s)`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* LESSON RECORDS LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Student Lesson Records</CardTitle>
          <div className="flex gap-4 mt-4">
            {/* Filters */}
            <div className="flex-1">
              <Label>Filter by Subject</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Filter by Student</Label>
              <Select value={filterStudent} onValueChange={setFilterStudent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Filter by Grade</Label>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {groupedLessonRecords.map((group) => (
              <div key={group.lessonPlan.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {group.lessonPlan.subject}: {group.lessonPlan.chapter} - {group.lessonPlan.topic}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Taught on {format(new Date(group.lessonPlan.lesson_date), "PPP")} {group.lessonPlan.grade && `(Grade: ${group.lessonPlan.grade})`}
                    </p>
                    {group.lessonPlan.notes && <p className="text-sm">Lesson Notes: {group.lessonPlan.notes}</p>}
                    {group.lessonPlan.lesson_file_url && (
                      <Button variant="outline" size="sm" asChild className="mt-2">
                        <a href={supabase.storage.from("lesson-plan-files").getPublicUrl(group.lessonPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                          <BookOpen className="h-4 w-4 mr-1" /> Lesson File
                        </a>
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleShowStudents(group.lessonPlan.id)}
                  >
                    {showStudentsMap[group.lessonPlan.id] ? (
                      <ChevronUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    )}
                    {group.students.length} Students
                  </Button>
                </div>

                {showStudentsMap[group.lessonPlan.id] && (
                  <div className="mt-4 border-t pt-4 space-y-2">
                    <h4 className="font-semibold text-md">Students Attended:</h4>
                    {group.students.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                        <span>{record.students?.name} (Grade {record.students?.grade})</span>
                        <div className="flex items-center gap-2">
                          {record.notes && <span className="text-xs text-muted-foreground italic">"{record.notes}"</span>}
                          <Button variant="destructive" size="sm" onClick={() => deleteStudentLessonRecordMutation.mutate(record.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {groupedLessonRecords.length === 0 && <p className="text-sm text-muted-foreground">No lesson records found yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
