import React, { useState } from "react";
import { CalendarIcon, Download, Edit, Eye, FileText, Plus, Trash2, PlusCircle, MinusCircle, Printer, Send, CheckCircle2, XCircle, User, Loader2 } from "lucide-react";
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

      if (isTeacher) {
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
    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, fileToUpload);
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
        title,
        description,
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
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
        status: submit ? 'pending' : (editingLessonPlan?.status === 'rejected' ? 'draft' : (editingLessonPlan?.status || 'draft')),
        submitted_at: submit ? new Date().toISOString() : (editingLessonPlan?.submitted_at || null),
        updated_at: new Date().toISOString()
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
    setAdminRemarks(lp.principal_remarks || "");
    setIsViewOpen(true);
  };

  const uniqueSubjects = Array.from(new Set(lessonPlans.map(lp => lp.subject))).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Lesson Plans
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Design, organize and approve teaching roadmaps.</p>
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
              {uniqueGrades.map(g => <SelectItem key={g} value={g!}>{g}</SelectItem>)}
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
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Plan Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Quantum Mechanics" className="h-11 rounded-xl bg-card/50" />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Date *</Label>
                   <Input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} className="h-11 rounded-xl bg-card/50" />
                </div>
             </div>

             <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Subject *</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Math" className="h-11 rounded-xl bg-card/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Grade *</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger className="h-11 rounded-xl bg-card/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">General</SelectItem>
                      {uniqueGrades.map(g => <SelectItem key={g} value={g!}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Period</Label>
                  <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="1st" className="h-11 rounded-xl bg-card/50" />
                </div>
             </div>

             <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Objectives & Outcomes</Label>
                <Textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={3} placeholder="Define what students will master..." className="rounded-2xl bg-card/50 border-muted-foreground/10" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Learning Activities</Label>
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
                     <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600">Evaluation Matrix</Label>
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
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Plan Analysis & Approval</DialogTitle>
            <DialogDescription className="font-medium">Verification of instructional architecture and objectives.</DialogDescription>
          </DialogHeader>
          {viewingLessonPlan && (
            <div className="space-y-8 py-4">
               <div className="flex flex-col md:flex-row justify-between gap-6 border-b pb-6">
                  <div className="space-y-1">
                     <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest mb-2">{viewingLessonPlan.subject} • GRADE {viewingLessonPlan.grade || 'ALL'}</Badge>
                     <h2 className="text-3xl font-black text-foreground/90">{viewingLessonPlan.title || viewingLessonPlan.topic}</h2>
                     <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <User className="h-3 w-3" /> Submitted by {viewingLessonPlan.teachers?.name} • <CalendarIcon className="h-3 w-3" /> {format(new Date(viewingLessonPlan.lesson_date), "PPP")}
                     </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                     <Badge className={cn("text-[10px] font-black uppercase px-3 py-1",
                        viewingLessonPlan.status === 'approved' ? "bg-emerald-500" :
                        viewingLessonPlan.status === 'pending' ? "bg-amber-500 animate-pulse" :
                        viewingLessonPlan.status === 'rejected' ? "bg-rose-500" : "bg-slate-500")}>
                        {viewingLessonPlan.status}
                     </Badge>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">REF: {viewingLessonPlan.id.slice(0,8)}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Learning Outcomes</h4>
                        <p className="text-sm font-medium text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 leading-relaxed italic">"{viewingLessonPlan.objectives || 'None specified.'}"</p>
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Instructional Workflow</h4>
                        <div className="space-y-2">
                           {Array.isArray(viewingLessonPlan.learning_activities) && (viewingLessonPlan.learning_activities as string[]).map((act, i) => (
                              <div key={i} className="flex gap-3 text-sm bg-white p-3 rounded-xl border shadow-sm">
                                 <span className="font-black text-primary/40">{i+1}.</span>
                                 <span className="text-slate-700 font-medium">{act}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-violet-600" /> Evaluation Strategy</h4>
                        <div className="space-y-2">
                           {Array.isArray(viewingLessonPlan.evaluation_activities) && (viewingLessonPlan.evaluation_activities as string[]).map((act, i) => (
                              <div key={i} className="flex gap-3 text-sm bg-violet-50/50 p-3 rounded-xl border border-violet-100">
                                 <span className="font-black text-violet-400">{i+1}.</span>
                                 <span className="text-slate-700 font-medium">{act}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assignment</h4>
                           <div className="text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{viewingLessonPlan.home_assignment || 'N/A'}</div>
                        </div>
                        <div className="space-y-2">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Resources</h4>
                           {viewingLessonPlan.lesson_file_url ? (
                              <Button variant="outline" size="sm" className="h-9 rounded-xl border-dashed border-2 w-full text-[10px] font-black uppercase tracking-tighter" asChild>
                                 <a href={supabase.storage.from("lesson-files").getPublicUrl(viewingLessonPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-3 w-3 mr-2" /> View Asset
                                 </a>
                              </Button>
                           ) : <div className="text-xs font-medium text-slate-300 italic p-3">No assets linked</div>}
                        </div>
                     </div>
                  </div>
               </div>


               {/* Historical Decision Data */}
               {(viewingLessonPlan.status === 'approved' || viewingLessonPlan.status === 'rejected') && (
                  <div className={cn("p-6 rounded-3xl border-2 border-dashed",
                     viewingLessonPlan.status === 'approved' ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100")}>
                     <div className="flex items-center gap-3 mb-3">
                        <div className={cn("p-2 rounded-xl", viewingLessonPlan.status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                           {viewingLessonPlan.status === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </div>
                        <div>
                           <h4 className="text-sm font-black uppercase tracking-widest">{viewingLessonPlan.status === 'approved' ? "Institutional Decision" : "Rejection Record"}</h4>
                           <p className="text-[10px] font-bold text-muted-foreground uppercase">
                             Certified on {viewingLessonPlan.approval_date ? format(new Date(viewingLessonPlan.approval_date), "PPP p") : format(new Date(viewingLessonPlan.updated_at), "PPP p")}
                           </p>
                        </div>
                     </div>
                     <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                        "{viewingLessonPlan.principal_remarks || 'No specific feedback provided.'}"
                     </p>
                  </div>
               )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
