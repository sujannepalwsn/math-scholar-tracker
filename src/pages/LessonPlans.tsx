import React, { useState } from "react";
import { CalendarIcon, CheckCircle2, Download, Edit, Eye, FileText, Loader2, MinusCircle, Plus, PlusCircle, Printer, Send, Trash2, User, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/image-utils";

type LessonPlan = Tables<'lesson_plans'>;

export default function LessonPlans() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingLessonPlan, setEditingLessonPlan] = useState<LessonPlan | null>(null);
  const [viewingLessonPlan, setViewingLessonPlan] = useState<LessonPlan | null>(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [lessonDate, setLessonDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [period, setPeriod] = useState("");
  const [objectives, setObjectives] = useState("");
  const [warmUpReview, setWarmUpReview] = useState("");
  const [learningActivities, setLearningActivities] = useState<string[]>([""]);
  const [evaluationActivities, setEvaluationActivities] = useState<string[]>([""]);
  const [classWork, setClassWork] = useState("");
  const [homeAssignment, setHomeAssignment] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const isTeacher = user?.role === 'teacher';

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-grades", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("students").select("grade").eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

  const { data: lessonPlans = [], isLoading } = useQuery({
    queryKey: ["lesson-plans-all", user?.center_id, subjectFilter, gradeFilter, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("lesson_plans").select("*, teachers(name)").eq("center_id", user.center_id).order("lesson_date", { ascending: false });
      if (subjectFilter !== "all") query = query.eq("subject", subjectFilter);
      if (gradeFilter !== "all") query = query.eq("grade", gradeFilter);

      // Full access for teachers if module is enabled
      const hasFullAccess = user?.role === 'teacher' && user.teacherPermissions?.lesson_plans === true;

      if (isTeacher && !hasFullAccess) {
        query = query.eq('teacher_id', user.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSubject("");
    setChapter("");
    setTopic("");
    setSelectedGrade("all");
    setLessonDate(format(new Date(), "yyyy-MM-dd"));
    setPeriod("");
    setObjectives("");
    setWarmUpReview("");
    setLearningActivities([""]);
    setEvaluationActivities([""]);
    setClassWork("");
    setHomeAssignment("");
    setNotes("");
    setFile(null);
    setEditingLessonPlan(null);
  };

  const uploadFile = async (fileToUpload: File, bucket: string) => {
    let finalFile: File | Blob = fileToUpload;
    if (fileToUpload.type.startsWith('image/')) {
      finalFile = await compressImage(fileToUpload, 100);
    }
    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, finalFile);
    if (error) throw error;
    return fileName;
  };

  const saveLessonPlan = useMutation({
    mutationFn: async (submit: boolean) => {
      if (!user?.center_id) throw new Error("Center ID not found");
      let fileUrl: string | null = editingLessonPlan?.lesson_file_url || null;
      if (file) fileUrl = await uploadFile(file, "lesson-files");

      const payload: any = {
        center_id: user.center_id,
        teacher_id: user.teacher_id || null,
        title: topic,
        description: topic,
        subject,
        chapter,
        topic,
        period,
        objectives,
        warm_up_review: warmUpReview,
        learning_activities: learningActivities.filter(a => a.trim() !== ""),
        evaluation_activities: evaluationActivities.filter(a => a.trim() !== ""),
        class_work: classWork,
        home_assignment: homeAssignment,
        grade: selectedGrade === "all" ? null : selectedGrade,
        class: selectedGrade === "all" ? "General" : selectedGrade,
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
        status: submit ? 'pending' : 'draft',
        submitted_at: submit ? new Date().toISOString() : null
      };

      if (editingLessonPlan) {
        const { error } = await supabase.from("lesson_plans").update(payload).eq("id", editingLessonPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lesson_plans").insert(payload);
        if (error) throw error;
      }

      if (submit) {
        // Notify Admin
        await supabase.from("notifications").insert({
          center_id: user.center_id,
          title: "New Lesson Plan Submitted",
          message: `${user?.username || 'A teacher'} has submitted a lesson plan for approval.`,
          type: "lesson_plan",
          link: "/lesson-plan-management"
        });
      }
    },
    onSuccess: (_, submit) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans-all"] });
      toast.success(submit ? "Lesson Plan submitted for approval!" : "Lesson Plan saved as draft");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.message || "Failed to save")
  });

  const deleteLessonPlanMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("lesson_plans").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson-plans-all"] }); toast.success("Deleted!"); },
    onError: (error: any) => toast.error(error.message || "Failed to delete") });


  const handleEditClick = (lp: LessonPlan) => {
    setEditingLessonPlan(lp);
    setTitle(lp.title || "");
    setDescription(lp.description || "");
    setSubject(lp.subject);
    setChapter(lp.chapter || "");
    setTopic(lp.topic);
    setLessonDate(lp.lesson_date || format(new Date(), "yyyy-MM-dd"));
    setPeriod(lp.period || "");
    setObjectives(lp.objectives || "");
    setWarmUpReview(lp.warm_up_review || "");
    setLearningActivities(Array.isArray(lp.learning_activities) && lp.learning_activities.length > 0 ? (lp.learning_activities as string[]) : [""]);
    setEvaluationActivities(Array.isArray(lp.evaluation_activities) && lp.evaluation_activities.length > 0 ? (lp.evaluation_activities as string[]) : [""]);
    setClassWork(lp.class_work || "");
    setHomeAssignment(lp.home_assignment || "");
    setNotes(lp.notes || "");
    setSelectedGrade(lp.grade || "all");
    setFile(null);
    setIsDialogOpen(true);
  };

  const handleViewClick = (lp: LessonPlan) => {
    setViewingLessonPlan(lp);
    setAdminRemarks(lp.status === 'rejected' ? lp.rejection_reason || "" : lp.principal_remarks || "");
    setIsViewOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const uniqueSubjects = Array.from(new Set(lessonPlans.map(lp => lp.subject))).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <FileText className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Lesson Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Pedagogical Design & Curriculum Registry</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[140px] h-10 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[130px] h-10 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map(g => (
                <SelectItem key={g} value={g || "unassigned"}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isTeacher && (
            <Button onClick={() => setIsDialogOpen(true)} size="sm" className="rounded-xl h-10 px-4 font-bold shadow-soft transition-all gap-2">
              <Plus className="h-4 w-4" /> CREATE PLAN
            </Button>
          )}
        </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div>
            Institutional Plan Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/10">
                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title & Teacher</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject & Grade</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lesson Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessonPlans.map((lp) => (
                    <TableRow key={lp.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground/90 leading-none">{lp.title || lp.chapter}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight italic">{lp.teachers?.name || 'Assigned Instructor'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[9px] font-black uppercase">{lp.subject}</Badge>
                          <span className="text-[10px] font-bold text-slate-400 ml-1">GRADE {lp.grade || 'ALL'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary/60" />
                          {format(new Date(lp.lesson_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-widest border-none px-2 py-1",
                          lp.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                          lp.status === 'pending' ? "bg-amber-100 text-amber-700 animate-pulse" :
                          lp.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {lp.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleViewClick(lp)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(isTeacher && (lp.status === 'draft' || lp.status === 'rejected')) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleEditClick(lp)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive hover:bg-destructive/10" onClick={() => deleteLessonPlanMutation.mutate(lp.id)}>
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingLessonPlan ? "Refine Lesson Architecture" : "Construct New Lesson Plan"}</DialogTitle>
            <DialogDescription className="font-medium">Define the pedagogical structure for institutional review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Subject *</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Math" className="h-11 rounded-xl bg-card/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Class *</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger className="h-11 rounded-xl bg-card/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">General</SelectItem>
                      {uniqueGrades.map(g => (
                        <SelectItem key={g} value={g || "unassigned"}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Unit *</Label>
                  <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Unit 1" className="h-11 rounded-xl bg-card/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Period *</Label>
                  <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="1st" className="h-11 rounded-xl bg-card/50" />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Lesson Topic *</Label>
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Linear Equations" className="h-11 rounded-xl bg-card/50" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Date *</Label>
                   <Input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} className="h-11 rounded-xl bg-card/50" />
                </div>
             </div>

             <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">1. Learning Outcomes</Label>
                <Textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={3} placeholder="Define what students will master..." className="rounded-2xl bg-card/50 border-muted-foreground/10" />
             </div>

             <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">2. Warm up & Review</Label>
                <Textarea value={warmUpReview} onChange={(e) => setWarmUpReview(e.target.value)} rows={3} placeholder="Previous lesson recap and engagement..." className="rounded-2xl bg-card/50 border-muted-foreground/10" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-primary">3. Teaching Learning Activities</Label>
                     <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] font-black uppercase text-primary hover:bg-primary/5" onClick={() => setLearningActivities([...learningActivities, ""])}><PlusCircle className="h-3 w-3 mr-1" /> Add</Button>
                   </div>
                   <div className="space-y-2">
                      {learningActivities.map((act, i) => (
                        <div key={i} className="flex gap-2">
                           <Input value={act} onChange={(e) => {
                             const n = [...learningActivities]; n[i] = e.target.value; setLearningActivities(n);
                           }} className="h-9 rounded-xl bg-card/30 text-xs font-medium" />
                           {learningActivities.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500" onClick={() => setLearningActivities(learningActivities.filter((_, idx) => idx !== i))}><MinusCircle className="h-4 w-4" /></Button>}
                        </div>
                      ))}
                   </div>
                </div>
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600">4. Class Review / Evaluation</Label>
                     <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] font-black uppercase text-violet-600 hover:bg-violet-50" onClick={() => setEvaluationActivities([...evaluationActivities, ""])}><PlusCircle className="h-3 w-3 mr-1" /> Add</Button>
                   </div>
                   <div className="space-y-2">
                      {evaluationActivities.map((act, i) => (
                        <div key={i} className="flex gap-2">
                           <Input value={act} onChange={(e) => {
                             const n = [...evaluationActivities]; n[i] = e.target.value; setEvaluationActivities(n);
                           }} className="h-9 rounded-xl bg-card/30 text-xs font-medium" />
                           {evaluationActivities.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500" onClick={() => setEvaluationActivities(evaluationActivities.filter((_, idx) => idx !== i))}><MinusCircle className="h-4 w-4" /></Button>}
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Class Work</Label>
                  <Textarea value={classWork} onChange={(e) => setClassWork(e.target.value)} rows={3} placeholder="Activities to be done in class..." className="rounded-2xl bg-card/50 border-muted-foreground/10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Home Assignment</Label>
                  <Textarea value={homeAssignment} onChange={(e) => setHomeAssignment(e.target.value)} rows={3} placeholder="Homework for students..." className="rounded-2xl bg-card/50 border-muted-foreground/10" />
                </div>
             </div>

             <div className="flex gap-3 pt-4 border-t border-muted/10">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-2xl font-bold">CANCEL</Button>
                <Button variant="outline" onClick={() => saveLessonPlan.mutate(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 shadow-soft" disabled={saveLessonPlan.isPending}>SAVE DRAFT</Button>
                <Button onClick={() => saveLessonPlan.mutate(true)} className="flex-[1.5] rounded-2xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-primary to-violet-600 shadow-strong hover:scale-[1.02] transition-all" disabled={saveLessonPlan.isPending}><Send className="h-4 w-4 mr-2" /> SUBMIT FOR APPROVAL</Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Approval Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-strong">
          <style>
            {`
              @media print {
                body * { visibility: hidden; }
                .printable-area, .printable-area * { visibility: visible; }
                .printable-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  padding: 20px;
                }
                .no-print { display: none !important; }
              }
            `}
          </style>

          <div className="flex flex-col h-full bg-white">
            <div className="no-print p-6 border-b flex items-center justify-between bg-slate-50/50">
              <div>
                <DialogTitle className="text-2xl font-black">Daily Lesson Plan</DialogTitle>
                <DialogDescription className="font-medium">Verification and official record of pedagogical activities.</DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl h-10 px-4 font-bold gap-2">
                  <Printer className="h-4 w-4" /> PRINT PLAN
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsViewOpen(false)} className="rounded-xl h-10 w-10">
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-8 printable-area space-y-8 text-slate-800">
              {viewingLessonPlan && (
                <>
                  <div className="text-center space-y-2 mb-8">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 border-b-4 border-slate-900 inline-block pb-1">Daily Lesson Plan</h1>
                  </div>

                  {/* Header Box */}
                  <div className="border-2 border-slate-900 rounded-3xl overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="md:border-r-2 border-slate-900 divide-y-2 divide-slate-900">
                        <div className="p-4 flex gap-2 items-center">
                          <span className="font-black uppercase text-[10px] md:text-xs min-w-[80px] md:min-w-[100px]">Subject:</span>
                          <span className="font-bold border-b border-slate-400 flex-1 text-sm">{viewingLessonPlan.subject}</span>
                        </div>
                        <div className="p-4 flex gap-2 items-center">
                          <span className="font-black uppercase text-[10px] md:text-xs min-w-[80px] md:min-w-[100px]">Unit:</span>
                          <span className="font-bold border-b border-slate-400 flex-1 text-sm">{viewingLessonPlan.chapter || 'N/A'}</span>
                        </div>
                        <div className="p-4 flex gap-2 items-center">
                          <span className="font-black uppercase text-[10px] md:text-xs min-w-[80px] md:min-w-[100px]">Topic:</span>
                          <span className="font-bold border-b border-slate-400 flex-1 text-sm">{viewingLessonPlan.topic || viewingLessonPlan.title}</span>
                        </div>
                      </div>
                      <div className="divide-y-2 divide-slate-900 border-t-2 md:border-t-0 border-slate-900">
                        <div className="p-4 flex gap-2 items-center">
                          <span className="font-black uppercase text-[10px] md:text-xs min-w-[80px]">Class:</span>
                          <span className="font-bold border-b border-slate-400 flex-1 text-sm">{viewingLessonPlan.grade || 'General'}</span>
                        </div>
                        <div className="p-4 flex gap-2 items-center">
                          <span className="font-black uppercase text-[10px] md:text-xs min-w-[80px]">Period:</span>
                          <span className="font-bold border-b border-slate-400 flex-1 text-sm">{viewingLessonPlan.period || 'N/A'}</span>
                        </div>
                        <div className="p-4 flex gap-2 items-center">
                          <span className="font-black uppercase text-[10px] md:text-xs min-w-[80px]">Date:</span>
                          <span className="font-bold border-b border-slate-400 flex-1 text-sm">{format(new Date(viewingLessonPlan.lesson_date), "PPP")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Numbered Sections */}
                  <div className="space-y-8">
                    <section className="space-y-2">
                      <h3 className="font-black text-base md:text-lg flex items-start gap-2">
                        <span>1.</span>
                        <span className="uppercase">Learning Outcomes:</span>
                      </h3>
                      <div className="pl-6 md:pl-7 text-sm font-medium leading-relaxed border-b border-dotted border-slate-300 pb-2 min-h-[40px]">
                        {viewingLessonPlan.objectives || '____________________________________________________________________________________________________'}
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h3 className="font-black text-base md:text-lg flex items-start gap-2">
                        <span>2.</span>
                        <span className="uppercase">Warm up & Review:</span>
                      </h3>
                      <div className="pl-6 md:pl-7 text-sm font-medium leading-relaxed border-b border-dotted border-slate-300 pb-2 min-h-[40px]">
                        {viewingLessonPlan.warm_up_review || '____________________________________________________________________________________________________'}
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h3 className="font-black text-base md:text-lg flex items-start gap-2">
                        <span className="uppercase ml-6 md:ml-7">Teaching Aids:</span>
                      </h3>
                      <div className="pl-6 md:pl-7 text-sm font-medium leading-relaxed border-b border-dotted border-slate-300 pb-2 min-h-[40px]">
                        {viewingLessonPlan.notes || '____________________________________________________________________________________________________'}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="font-black text-base md:text-lg flex items-start gap-2">
                        <span>3.</span>
                        <span className="uppercase">Teaching Learning Activities:</span>
                      </h3>
                      <div className="pl-6 md:pl-7 space-y-3">
                        {Array.isArray(viewingLessonPlan.learning_activities) && (viewingLessonPlan.learning_activities as string[]).length > 0 ? (
                          (viewingLessonPlan.learning_activities as string[]).map((act, i) => (
                            <div key={i} className="flex gap-2 text-sm font-medium border-b border-dotted border-slate-300 pb-1">
                              <span className="font-bold">{String.fromCharCode(97 + i)}.</span>
                              <span>{act}</span>
                            </div>
                          ))
                        ) : (
                          ['a', 'b', 'c', 'd'].map((char) => (
                            <div key={char} className="flex gap-2 text-sm font-medium border-b border-dotted border-slate-300 pb-1 text-slate-300">
                              <span className="font-bold">{char}.</span>
                              <span>____________________________________________________________________________________________________</span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="font-black text-base md:text-lg flex items-start gap-2">
                        <span>4.</span>
                        <span className="uppercase">Class Review / Evaluation:</span>
                      </h3>
                      <div className="pl-6 md:pl-7 space-y-3">
                        {Array.isArray(viewingLessonPlan.evaluation_activities) && (viewingLessonPlan.evaluation_activities as string[]).length > 0 ? (
                          (viewingLessonPlan.evaluation_activities as string[]).map((act, i) => (
                            <div key={i} className="flex gap-2 text-sm font-medium border-b border-dotted border-slate-300 pb-1">
                              <span className="font-bold">{String.fromCharCode(97 + i)}.</span>
                              <span>{act}</span>
                            </div>
                          ))
                        ) : (
                          ['a', 'b', 'c', 'd'].map((char) => (
                            <div key={char} className="flex gap-2 text-sm font-medium border-b border-dotted border-slate-300 pb-1 text-slate-300">
                              <span className="font-bold">{char}.</span>
                              <span>____________________________________________________________________________________________________</span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="font-black text-base md:text-lg flex items-start gap-2">
                        <span>5.</span>
                        <span className="uppercase">Assignments:</span>
                      </h3>
                      <div className="border-2 border-slate-900 md:divide-x-2 divide-slate-900 grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden">
                        <div className="divide-y-2 divide-slate-900">
                          <div className="bg-slate-50 p-2 text-center font-black uppercase text-[10px]">Class Work</div>
                          <div className="p-4 text-sm font-medium min-h-[80px] md:min-h-[120px]">
                            {viewingLessonPlan.class_work || '________________________________________'}
                          </div>
                        </div>
                        <div className="divide-y-2 divide-slate-900 border-t-2 md:border-t-0 border-slate-900">
                          <div className="bg-slate-50 p-2 text-center font-black uppercase text-[10px]">Home Assignment</div>
                          <div className="p-4 text-sm font-medium min-h-[80px] md:min-h-[120px]">
                            {viewingLessonPlan.home_assignment || '________________________________________'}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="pt-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <span className="font-black uppercase text-sm">Remarks:</span>
                      <div className="flex-1 border-b border-dotted border-slate-900 min-h-[30px] font-bold italic text-slate-700 text-sm">
                        {viewingLessonPlan.principal_remarks || viewingLessonPlan.rejection_reason || ''}
                      </div>
                    </section>
                  </div>

                  {/* Signatures */}
                  <div className="pt-16 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 pb-10">
                    <div className="text-center space-y-2">
                      <div className="border-t-2 border-slate-900 pt-2">
                        <p className="font-black uppercase text-[10px]">Subject Teacher's Signature</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{viewingLessonPlan.teachers?.name}</p>
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="border-t-2 border-slate-900 pt-2">
                        <p className="font-black uppercase text-[10px]">Principal's Signature</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="no-print p-6 bg-slate-50 border-t flex justify-end gap-3">
               <Button variant="ghost" onClick={() => setIsViewOpen(false)} className="rounded-xl font-bold">CLOSE PREVIEW</Button>
               <Button onClick={handlePrint} className="rounded-xl font-black uppercase tracking-widest gap-2">
                 <Printer className="h-4 w-4" /> PRINT RECORD
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
