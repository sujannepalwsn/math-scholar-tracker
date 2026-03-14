import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Calendar, Edit, GraduationCap, Plus, Trash2, ListChecks, CheckCircle2, ChevronDown } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn, safeFormatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

const grades = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function ExamManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const centerId = user?.center_id;

  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    applicable_grades: [] as string[],
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
    queryKey: ["exams", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
        // Keep grade for backward compatibility if needed, using the first one or a summary
        grade: data.applicable_grades[0] || "",
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
    mutationFn: async (exam: any) => {
      // 1. Get subjects for this exam
      const { data: subjects, error: subjError } = await supabase
        .from("exam_subjects")
        .select("id")
        .eq("exam_id", exam.id);

      if (subjError) throw subjError;
      if (!subjects || subjects.length === 0) throw new Error("No subjects defined for this exam. Please add subjects first.");

      // 2. Get active students for all applicable grades
      const { count: studentCount, error: studError } = await supabase
        .from("students")
        .select("*", { count: 'exact', head: true })
        .eq("center_id", centerId!)
        .in("grade", exam.applicable_grades || [exam.grade])
        .eq("is_active", true);

      if (studError) throw studError;
      if (!studentCount || studentCount === 0) throw new Error("No active students found for the selected grades.");

      const expectedMarksCount = studentCount * subjects.length;

      // 3. Get entered marks count
      const { count: marksCount, error: marksError } = await supabase
        .from("exam_marks")
        .select("*", { count: 'exact', head: true })
        .eq("exam_id", exam.id);

      if (marksError) throw marksError;

      if ((marksCount || 0) < expectedMarksCount) {
        throw new Error(`Incomplete marks. Expected ${expectedMarksCount} marks (${studentCount} students × ${subjects.length} subjects), but only ${marksCount} entered.`);
      }

      const { error } = await supabase.from("exams").update({ status: "results_published" }).eq("id", exam.id);
      if (error) throw error;

      // Notify Parents/Students
      const { data: students, error: studError2 } = await supabase
        .from("students")
        .select("user_id")
        .eq("center_id", centerId!)
        .in("grade", exam.applicable_grades || [exam.grade])
        .eq("is_active", true);

      if (!studError2 && students) {
        const studentUserIds = students.map(s => s.user_id).filter(Boolean);
        if (studentUserIds.length > 0) {
          const notifications = studentUserIds.map(uid => ({
            user_id: uid,
            center_id: centerId!,
            title: "Exam Results Published",
            message: `Results for ${exam.name} are now available.`,
            type: "marks",
            link: "/parent-results"
          }));
          await supabase.from("notifications").insert(notifications);
        }
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
      const { error } = await supabase.from("exam_subjects").delete().eq("id", id);
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
      applicable_grades: [],
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
      applicable_grades: exam.applicable_grades || (exam.grade ? [exam.grade] : []),
      academic_year: exam.academic_year,
      start_date: exam.start_date || exam.exam_date || "",
      end_date: exam.end_date || exam.exam_date || "",
      description: exam.description || "",
      status: exam.status,
    });
    setEditingExam(exam);
    setShowForm(true);
  };

  const toggleGrade = (grade: string) => {
    setFormData(prev => {
      const current = prev.applicable_grades;
      if (current.includes(grade)) {
        return { ...prev, applicable_grades: current.filter(g => g !== grade) };
      } else {
        return { ...prev, applicable_grades: [...current, grade] };
      }
    });
  };

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
              <Label>Applicable Grades</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {formData.applicable_grades.length === 0
                      ? "Select grades"
                      : formData.applicable_grades.length === 1
                        ? `Grade ${formData.applicable_grades[0]}`
                        : `${formData.applicable_grades.length} grades selected`}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
                    {grades.map(g => (
                      <div key={g} className="flex items-center space-x-2 p-1 hover:bg-slate-100 rounded cursor-pointer" onClick={() => toggleGrade(g)}>
                        <Checkbox checked={formData.applicable_grades.includes(g)} onCheckedChange={() => toggleGrade(g)} />
                        <span className="text-sm font-medium">Grade {g}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Academic Year</Label>
              <Input value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Exam details..." />
            </div>
            <Button className="w-full" onClick={() => createExam.mutate(formData)} disabled={!formData.name || formData.applicable_grades.length === 0 || !formData.start_date || !formData.end_date}>
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
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Grades: {exam.applicable_grades?.join(", ") || exam.grade} • {exam.academic_year}
                      </p>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {exam.start_date ? (
                          <>
                            {safeFormatDate(exam.start_date, "MMM dd")} - {safeFormatDate(exam.end_date, "MMM dd, yyyy")}
                          </>
                        ) : (
                          exam.exam_date && safeFormatDate(exam.exam_date, "MMM dd, yyyy")
                        )}
                      </p>
                      {exam.description && <p className="italic">"{exam.description}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedExamId(exam.id); setShowSubjectDialog(true); }}>
                      <BookOpen className="h-3 w-3 mr-1" /> Subjects
                    </Button>

                    {exam.status === "draft" && (
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
                        <Button variant="outline" size="sm" onClick={() => navigate(`/marks-entry?examId=${exam.id}`)}>
                          <Edit className="h-3 w-3 mr-1" /> Enter Marks
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => publishResults.mutate(exam)}
                          disabled={publishResults.isPending}
                        >
                          <GraduationCap className="h-3 w-3 mr-1" /> Publish Results
                        </Button>
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
