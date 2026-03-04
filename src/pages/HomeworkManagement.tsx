import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, useAuth } from "@/contexts/AuthContext";
import { Loader2, supabase } from "@/integrations/supabase/client";
import { Loader2, Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Loader2, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, format } from "date-fns";
import { Clock, Edit, FileUp, Loader2, Plus, Trash2, Users, XCircle } from "lucide-react";
import { Loader2, useState } from "react";
import { Loader2, toast } from "sonner";

type Homework = Tables<'homework'>;
type Student = Tables<'students'>;
type StudentHomeworkRecord = Tables<'student_homework_records'>;
type LessonPlan = Tables<'lesson_plans'>;

export default function HomeworkManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("select-grade");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [lessonPlanId, setLessonPlanId] = useState<string | null>(null);

  const [selectedHomeworkForStatus, setSelectedHomeworkForStatus] = useState<Homework | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const { data: homeworkList = [], isLoading } = useQuery({
    queryKey: ["homework", user?.center_id, gradeFilter, subjectFilter],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("homework").select("*, lesson_plans(*)").eq("center_id", user.center_id).order("due_date", { ascending: false });
      if (gradeFilter !== "all") query = query.eq("grade", gradeFilter);
      if (subjectFilter !== "all") query = query.eq("subject", subjectFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const { data: lessonPlans = [] } = useQuery({
    queryKey: ["lesson-plans-for-homework", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("lesson_plans").select("*").eq("center_id", user.center_id).order("lesson_date", { ascending: false });
      if (error) throw error;
      return data as LessonPlan[];
    },
    enabled: !!user?.center_id,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-homework", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("students").select("*").eq("center_id", user.center_id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const { data: studentStatuses = [], refetch: refetchStudentStatuses } = useQuery({
    queryKey: ["student-homework-records", selectedHomeworkForStatus?.id],
    queryFn: async () => {
      if (!selectedHomeworkForStatus?.id) return [];
      const { data, error } = await supabase.from("student_homework_records").select("*, students(*)").eq("homework_id", selectedHomeworkForStatus.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedHomeworkForStatus?.id,
  });

  const resetForm = () => {
    setTitle(""); setSubject(""); setGrade("select-grade"); setDescription(""); setDueDate(format(new Date(), "yyyy-MM-dd"));
    setFile(null); setImage(null); setLessonPlanId(null); setEditingHomework(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setImage(e.target.files[0]);
  };

  const uploadFile = async (fileToUpload: File, bucket: string) => {
    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, fileToUpload);
    if (uploadError) throw uploadError;
    return fileName;
  };

  const createHomeworkMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      if (grade === "select-grade") throw new Error("Please select a valid grade.");
      let fileUrl: string | null = null;
      let imageUrl: string | null = null;
      if (file) fileUrl = await uploadFile(file, "homework-files");
      if (image) imageUrl = await uploadFile(image, "homework-images");
      const { data: newHomework, error } = await supabase.from("homework").insert({
        center_id: user.center_id, title, subject, class: grade, grade, description: description || null,
        due_date: dueDate, attachment_url: fileUrl || imageUrl, attachment_name: file?.name || image?.name || null,
        teacher_id: user.teacher_id || null, lesson_plan_id: lessonPlanId,
      }).select().single();
      if (error) throw error;
      const studentsInGrade = students.filter(s => s.grade === grade);
      if (studentsInGrade.length > 0) {
        const studentHomeworkRecords = studentsInGrade.map(s => ({ student_id: s.id, homework_id: newHomework.id, status: 'assigned' as const }));
        const { error: assignError } = await supabase.from("student_homework_records").insert(studentHomeworkRecords);
        if (assignError) throw assignError;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["homework"] }); toast.success("Homework created!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to create homework"),
  });

  const updateHomeworkMutation = useMutation({
    mutationFn: async () => {
      if (!editingHomework || !user?.center_id) throw new Error("Missing info");
      if (grade === "select-grade") throw new Error("Select grade");
      let attachmentUrl = editingHomework.attachment_url;
      let attachmentName = editingHomework.attachment_name;
      if (file) { attachmentUrl = await uploadFile(file, "homework-files"); attachmentName = file.name; }
      else if (image) { attachmentUrl = await uploadFile(image, "homework-images"); attachmentName = image.name; }
      const { error } = await supabase.from("homework").update({
        title, subject, grade, description, due_date: dueDate, attachment_url: attachmentUrl, attachment_name: attachmentName, lesson_plan_id: lessonPlanId,
      }).eq("id", editingHomework.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["homework"] }); toast.success("Updated!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteHomeworkMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from("homework").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["homework"] }); toast.success("Deleted!"); },
  });

  const updateStudentHomeworkRecordMutation = useMutation({
    mutationFn: async ({ id, status, teacher_remarks }: { id: string; status: StudentHomeworkRecord['status']; teacher_remarks: string }) => {
      await supabase.from("student_homework_records").update({ status, teacher_remarks, submission_date: status === 'completed' || status === 'checked' ? format(new Date(), "yyyy-MM-dd") : null }).eq("id", id);
    },
    onSuccess: () => { refetchStudentStatuses(); toast.success("Status updated!"); },
  });

  const handleEditClick = (hw: Homework) => {
    setEditingHomework(hw); setTitle(hw.title); setSubject(hw.subject); setGrade(hw.grade);
    setDescription(hw.description || ""); setDueDate(hw.due_date); setLessonPlanId(hw.lesson_plan_id); setIsDialogOpen(true);
  };

  const handleManageStatusClick = (hw: Homework) => { setSelectedHomeworkForStatus(hw); setShowStatusDialog(true); };

  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort();
  const uniqueSubjects = Array.from(new Set(homeworkList.map(hw => hw.subject))).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-4xl font-extrabold tracking-tight">Homework Hub</h1><p className="text-muted-foreground text-lg">Assign tasks and track student submission progress.</p></div>
        <div className="flex gap-2 items-center">
          <Select value={gradeFilter} onValueChange={setGradeFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Grade" /></SelectTrigger><SelectContent><SelectItem value="all">All Grades</SelectItem>{uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent><SelectItem value="all">All Subjects</SelectItem>{uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Create Homework</Button></DialogTrigger><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingHomework ? "Edit Homework" : "New Homework"}</DialogTitle><DialogDescription>Enter details below.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Subject *</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
                <div><Label>Grade *</Label><Select value={grade} onValueChange={setGrade}><SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger><SelectContent><SelectItem value="select-grade" disabled>Select Grade</SelectItem>{uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <Label>Link Lesson Plan</Label><Select value={lessonPlanId || "none"} onValueChange={v => setLessonPlanId(v === "none" ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No Lesson Plan</SelectItem>{lessonPlans.map(lp => <SelectItem key={lp.id} value={lp.id}>{lp.subject}: {lp.chapter}</SelectItem>)}</SelectContent></Select>
              <Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} />
              <Label>Due Date *</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <Button onClick={() => (editingHomework ? updateHomeworkMutation.mutate() : createHomeworkMutation.mutate())} disabled={!title || !subject || grade === "select-grade"}>{editingHomework ? "Update" : "Create"}</Button>
            </div></DialogContent></Dialog>
        </div>
      </div>
      <Card className="border-none shadow-medium overflow-hidden"><CardHeader className="bg-muted/30 pb-4"><CardTitle className="text-xl">Active Assignments</CardTitle></CardHeader><CardContent className="pt-6">
        {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : homeworkList.length === 0 ? <p className="text-muted-foreground text-center">No homework found.</p> :
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{homeworkList.map((hw: any) => (
            <div key={hw.id} className="rounded-2xl border-2 border-primary/5 bg-card p-6 shadow-soft group relative">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2"><Button variant="ghost" size="sm" onClick={() => handleEditClick(hw)}><Edit className="h-4 w-4" /></Button><Button variant="destructive" size="sm" onClick={() => deleteHomeworkMutation.mutate(hw.id)}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="space-y-4">
                <div className="flex items-start gap-4"><div className="p-3 rounded-2xl bg-primary/10 text-primary"><Book className="h-6 w-6" /></div><div><h3 className="font-bold text-xl">{hw.title}</h3><div className="flex gap-2 mt-1"><Badge variant="outline">{hw.subject}</Badge><Badge className="bg-indigo-500/10 text-indigo-600 border-none">Grade {hw.grade}</Badge></div></div></div>
                <p className="text-sm text-muted-foreground line-clamp-2">{hw.description}</p>
                <div className="flex items-center gap-2 text-sm font-bold text-destructive"><Clock className="h-4 w-4" />Due: {format(new Date(hw.due_date), "PPP")}</div>
                <div className="flex gap-3 pt-2"><Button variant="default" size="sm" className="flex-1 rounded-xl" onClick={() => handleManageStatusClick(hw)}><Users className="h-4 w-4 mr-2" /> Submissions</Button></div>
              </div>
            </div>
          ))}</div>}
      </CardContent></Card>
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Status for: {selectedHomeworkForStatus?.title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">{studentStatuses.length === 0 ? <p className="text-center">No students assigned.</p> :
          <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{studentStatuses.map((s: any) => (
            <TableRow key={s.id}><TableCell>{s.students?.name}</TableCell>
              <TableCell><Select value={s.status} onValueChange={(v: any) => updateStudentHomeworkRecordMutation.mutate({ id: s.id, status: v, teacher_remarks: s.teacher_remarks })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="assigned">Assigned</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="checked">Checked</SelectItem></SelectContent></Select></TableCell>
              <TableCell><Input defaultValue={s.teacher_remarks || ""} onBlur={e => updateStudentHomeworkRecordMutation.mutate({ id: s.id, status: s.status, teacher_remarks: e.target.value })} /></TableCell>
              <TableCell>{(s.status === 'completed' || s.status === 'checked') ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}</TableCell></TableRow>
          ))}</TableBody></Table>}</div></DialogContent></Dialog>
    </div>
  );
}
