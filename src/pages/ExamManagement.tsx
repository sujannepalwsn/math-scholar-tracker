import React, { useState } from "react";
import { BookOpen, Calendar, CheckCircle, Edit, GraduationCap, Plus, Save, Trash2, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn, safeFormatDate, getGrade } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

// Component for Marks Entry Grid
const MarksEntryGrid = ({ exam, centerId, user, queryClient }: { exam: any, centerId: string, user: any, queryClient: any }) => {
  const [marksData, setMarksData] = useState<Record<string, Record<string, string>>>({});

  const { data: entrySubjects = [] } = useQuery({
    queryKey: ["exam-subjects-entry", exam?.id, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!exam?.id) return [];
      let query = supabase
        .from("exam_subjects")
        .select("*")
        .eq("exam_id", exam.id);

      // If user is a teacher, filter subjects they are assigned to
      if (user?.role === 'teacher' && user?.teacher_id) {
        // Get teacher's own subject from teachers table
        const { data: teacherData } = await supabase
          .from("teachers")
          .select("subject")
          .eq("id", user.teacher_id)
          .single();

        // Get subjects from class routine for this teacher
        const { data: scheduleData } = await supabase
          .from("period_schedules")
          .select("subject")
          .eq("teacher_id", user.teacher_id);

        const teacherSubjects = new Set<string>();
        if (teacherData?.subject) teacherSubjects.add(teacherData.subject);
        scheduleData?.forEach(s => { if (s.subject) teacherSubjects.add(s.subject); });

        if (teacherSubjects.size > 0) {
          query = query.in("subject_name", Array.from(teacherSubjects));
        } else {
          // If no subjects assigned, they shouldn't see any subjects
          return [];
        }
      }

      const { data, error } = await query.order("subject_name");
      if (error) throw error;
      return data;
    },
    enabled: !!exam?.id,
  });

  const { data: entryStudents = [] } = useQuery({
    queryKey: ["students-for-exam", centerId, exam?.grade],
    queryFn: async () => {
      if (!centerId || !exam?.grade) return [];
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("center_id", centerId)
        .eq("grade", exam.grade)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!centerId && !!exam?.grade,
  });

  const { data: existingMarks = [] } = useQuery({
    queryKey: ["existing-marks", exam?.id],
    queryFn: async () => {
      if (!exam?.id) return [];
      const { data, error } = await supabase
        .from("exam_marks")
        .select("*")
        .eq("exam_id", exam.id);
      if (error) throw error;
      return data;
    },
    enabled: !!exam?.id,
  });

  React.useEffect(() => {
    if (existingMarks.length > 0) {
      const data: Record<string, Record<string, string>> = {};
      existingMarks.forEach((m: any) => {
        if (!data[m.student_id]) data[m.student_id] = {};
        data[m.student_id][m.exam_subject_id] = m.marks_obtained?.toString() || "";
      });
      setMarksData(data);
    }
  }, [existingMarks]);

  const saveMarks = useMutation({
    mutationFn: async () => {
      if (!centerId || !exam?.id) return;
      const records: any[] = [];
      Object.entries(marksData).forEach(([studentId, subjectMarks]) => {
        Object.entries(subjectMarks).forEach(([subjectId, marks]) => {
          if (marks !== "") {
            records.push({
              center_id: centerId,
              exam_id: exam.id,
              exam_subject_id: subjectId,
              student_id: studentId,
              marks_obtained: parseFloat(marks),
              entered_by: user?.id,
            });
          }
        });
      });
      if (records.length === 0) return;

      const { error } = await supabase
        .from("exam_marks")
        .upsert(records, { onConflict: "exam_id,exam_subject_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["existing-marks"] });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Marks saved successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleMarkChange = (studentId: string, subjectId: string, value: string) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectId]: value },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium">Marks Entry Grid - {exam?.name}</h4>
          <p className="text-xs text-muted-foreground">Entering marks for Grade {exam?.grade}</p>
        </div>
        <Button size="sm" onClick={() => saveMarks.mutate()} disabled={saveMarks.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save Marks
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Student</TableHead>
              {entrySubjects.length > 0 ? (
                entrySubjects.map((s: any) => (
                  <TableHead key={s.id} className="text-center min-w-[80px]">
                    {s.subject_name}
                    <div className="text-[10px] text-muted-foreground">({s.full_marks})</div>
                  </TableHead>
                ))
              ) : (
                <TableHead>No Subjects Assigned</TableHead>
              )}
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entryStudents.length > 0 ? (
              entryStudents.map((student: any) => {
                let totalObtained = 0;
                let totalFull = 0;
                let hasAnyMarks = false;

                entrySubjects.forEach((subj: any) => {
                  const m = marksData[student.id]?.[subj.id];
                  if (m !== undefined && m !== "") {
                    totalObtained += parseFloat(m);
                    totalFull += subj.full_marks;
                    hasAnyMarks = true;
                  }
                });

                const pct = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;

                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.name}
                      <div className="text-[10px] text-muted-foreground">Roll: {student.roll_number || "-"}</div>
                    </TableCell>
                    {entrySubjects.map((subj: any) => (
                      <TableCell key={subj.id} className="text-center">
                        <Input
                          type="number"
                          className="w-16 mx-auto h-8 text-center"
                          value={marksData[student.id]?.[subj.id] || ""}
                          onChange={(e) => handleMarkChange(student.id, subj.id, e.target.value)}
                        />
                      </TableCell>
                    ))}
                    {entrySubjects.length === 0 && <TableCell>-</TableCell>}
                    <TableCell className="text-center font-bold">
                      {hasAnyMarks ? `${totalObtained}/${totalFull}` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {hasAnyMarks ? (
                        <Badge variant={pct < 40 ? "destructive" : "default"}>{getGrade(pct)}</Badge>
                      ) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={entrySubjects.length + 3} className="h-24 text-center text-muted-foreground">
                  No students found for Grade {exam?.grade}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default function ExamManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const centerId = user?.center_id;

  // Fetch unique grades from students
  const { data: dynamicGrades = [] } = useQuery({
    queryKey: ["center-grades", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("students")
        .select("grade")
        .eq("center_id", centerId);
      if (error) throw error;
      const uniqueGrades = Array.from(new Set(data.map(s => s.grade).filter(Boolean))).sort();
      return uniqueGrades;
    },
    enabled: !!centerId,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    academic_year: "2025/2026",
    exam_date: "",
    status: "draft",
  });

  // Subject management for exam
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ subject_name: "", full_marks: "100", pass_marks: "40" });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["exams", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("*, exam_subjects(id), exam_marks(id)")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch total students for each grade to calculate completion
      const { data: studentCounts } = await supabase
        .from("students")
        .select("grade, id")
        .eq("center_id", centerId);

      const countsByGrade: Record<string, number> = {};
      studentCounts?.forEach(s => {
        if (s.grade) countsByGrade[s.grade] = (countsByGrade[s.grade] || 0) + 1;
      });

      return data.map(exam => {
        const totalSubjects = exam.exam_subjects?.length || 0;
        const totalStudents = countsByGrade[exam.grade] || 0;
        const expectedMarksCount = totalSubjects * totalStudents;
        const actualMarksCount = exam.exam_marks?.length || 0;

        return {
          ...exam,
          is_complete: expectedMarksCount > 0 && actualMarksCount >= expectedMarksCount
        };
      });
    },
    enabled: !!centerId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["exam-subjects", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase
        .from("exam_subjects")
        .select("*")
        .eq("exam_id", selectedExamId)
        .order("subject_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId,
  });

  const createExam = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        center_id: centerId!,
        created_by: user?.id,
        exam_date: data.exam_date || null,
      };
      if (editingExam) {
        const { error } = await supabase.from("exams").update(payload).eq("id", editingExam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exams").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success(editingExam ? "Exam updated" : "Exam created");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteExam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Exam deleted");
    },
  });

  const publishExam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").update({ status: "published" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Exam routine published!");
    },
  });

  const publishResults = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").update({ status: "results_published" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Exam results published! Marksheets are now available.");
    },
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || !centerId) return;
      const { error } = await supabase.from("exam_subjects").insert({
        exam_id: selectedExamId,
        center_id: centerId,
        subject_name: subjectForm.subject_name,
        full_marks: parseFloat(subjectForm.full_marks),
        pass_marks: parseFloat(subjectForm.pass_marks),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-subjects"] });
      setSubjectForm({ subject_name: "", full_marks: "100", pass_marks: "40" });
      toast.success("Subject added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSubject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-subjects"] });
      toast.success("Subject removed");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", grade: "", academic_year: "2025/2026", exam_date: "", status: "draft" });
    setEditingExam(null);
    setShowForm(false);
  };

  const handleEdit = (exam: any) => {
    setFormData({
      name: exam.name,
      grade: exam.grade,
      academic_year: exam.academic_year,
      exam_date: exam.exam_date || "",
      status: exam.status,
    });
    setEditingExam(exam);
    setShowForm(true);
  };

  const [marksExamId, setMarksExamId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Management" description="Create and manage exams, configure subjects" />

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Exam
        </Button>
      </div>

      {/* Exam Form Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExam ? "Edit Exam" : "Create Exam"}</DialogTitle>
            <DialogDescription>Fill in the exam details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exam Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. First Term Exam" />
            </div>
            <div>
              <Label>Grade</Label>
              <Select value={formData.grade} onValueChange={(v) => setFormData({ ...formData, grade: v })}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {dynamicGrades.length > 0 ? (
                    dynamicGrades.map(g => <SelectItem key={g} value={g!}>Grade {g}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>No active students found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} />
            </div>
            <div>
              <Label>Exam Date</Label>
              <Input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} />
            </div>
            <Button className="w-full" onClick={() => createExam.mutate(formData)} disabled={!formData.name || !formData.grade}>
              {editingExam ? "Update Exam" : "Create Exam"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subject Management Dialog */}
      <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Subjects</DialogTitle>
            <DialogDescription>Add subjects with marks structure</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Subject</Label>
                <Input value={subjectForm.subject_name} onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })} placeholder="Math" />
              </div>
              <div>
                <Label>Full Marks</Label>
                <Input type="number" value={subjectForm.full_marks} onChange={(e) => setSubjectForm({ ...subjectForm, full_marks: e.target.value })} />
              </div>
              <div>
                <Label>Pass Marks</Label>
                <Input type="number" value={subjectForm.pass_marks} onChange={(e) => setSubjectForm({ ...subjectForm, pass_marks: e.target.value })} />
              </div>
            </div>
            <Button onClick={() => addSubject.mutate()} disabled={!subjectForm.subject_name} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Subject
            </Button>
            {subjects.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Full Marks</TableHead>
                    <TableHead>Pass Marks</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.subject_name}</TableCell>
                      <TableCell>{s.full_marks}</TableCell>
                      <TableCell>{s.pass_marks}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => deleteSubject.mutate(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Marks Entry Dialog */}
      <Dialog open={!!marksExamId} onOpenChange={(v) => { if (!v) setMarksExamId(null); }}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Marks</DialogTitle>
            <DialogDescription>Input marks for each student and subject</DialogDescription>
          </DialogHeader>
          {marksExamId && (
            <MarksEntryGrid
              exam={exams.find((e: any) => e.id === marksExamId)}
              centerId={centerId!}
              user={user}
              queryClient={queryClient}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Exam List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : exams.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No exams created yet</CardContent></Card>
        ) : (
          exams.map((exam: any) => (
            <Card key={exam.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{exam.name}</h3>
                      <Badge variant={exam.status === "results_published" ? "default" : exam.status === "published" ? "outline" : "secondary"}>
                        {exam.status === "results_published" ? "Results Published" : exam.status === "published" ? "Routine Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Grade {exam.grade} • {exam.academic_year}
                      {exam.exam_date && ` • ${safeFormatDate(exam.exam_date, "MMM dd, yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedExamId(exam.id); setShowSubjectDialog(true); }}>
                      <BookOpen className="h-3 w-3 mr-1" /> Subjects
                    </Button>
                    {exam.status !== "results_published" && (
                      <Button variant="outline" size="sm" onClick={() => setMarksExamId(exam.id)}>
                        <Edit className="h-3 w-3 mr-1" /> Enter Marks
                      </Button>
                    )}
                    {exam.status === "draft" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(exam)}>
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => publishExam.mutate(exam.id)}>
                          <GraduationCap className="h-3 w-3 mr-1" /> Publish Routine
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteExam.mutate(exam.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {exam.status === "published" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => publishResults.mutate(exam.id)}
                        disabled={!exam.is_complete}
                        title={!exam.is_complete ? "All marks must be entered before publishing results" : ""}
                      >
                        <GraduationCap className="h-3 w-3 mr-1" /> Publish Results
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
