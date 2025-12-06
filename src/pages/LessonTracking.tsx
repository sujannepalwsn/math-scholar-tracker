"use client";

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
import { Trash2, Users, Plus, ChevronDown, ChevronUp, BookOpen, Edit, Star, User, FileText, CheckCircle, XCircle, Clock, Book } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
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
    enabled: !!user?.center_id, // Ensure this is enabled for center users
  });

  // Fetch student_chapters (now linked to lesson_plans)
  const { data: studentLessonRecordsRaw = [] } = useQuery({
    queryKey: ["student-lesson-records", user?.center_id, filterSubject, filterStudent, filterGrade],
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

      const { data, error } = await query.order("completed_at", { ascending: false });
      if (error) throw error;

      // Filter out records where student or lesson_plan data might be missing
      return data?.filter((d: any) => d.students && d.lesson_plans) || [];
    },
    enabled: !!user?.center_id,
  });

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
    enabled: !!user?.center_id,
  });

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
    enabled: !!user?.center_id,
  });

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
          students: [],
        });
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
        linked_homework_records: linkedHomeworkRecords,
      });
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
    enabled: students.length > 0 && !!date,
  });

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
                    <SelectItem value="none">Choose a lesson plan...</SelectItem>
                    {lessonPlans.map((lp: any) => (
                      <SelectItem key={lp.id} value={lp.id}>
                        {lp.subject} - {lp.chapter} - {lp.topic} ({format(new Date(lp.lesson_date), "MMM d")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* GENERAL NOTES */}
              <div>
                <Label>General Notes for this session (Optional)</Label>
                <Textarea value={generalLessonNotes} onChange={(e) => setGeneralLessonNotes(e.target.value)} rows={2} placeholder="General observations for this teaching session" />
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
                disabled={selectedStudentIds.length === 0 || selectedLessonPlanId === "none" || recordLessonMutation.isPending}
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
                    {group.students.map((record) => {
                      return (
                        <div key={record.id} className="flex flex-col gap-2 p-2 bg-muted/20 rounded">
                          <div className="flex items-center justify-between">
                            <span>{record.students?.name} (Grade {record.students?.grade})</span>
                            <div className="flex items-center gap-2">
                              {record.teacher_notes && <span className="text-xs text-muted-foreground italic">"{record.teacher_notes}"</span>}
                              {record.evaluation_rating && (
                                <span className="text-xs flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /> {record.evaluation_rating}/5
                                </span>
                              )}
                              {record.recorded_by_teacher?.name && (
                                <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                  <User className="h-3 w-3" /> {record.recorded_by_teacher.name}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingStudentChapterId(record.id);
                                  setShowEditStudentRecordDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => deleteStudentLessonRecordMutation.mutate(record.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {/* Display relevant test results */}
                          {record.linked_test_results && record.linked_test_results.length > 0 && (
                            <div className="ml-4 text-sm text-muted-foreground">
                              <p className="font-semibold flex items-center gap-1"><FileText className="h-4 w-4" /> Associated Test Results:</p>
                              <ul className="list-disc list-inside">
                                {record.linked_test_results.map(tr => (
                                  <li key={tr.id}>
                                    {(tr.tests as Test)?.name}: {tr.marks_obtained}/{(tr.tests as Test)?.total_marks}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* Display relevant homework records */}
                          {record.linked_homework_records && record.linked_homework_records.length > 0 && (
                            <div className="ml-4 text-sm text-muted-foreground">
                              <p className="font-semibold flex items-center gap-1"><Book className="h-4 w-4" /> Associated Homework:</p>
                              <ul className="list-disc list-inside">
                                {record.linked_homework_records.map(hr => (
                                  <li key={hr.id} className="flex items-center gap-1">
                                    {getHomeworkStatusIcon(hr.status)} {(hr.homework as Homework)?.title} (Status: {hr.status})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {record.linked_test_results?.length === 0 && record.linked_homework_records?.length === 0 && (
                            <div className="ml-4 text-xs text-muted-foreground italic">
                              No linked tests or homework found for this student and lesson plan.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {groupedLessonRecords.length === 0 && <p className="text-sm text-muted-foreground">No lesson records found yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Edit Student Lesson Record Dialog */}
      <Dialog open={showEditStudentRecordDialog} onOpenChange={setShowEditStudentRecordDialog}>
        <DialogContent className="max-w-xl" aria-labelledby="edit-student-lesson-record-title" aria-describedby="edit-student-lesson-record-description">
          <DialogHeader>
            <DialogTitle id="edit-student-lesson-record-title">Edit Student Lesson Record</DialogTitle>
            <DialogDescription id="edit-student-lesson-record-description">
              Add or update evaluation notes and rating for this student's lesson.
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