import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, FileUp, Image, CheckCircle, XCircle, Book } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Homework = Tables<'homework'>;
type Student = Tables<'students'>;
type StudentHomeworkRecord = Tables<'student_homework_records'>;
type LessonPlan = Tables<'lesson_plans'>; // Import LessonPlan type

export default function HomeworkManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all"); // New subject filter state

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("select-grade"); // Changed initial state
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [lessonPlanId, setLessonPlanId] = useState<string | null>(null); // New state for lesson plan ID

  const [selectedHomeworkForStatus, setSelectedHomeworkForStatus] = useState<Homework | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  // Fetch homework
  const { data: homeworkList = [], isLoading } = useQuery({
    queryKey: ["homework", user?.center_id, gradeFilter, subjectFilter], // Add subjectFilter to query key
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("homework")
        .select("*, lesson_plans(id, subject, chapter, topic, grade)") // Fetch linked lesson plan details
        .eq("center_id", user.center_id)
        .order("due_date", { ascending: false });
      
      if (gradeFilter !== "all") {
        query = query.eq("grade", gradeFilter);
      }
      if (subjectFilter !== "all") { // Apply subject filter
        query = query.eq("subject", subjectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch lesson plans for the dropdown
  const { data: lessonPlans = [] } = useQuery({
    queryKey: ["lesson-plans-for-homework", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("id, subject, chapter, topic, grade")
        .eq("center_id", user.center_id)
        .order("lesson_date", { ascending: false });
      if (error) throw error;
      return data as LessonPlan[];
    },
    enabled: !!user?.center_id,
  });

  // Fetch students for status tracking
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-homework", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, name, grade")
        .eq("center_id", user.center_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch student homework records for a specific homework
  const { data: studentStatuses = [], refetch: refetchStudentStatuses } = useQuery({
    queryKey: ["student-homework-records", selectedHomeworkForStatus?.id],
    queryFn: async () => {
      if (!selectedHomeworkForStatus?.id) return [];
      const { data, error } = await supabase
        .from("student_homework_records")
        .select("*, students(name, grade)")
        .eq("homework_id", selectedHomeworkForStatus.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedHomeworkForStatus?.id,
  });

  const resetForm = () => {
    setTitle("");
    setSubject("");
    setGrade("select-grade"); // Reset to default placeholder value
    setDescription("");
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setFile(null);
    setImage(null);
    setLessonPlanId(null); // Reset lesson plan ID
    setEditingHomework(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const uploadFile = async (fileToUpload: File, bucket: string) => {
    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileToUpload);
    if (uploadError) throw uploadError;
    return fileName;
  };

  const createHomeworkMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      if (grade === "select-grade") throw new Error("Please select a valid grade."); // Validation

      let fileUrl: string | null = null;
      let imageUrl: string | null = null;

      if (file) fileUrl = await uploadFile(file, "homework-files");
      if (image) imageUrl = await uploadFile(image, "homework-images");

      const { data: newHomework, error } = await supabase.from("homework").insert({
        center_id: user.center_id,
        title,
        subject,
        class: grade,
        grade,
        description: description || null,
        due_date: dueDate,
        attachment_url: fileUrl || imageUrl,
        attachment_name: file?.name || image?.name || null,
        teacher_id: user.teacher_id || null,
        lesson_plan_id: lessonPlanId, // Save the selected lesson plan ID
      }).select().single();
      if (error) throw error;

      // Assign homework to all students of the specified grade
      const studentsInGrade = students.filter(s => s.grade === grade);
      if (studentsInGrade.length > 0) {
        const studentHomeworkRecords = studentsInGrade.map(s => ({
          student_id: s.id,
          homework_id: newHomework.id,
          status: 'assigned' as const,
        }));
        const { error: assignError } = await supabase.from("student_homework_records").insert(studentHomeworkRecords);
        if (assignError) throw assignError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Homework created and assigned successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create homework");
    },
  });

  const updateHomeworkMutation = useMutation({
    mutationFn: async () => {
      if (!editingHomework || !user?.center_id) throw new Error("Homework or Center ID not found");
      if (grade === "select-grade") throw new Error("Please select a valid grade."); // Validation

      let attachmentUrl: string | null = editingHomework.attachment_url;
      let attachmentName: string | null = editingHomework.attachment_name;

      if (file) {
        attachmentUrl = await uploadFile(file, "homework-files");
        attachmentName = file.name;
      } else if (image) {
        attachmentUrl = await uploadFile(image, "homework-images");
        attachmentName = image.name;
      }

      const { error } = await supabase.from("homework").update({
        title,
        subject,
        grade,
        description: description || null,
        due_date: dueDate,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        lesson_plan_id: lessonPlanId, // Update the selected lesson plan ID
      }).eq("id", editingHomework.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Homework updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update homework");
    },
  });

  const deleteHomeworkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homework").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Homework deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete homework");
    },
  });

  const updateStudentHomeworkRecordMutation = useMutation({
    mutationFn: async ({ id, status, teacher_remarks }: { id: string; status: StudentHomeworkRecord['status']; teacher_remarks: string }) => {
      const { error } = await supabase.from("student_homework_records").update({
        status,
        teacher_remarks: teacher_remarks || null,
        submission_date: status === 'completed' || status === 'checked' ? format(new Date(), "yyyy-MM-dd") : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchStudentStatuses();
      toast.success("Student homework status updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleEditClick = (homework: Homework) => {
    setEditingHomework(homework);
    setTitle(homework.title);
    setSubject(homework.subject);
    setGrade(homework.grade);
    setDescription(homework.description || "");
    setDueDate(homework.due_date);
    setFile(null);
    setImage(null);
    setLessonPlanId(homework.lesson_plan_id); // Set lesson plan ID for editing
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingHomework) {
      updateHomeworkMutation.mutate();
    } else {
      createHomeworkMutation.mutate();
    }
  };

  const handleManageStatusClick = (homework: Homework) => {
    setSelectedHomeworkForStatus(homework);
    setShowStatusDialog(true);
  };

  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort();
  const uniqueSubjects = Array.from(new Set(homeworkList.map(hw => hw.subject))).sort();
  // const filteredHomework = gradeFilter === "all" ? homeworkList : homeworkList.filter(hw => hw.grade === gradeFilter);
  // Filtering is now handled by the useQuery hook

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Homework Management</h1>
        <div className="flex gap-2 items-center">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}> {/* New Subject Filter */}
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Create Homework</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="homework-create-title" aria-describedby="homework-create-description">
              <DialogHeader>
                <DialogTitle id="homework-create-title">{editingHomework ? "Edit Homework" : "Create New Homework"}</DialogTitle>
                <DialogDescription id="homework-create-description">
                  {editingHomework ? "Update the details of this homework assignment." : "Assign new homework to students by filling in the details."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Math Worksheet 1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Mathematics" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade *</Label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="select-grade" disabled>Select Grade</SelectItem> {/* Added placeholder item */}
                        {uniqueGrades.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lessonPlan">Link to Lesson Plan (Optional)</Label>
                  <Select value={lessonPlanId || "none"} onValueChange={(value) => setLessonPlanId(value === "none" ? null : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lesson plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Lesson Plan</SelectItem>
                      {lessonPlans.map((lp) => (
                        <SelectItem key={lp.id} value={lp.id}>
                          {lp.subject}: {lp.chapter} - {lp.topic} ({lp.grade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Instructions for homework" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Attach File (PDF, DOCX - Optional)</Label>
                  <Input id="file" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                  {editingHomework?.attachment_url && !file && editingHomework.attachment_name && (editingHomework.attachment_name.endsWith('.pdf') || editingHomework.attachment_name.endsWith('.doc') || editingHomework.attachment_name.endsWith('.docx')) && (
                    <p className="text-sm text-muted-foreground">Current file: {editingHomework.attachment_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Attach Image (Optional)</Label>
                  <Input id="image" type="file" accept="image/*" onChange={handleImageChange} />
                  {editingHomework?.attachment_url && !image && editingHomework.attachment_name && !editingHomework.attachment_name.endsWith('.pdf') && !editingHomework.attachment_name.endsWith('.doc') && !editingHomework.attachment_name.endsWith('.docx') && (
                    <p className="text-sm text-muted-foreground">Current image: {editingHomework.attachment_name}</p>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!title || !subject || grade === "select-grade" || !dueDate || createHomeworkMutation.isPending || updateHomeworkMutation.isPending}
                  className="w-full"
                >
                  {editingHomework ? (updateHomeworkMutation.isPending ? "Updating..." : "Update Homework") : (createHomeworkMutation.isPending ? "Creating..." : "Create Homework")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Homework Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading homework...</p>
          ) : homeworkList.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No homework assignments found for the selected grade/subject.</p>
          ) : (
            <div className="space-y-4">
              {homeworkList.map((hw: any) => (
                <div key={hw.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-lg">{hw.title} ({hw.subject} - Grade {hw.grade})</h3>
                    <p className="text-sm text-muted-foreground">Due: {format(new Date(hw.due_date), "PPP")}</p>
                    {hw.description && <p className="text-sm">{hw.description}</p>}
                    {hw.lesson_plans?.chapter && (
                      <p className="text-sm text-blue-600 flex items-center gap-1">
                        <Book className="h-4 w-4" /> Linked to: {hw.lesson_plans.subject}: {hw.lesson_plans.chapter}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {hw.attachment_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={supabase.storage.from(hw.attachment_name?.endsWith('.pdf') || hw.attachment_name?.endsWith('.doc') || hw.attachment_name?.endsWith('.docx') ? "homework-files" : "homework-images").getPublicUrl(hw.attachment_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                            <FileUp className="h-4 w-4 mr-1" /> {hw.attachment_name || 'Attachment'}
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleManageStatusClick(hw)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Manage Status
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(hw)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteHomeworkMutation.mutate(hw.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Student Homework Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-labelledby="homework-status-title" aria-describedby="homework-status-description">
          <DialogHeader>
            <DialogTitle id="homework-status-title">Manage Status for: {selectedHomeworkForStatus?.title}</DialogTitle>
            <DialogDescription id="homework-status-description">
              Update the submission status and add remarks for each student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {studentStatuses.length === 0 ? (
              <p className="text-muted-foreground text-center">No students assigned to this homework yet.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Student Name</th>
                      <th className="px-4 py-2 text-left">Grade</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Remarks</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentStatuses.map((statusEntry: any) => (
                      <TableRow key={statusEntry.id} className="border-t">
                        <TableCell>{statusEntry.students?.name}</TableCell>
                        <TableCell>{statusEntry.students?.grade}</TableCell>
                        <TableCell>
                          <Select
                            value={statusEntry.status}
                            onValueChange={(newStatus: StudentHomeworkRecord['status']) =>
                              updateStudentHomeworkRecordMutation.mutate({
                                id: statusEntry.id,
                                status: newStatus,
                                teacher_remarks: statusEntry.teacher_remarks,
                              })
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="checked">Checked</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            defaultValue={statusEntry.teacher_remarks || ""}
                            onBlur={(e) =>
                              updateStudentHomeworkRecordMutation.mutate({
                                id: statusEntry.id,
                                status: statusEntry.status,
                                teacher_remarks: e.target.value,
                              })
                            }
                            placeholder="Add remarks"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {statusEntry.status === 'completed' || statusEntry.status === 'checked' ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}