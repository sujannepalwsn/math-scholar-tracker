import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Calendar, Edit, GraduationCap, Plus, Trash2, ListChecks, CheckCircle2, Info } from "lucide-react";
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
import { cn, safeFormatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function ExamManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const centerId = user?.center_id;

  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    grades: [] as string[],
    academic_year: "2025/2026",
    start_date: "",
    end_date: "",
    description: "",
    status: "draft",
  });

  // Subject management for exam
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState({ subject_name: "", full_marks: "100", pass_marks: "40" });

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["exams", centerId, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("exams")
        .select("*")
        .eq("center_id", centerId);

      if (user?.role === 'teacher' && user?.teacher_id) {
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user.teacher_id).eq('center_id', centerId);
        const assignedGrades = assignments?.map(a => a.grade) || [];
        const { data: subjectAssignments } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user.teacher_id).eq('center_id', centerId);
        const subjectGrades = subjectAssignments?.map(a => a.grade) || [];
        const allGrades = Array.from(new Set([...assignedGrades, ...subjectGrades]));
        if (allGrades.length > 0) {
          query = query.in('grade', allGrades);
        }
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["exam-subjects-management", selectedExamId, centerId],
    queryFn: async () => {
      if (!selectedExamId || !centerId) return [];
      const { data, error } = await supabase
        .from("exam_subjects")
        .select("*")
        .eq("exam_id", selectedExamId)
        .eq("center_id", centerId)
        .order("subject_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId && !!centerId,
  });

  const { data: routineSubjects = [] } = useQuery({
    queryKey: ["routine-subjects", centerId, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("period_schedules")
        .select("subject")
        .eq("center_id", centerId);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq("teacher_id", user.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return Array.from(new Set(data.map(d => d.subject))).sort();
    },
    enabled: !!centerId,
  });

  const createExam = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        grades: data.grades,
        academic_year: data.academic_year,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        description: data.description || null,
        status: data.status,
        center_id: centerId!,
        created_by: user?.id,
      };
      // Keep legacy fields for compatibility if necessary, though migration should handle it
      if (data.grades.length > 0) payload.grade = data.grades[0];
      if (data.start_date) payload.exam_date = data.start_date;

      if (editingExam) {
        const { error } = await supabase.from("exams").update(payload).eq("id", editingExam.id).eq("center_id", centerId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exams").insert(payload).eq('center_id', centerId);
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
      if (!centerId) return;
      const { error } = await supabase.from("exams").delete().eq("id", id).eq("center_id", centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Exam deleted");
    },
  });

  const publishExam = useMutation({
    mutationFn: async (id: string) => {
      if (!centerId) return;
      const { data: exam, error: fetchError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", id)
        .eq("center_id", centerId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase.from("exams").update({ status: "published" }).eq("id", id).eq("center_id", centerId);
      if (error) throw error;

      // Notify students/parents
      const { data: studentUsers } = await supabase
        .from("users")
        .select("id")
        .eq("center_id", centerId!)
        .in("role", ["student", "parent"])
        .eq("student_grade", exam.grade);

      if (studentUsers && studentUsers.length > 0) {
        const notifications = studentUsers.map(u => ({
          user_id: u.id,
          center_id: centerId!,
          title: "Exam Routine Published",
          message: `The routine for ${exam.name} has been published.`,
          type: "exam"
        }));
        await supabase.from("notifications").insert(notifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Exam routine published!");
    },
  });

  const publishResults = useMutation({
    mutationFn: async (exam: any) => {
      if (!centerId) return;
      // 1. Get subjects for this exam
      const { data: subjects, error: subjError } = await supabase
        .from("exam_subjects")
        .select("id")
        .eq("exam_id", exam.id)
        .eq("center_id", centerId);

      if (subjError) throw subjError;
      if (!subjects || subjects.length === 0) throw new Error("No subjects defined for this exam. Please add subjects first.");

      // 2. Get active students for this grade
      const { count: studentCount, error: studError } = await supabase
        .from("students")
        .select("*", { count: 'exact', head: true })
        .eq("center_id", centerId)
        .eq("grade", exam.grade)
        .eq("is_active", true);

      if (studError) throw studError;
      if (!studentCount || studentCount === 0) throw new Error("No active students found for this grade.");

      const expectedMarksCount = studentCount * subjects.length;

      // 3. Get entered marks count
      const { count: marksCount, error: marksError } = await supabase
        .from("exam_marks")
        .select("*", { count: 'exact', head: true })
        .eq("exam_id", exam.id)
        .eq("center_id", centerId);

      if (marksError) throw marksError;

      if ((marksCount || 0) < expectedMarksCount) {
        throw new Error(`Incomplete marks. Expected ${expectedMarksCount} marks (${studentCount} students × ${subjects.length} subjects), but only ${marksCount} entered.`);
      }

      const { error } = await supabase.from("exams").update({ status: "results_published" }).eq("id", exam.id).eq("center_id", centerId);
      if (error) throw error;

      // Notify students/parents
      const { data: studentUsers } = await supabase
        .from("users")
        .select("id")
        .eq("center_id", centerId)
        .in("role", ["student", "parent"])
        .eq("student_grade", exam.grade);

      if (studentUsers && studentUsers.length > 0) {
        const notifications = studentUsers.map(u => ({
          user_id: u.id,
          center_id: centerId,
          title: "Exam Results Published",
          message: `The results for ${exam.name} are now available.`,
          type: "marks"
        }));
        await supabase.from("notifications").insert(notifications);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Results published! Marksheets are now available in reports.");
    },
    onError: (err: any) => toast.error(err.message),
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
      if (!centerId) return;
      const { error } = await supabase.from("exam_subjects").delete().eq("id", id).eq("center_id", centerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-subjects"] });
      toast.success("Subject removed");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      grades: [],
      academic_year: "2025/2026",
      start_date: "",
      end_date: "",
      description: "",
      status: "draft"
    });
    setEditingExam(null);
    setShowForm(false);
  };

  const handleEdit = (exam: any) => {
    setFormData({
      name: exam.name,
      grades: exam.grades || (exam.grade ? [exam.grade] : []),
      academic_year: exam.academic_year,
      start_date: exam.start_date || exam.exam_date || "",
      end_date: exam.end_date || exam.exam_date || "",
      description: exam.description || "",
      status: exam.status,
    });
    setEditingExam(exam);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Management" description="Create and manage exams, configure subjects" />

      {user?.role === 'center' && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Exam
          </Button>
        </div>
      )}

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
            <div className="space-y-2">
              <Label>Applicable Grades (Multi-select)</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md max-h-32 overflow-y-auto">
                {grades.map(g => (
                  <Badge
                    key={g}
                    variant={formData.grades.includes(g) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const newGrades = formData.grades.includes(g)
                        ? formData.grades.filter(item => item !== g)
                        : [...formData.grades, g];
                      setFormData({ ...formData, grades: newGrades });
                    }}
                  >
                    Grade {g}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Exam instructions or details..." />
            </div>
            <Button className="w-full" onClick={() => createExam.mutate(formData)} disabled={!formData.name || formData.grades.length === 0}>
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
            {user?.role === 'center' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Subject</Label>
                    <Select value={subjectForm.subject_name} onValueChange={(v) => setSubjectForm({ ...subjectForm, subject_name: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {routineSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                <Button onClick={() => addSubject.mutate()} disabled={!subjectForm.subject_name || addSubject.isPending} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Subject
                </Button>
              </>
            )}
            {subjects.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Full Marks</TableHead>
                    <TableHead>Pass Marks</TableHead>
                    {user?.role === 'center' && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.subject_name}</TableCell>
                      <TableCell>{s.full_marks}</TableCell>
                      <TableCell>{s.pass_marks}</TableCell>
                      {user?.role === 'center' && (
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => deleteSubject.mutate(s.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
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
                      <Badge
                        variant={exam.status === "results_published" ? "default" : exam.status === "published" ? "secondary" : "outline"}
                        className={cn(
                          exam.status === "results_published" && "bg-blue-600 hover:bg-blue-700",
                          exam.status === "published" && "bg-background border-muted-foreground/30 text-foreground"
                        )}
                      >
                        {exam.status === "results_published" ? "Results Published" : exam.status === "published" ? "Routine Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Grades: {exam.grades?.join(", ") || exam.grade} • {exam.academic_year}
                      {exam.start_date && ` • ${safeFormatDate(exam.start_date, "MMM dd")} - ${safeFormatDate(exam.end_date, "MMM dd, yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedExamId(exam.id); setShowSubjectDialog(true); }}>
                      <Eye className="h-3 w-3 mr-1" /> View Subjects
                    </Button>

                    {user?.role === 'center' && exam.status === "draft" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(exam)}>
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => publishExam.mutate(exam.id)}>
                          <ListChecks className="h-3 w-3 mr-1" /> Publish Routine
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteExam.mutate(exam.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}

                    {exam.status === "published" && (
                      <>
                        {/* Teachers can still enter marks but the request says Read-Only access to Exams and Results.
                            However, requirement 11 says teachers must be able to enter exam marks for assigned subjects.
                            Let's keep Enter Marks for teachers if they are on published status. */}
                        <Button variant="outline" size="sm" onClick={() => navigate(user?.role === 'teacher' ? `/teacher/marks-entry?examId=${exam.id}` : `/marks-entry?examId=${exam.id}`)}>
                          <Edit className="h-3 w-3 mr-1" /> Enter Marks
                        </Button>
                        {user?.role === 'center' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => publishResults.mutate(exam)}
                            disabled={publishResults.isPending}
                          >
                            <GraduationCap className="h-3 w-3 mr-1" /> Publish Results
                          </Button>
                        )}
                      </>
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
