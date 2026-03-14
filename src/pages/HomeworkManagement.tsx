import React, { useState } from "react";
import { Book, CheckCircle, CheckSquare, Clock, Edit, FileUp, Loader2, Plus, Trash2, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import { cn } from "@/lib/utils"

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
  const [bulkSelectedStudents, setBulkSelectedStudents] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<StudentHomeworkRecord['status']>("completed");
  const [bulkRemarks, setBulkRemarks] = useState("");

  const { data: homeworkList = [], isLoading } = useQuery({
    queryKey: ["homework", user?.center_id, gradeFilter, subjectFilter, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("homework").select("*, lesson_plans(*)").eq("center_id", user.center_id).order("due_date", { ascending: false });
      if (gradeFilter !== "all") query = query.eq("grade", gradeFilter);
      if (subjectFilter !== "all") query = query.eq("subject", subjectFilter);

      if (user?.role === 'teacher') {
        query = query.eq('teacher_id', user.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: lessonPlans = [] } = useQuery({
    queryKey: ["lesson-plans-for-homework", user?.center_id, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("lesson_plans").select("*").eq("center_id", user.center_id).order("lesson_date", { ascending: false });

      if (user?.role === 'teacher') {
        query = query.eq('teacher_id', user.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LessonPlan[];
    },
    enabled: !!user?.center_id });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-homework", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("students").select("*").eq("center_id", user.center_id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const { data: studentStatuses = [], refetch: refetchStudentStatuses } = useQuery({
    queryKey: ["student-homework-records", selectedHomeworkForStatus?.id],
    queryFn: async () => {
      if (!selectedHomeworkForStatus?.id) return [];
      const { data, error } = await supabase.from("student_homework_records").select("*, students(*)").eq("homework_id", selectedHomeworkForStatus.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedHomeworkForStatus?.id });

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
        teacher_id: user.teacher_id || null, lesson_plan_id: lessonPlanId }).select().single();
      if (error) throw error;
      const studentsInGrade = students.filter(s => s.grade === grade);
      if (studentsInGrade.length > 0) {
        const studentHomeworkRecords = studentsInGrade.map(s => ({ student_id: s.id, homework_id: newHomework.id, status: 'assigned' as const }));
        const { error: assignError } = await supabase.from("student_homework_records").insert(studentHomeworkRecords);
        if (assignError) throw assignError;

        // Notify Parents/Students
        const studentUserIds = studentsInGrade.map(s => s.user_id).filter(Boolean);
        if (studentUserIds.length > 0) {
          const notifications = studentUserIds.map(uid => ({
            user_id: uid,
            center_id: user.center_id,
            title: "New Homework Assigned",
            message: `New homework for ${subject}: ${title}`,
            type: "homework",
            link: "/parent-homework"
          }));
          await supabase.from("notifications").insert(notifications);
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["homework"] }); toast.success("Homework created!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to create homework") });

  const updateHomeworkMutation = useMutation({
    mutationFn: async () => {
      if (!editingHomework || !user?.center_id) throw new Error("Missing info");
      if (grade === "select-grade") throw new Error("Select grade");
      let attachmentUrl = editingHomework.attachment_url;
      let attachmentName = editingHomework.attachment_name;
      if (file) { attachmentUrl = await uploadFile(file, "homework-files"); attachmentName = file.name; }
      else if (image) { attachmentUrl = await uploadFile(image, "homework-images"); attachmentName = image.name; }
      const { error } = await supabase.from("homework").update({
        title, subject, grade, description, due_date: dueDate, attachment_url: attachmentUrl, attachment_name: attachmentName, lesson_plan_id: lessonPlanId }).eq("id", editingHomework.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["homework"] }); toast.success("Updated!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message) });

  const deleteHomeworkMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from("homework").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["homework"] }); toast.success("Deleted!"); } });

  const updateStudentHomeworkRecordMutation = useMutation({
    mutationFn: async ({ id, status, teacher_remarks }: { id: string; status: StudentHomeworkRecord['status']; teacher_remarks: string }) => {
      await supabase.from("student_homework_records").update({ status, teacher_remarks, submission_date: status === 'completed' || status === 'checked' ? format(new Date(), "yyyy-MM-dd") : null }).eq("id", id);
    },
    onSuccess: () => { refetchStudentStatuses(); toast.success("Status updated!"); } });

  const bulkUpdateHomeworkMutation = useMutation({
    mutationFn: async () => {
      if (bulkSelectedStudents.length === 0) return;
      const { error } = await supabase
        .from("student_homework_records")
        .update({
          status: bulkStatus,
          teacher_remarks: bulkRemarks || null,
          submission_date: bulkStatus === 'completed' || bulkStatus === 'checked' ? format(new Date(), "yyyy-MM-dd") : null
        })
        .in("id", bulkSelectedStudents);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchStudentStatuses();
      toast.success(`Updated ${bulkSelectedStudents.length} records`);
      setBulkSelectedStudents([]);
      setBulkRemarks("");
    } });

  const handleEditClick = (hw: Homework) => {
    setEditingHomework(hw); setTitle(hw.title); setSubject(hw.subject); setGrade(hw.grade);
    setDescription(hw.description || ""); setDueDate(hw.due_date); setLessonPlanId(hw.lesson_plan_id); setIsDialogOpen(true);
  };

  const handleManageStatusClick = (hw: Homework) => { setSelectedHomeworkForStatus(hw); setShowStatusDialog(true); };

  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort();
  const uniqueSubjects = Array.from(new Set(homeworkList.map(hw => hw.subject))).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Homework Hub
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Assign tasks and track student submission progress.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[140px] h-10 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[140px] h-10 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-medium">
                <Plus className="h-4 w-4 mr-2" /> Create Homework
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingHomework ? "Edit Homework" : "New Homework"}</DialogTitle>
                <DialogDescription>Enter details below.</DialogDescription>
              </DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Subject *</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
                <div><Label>Grade *</Label><Select value={grade} onValueChange={setGrade}><SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger><SelectContent><SelectItem value="select-grade" disabled>Select Grade</SelectItem>{uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <Label>Link Lesson Plan</Label><Select value={lessonPlanId || "none"} onValueChange={v => setLessonPlanId(v === "none" ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No Lesson Plan</SelectItem>{lessonPlans.map(lp => <SelectItem key={lp.id} value={lp.id}>{lp.subject}: {lp.chapter}</SelectItem>)}</SelectContent></Select>
              <Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} />
              <div className="space-y-1.5">
                <Label>Attachment (PDF, Image)</Label>
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  capture="environment"
                  onChange={handleFileChange}
                />
              </div>
              <Label>Due Date *</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <Button onClick={() => (editingHomework ? updateHomeworkMutation.mutate() : createHomeworkMutation.mutate())} disabled={!title || !subject || grade === "select-grade"}>{editingHomework ? "Update" : "Create"}</Button>
            </div></DialogContent></Dialog>
        </div>
      </div>
      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Book className="h-6 w-6 text-primary" />
            </div>
            Active Assignments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : homeworkList.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                <Book className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">No homework found for selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/10">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title & Description</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Grade</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Due Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homeworkList.map((hw: any) => (
                    <TableRow key={hw.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground/90 leading-none">{hw.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{hw.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {hw.subject}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {hw.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-rose-500" />
                          {format(new Date(hw.due_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-xl bg-white shadow-soft text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleManageStatusClick(hw)}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Track
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleEditClick(hw)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteHomeworkMutation.mutate(hw.id)}
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
          )}
        </CardContent>
      </Card>
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Track: {selectedHomeworkForStatus?.title}</DialogTitle>
            <DialogDescription>Manage individual or bulk submission statuses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {studentStatuses.length > 0 && (
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-lg text-primary"><CheckSquare className="h-4 w-4" /></div>
                   <h4 className="text-sm font-black uppercase tracking-widest">Bulk Action Portal</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase ml-1">Set Status</Label>
                      <Select value={bulkStatus} onValueChange={(v: any) => setBulkStatus(v)}>
                        <SelectTrigger className="bg-white rounded-xl h-10 shadow-sm border-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="checked">Checked</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase ml-1">Global Remarks</Label>
                      <Input
                        placeholder="Well done!"
                        value={bulkRemarks}
                        onChange={e => setBulkRemarks(e.target.value)}
                        className="bg-white rounded-xl h-10 shadow-sm border-none"
                      />
                   </div>
                   <Button
                     onClick={() => bulkUpdateHomeworkMutation.mutate()}
                     disabled={bulkSelectedStudents.length === 0 || bulkUpdateHomeworkMutation.isPending}
                     className="rounded-xl h-10 font-bold"
                   >
                     Update {bulkSelectedStudents.length} Students
                   </Button>
                </div>
              </div>
            )}

            {studentStatuses.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground italic">No students assigned to this homework.</p>
            ) : (
              <div className="border border-muted/20 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow>
                      <TableHead className="w-[50px] text-center">
                        <Checkbox
                          checked={bulkSelectedStudents.length === studentStatuses.length}
                          onCheckedChange={(checked) => {
                            if (checked) setBulkSelectedStudents(studentStatuses.map((s: any) => s.id));
                            else setBulkSelectedStudents([]);
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Student</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Remarks</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentStatuses.map((s: any) => (
                      <TableRow key={s.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="text-center">
                          <Checkbox
                            checked={bulkSelectedStudents.includes(s.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setBulkSelectedStudents(prev => [...prev, s.id]);
                              else setBulkSelectedStudents(prev => prev.filter(id => id !== s.id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">{s.students?.name}</TableCell>
                        <TableCell>
                          <Select
                            value={s.status}
                            onValueChange={(v: any) => updateStudentHomeworkRecordMutation.mutate({ id: s.id, status: v, teacher_remarks: s.teacher_remarks })}
                          >
                            <SelectTrigger className="h-8 text-xs font-bold rounded-lg border-muted/20 w-[120px]">
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
                            defaultValue={s.teacher_remarks || ""}
                            placeholder="Add remark..."
                            className="h-8 text-xs rounded-lg border-muted/20"
                            onBlur={e => updateStudentHomeworkRecordMutation.mutate({ id: s.id, status: s.status, teacher_remarks: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {(s.status === 'completed' || s.status === 'checked') ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <Clock className="h-5 w-5 text-slate-300 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
