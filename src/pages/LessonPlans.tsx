import React, { useState } from "react";
import { CalendarIcon, Download, Edit, Eye, FileText, Plus, Trash2, PlusCircle, MinusCircle, Printer } from "lucide-react";
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
  const [principalRemarks, setPrincipalRemarks] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

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

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-grades", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("students").select("grade").eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });
  const allUniqueGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

  const { data: teacherAssignments = [] } = useQuery({
    queryKey: ["teacher-assignments-lp", user?.teacher_id, user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("period_schedules")
        .select("subject, grade")
        .eq("center_id", user.center_id);

      if (user?.role === 'teacher' && user?.teacher_id) {
        query = query.eq("teacher_id", user.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const assignedSubjects = Array.from(new Set(teacherAssignments.map(a => a.subject))).sort();
  const assignedGrades = Array.from(new Set(teacherAssignments.map(a => a.grade))).sort();
  const uniqueGrades = user?.role === 'teacher' ? assignedGrades : allUniqueGrades;

  const { data: lessonPlans = [], isLoading } = useQuery({
    queryKey: ["lesson-plans-for-tracking", user?.center_id, subjectFilter, gradeFilter, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("lesson_plans").select("*").eq("center_id", user.center_id).order("lesson_date", { ascending: false });
      if (subjectFilter !== "all") query = query.eq("subject", subjectFilter);
      if (gradeFilter !== "all") query = query.eq("grade", gradeFilter);

      if (user?.role === 'teacher') {
        query = query.eq('teacher_id', user.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const resetForm = () => {
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

  const createLessonPlanMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");
      let fileUrl: string | null = null;
      if (file) fileUrl = await uploadFile(file, "lesson-files");
      const { error } = await supabase.from("lesson_plans").insert({
        center_id: user.center_id,
        teacher_id: user.teacher_id || null,
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
        class: selectedGrade === "all" ? "General" : selectedGrade,
        grade: selectedGrade === "all" ? null : selectedGrade,
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
        status: 'draft'
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson-plans-for-tracking"] }); toast.success("Lesson Plan created!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to create") });

  const updateLessonPlanMutation = useMutation({
    mutationFn: async () => {
      if (!editingLessonPlan || !user?.center_id) throw new Error("Missing info");
      let fileUrl: string | null = editingLessonPlan.lesson_file_url;
      if (file) fileUrl = await uploadFile(file, "lesson-files");
      const { error } = await supabase.from("lesson_plans").update({
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
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
        grade: selectedGrade === "all" ? null : selectedGrade
      }).eq("id", editingLessonPlan.id).eq("center_id", user.center_id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson-plans-for-tracking"] }); toast.success("Updated!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to update") });

  const deleteLessonPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.center_id) return;
      const { error } = await supabase.from("lesson_plans").delete().eq("id", id).eq("center_id", user.center_id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson-plans-for-tracking"] }); toast.success("Deleted!"); },
    onError: (error: any) => toast.error(error.message || "Failed to delete") });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string, status: string, remarks?: string }) => {
      if (!user?.center_id) return;
      const updates: any = { status };
      if (remarks !== undefined) updates.principal_remarks = remarks;
      if (status === 'approved') {
        updates.approved_by = user?.id;
        updates.approval_date = new Date().toISOString();
      }

      const { error } = await supabase.from("lesson_plans").update(updates).eq("id", id).eq("center_id", user.center_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans-for-tracking"] });
      toast.success("Status updated!");
      setIsViewOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to update status")
  });

  const handleEditClick = (lp: LessonPlan) => {
    setEditingLessonPlan(lp);
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
    setPrincipalRemarks(lp.principal_remarks || "");
    setIsViewOpen(true);
  };

  const uniqueSubjects = Array.from(new Set(lessonPlans.map(lp => lp.subject))).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Curriculum Planner
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Design and organize your teaching roadmap.</p>
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            {user?.role === 'center' && (
              <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1" /> Create</Button></DialogTrigger>
            )}
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLessonPlan ? "Edit Lesson Plan" : "New Lesson Plan"}</DialogTitle>
                <DialogDescription>Fill in the structured lesson plan details below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-2xl bg-muted/5">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject *</Label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger className="bg-background border-muted-foreground/20">
                          <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignedSubjects.length > 0 ? (
                            assignedSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                          ) : (
                            <SelectItem value="none" disabled>No subjects assigned</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit (Chapter) *</Label>
                      <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Algebra" className="bg-background border-muted-foreground/20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lesson Topic *</Label>
                      <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Linear Equations" className="bg-background border-muted-foreground/20" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class (Grade) *</Label>
                      <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger className="bg-background border-muted-foreground/20">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Grades</SelectItem>
                          {uniqueGrades.map(g => <SelectItem key={g} value={g!}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Period</Label>
                      <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="1st Period" className="bg-background border-muted-foreground/20" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date *</Label>
                      <Input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} className="bg-background border-muted-foreground/20" />
                    </div>
                  </div>
                </div>

                {/* 1. Learning Outcomes */}
                <div className="space-y-2">
                  <Label className="text-sm font-black flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</div>
                    Learning Outcomes
                  </Label>
                  <Textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={2} placeholder="What should students achieve?" className="rounded-xl border-muted-foreground/20" />
                </div>

                {/* 2. Warm up & Review */}
                <div className="space-y-2">
                  <Label className="text-sm font-black flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</div>
                    Warm up & Review
                  </Label>
                  <Textarea value={warmUpReview} onChange={(e) => setWarmUpReview(e.target.value)} rows={2} placeholder="Recap previous session..." className="rounded-xl border-muted-foreground/20" />
                </div>

                {/* 3. Teaching Learning Activities */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-black flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">3</div>
                      Teaching Learning Activities
                    </Label>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-7 px-2" onClick={() => setLearningActivities([...learningActivities, ""])}>
                      <PlusCircle className="h-4 w-4 mr-1" /> Add Row
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {learningActivities.map((activity, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-muted-foreground w-4">{String.fromCharCode(97 + idx)}.</span>
                        <Input
                          value={activity}
                          onChange={(e) => {
                            const newActivities = [...learningActivities];
                            newActivities[idx] = e.target.value;
                            setLearningActivities(newActivities);
                          }}
                          placeholder={`Activity ${idx + 1}`}
                          className="flex-1 rounded-xl h-9 border-muted-foreground/10"
                        />
                        {learningActivities.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setLearningActivities(learningActivities.filter((_, i) => i !== idx))}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Class Review / Evaluation */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-black flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">4</div>
                      Class Review / Evaluation
                    </Label>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-7 px-2" onClick={() => setEvaluationActivities([...evaluationActivities, ""])}>
                      <PlusCircle className="h-4 w-4 mr-1" /> Add Row
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {evaluationActivities.map((activity, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-muted-foreground w-4">{String.fromCharCode(97 + idx)}.</span>
                        <Input
                          value={activity}
                          onChange={(e) => {
                            const newActivities = [...evaluationActivities];
                            newActivities[idx] = e.target.value;
                            setEvaluationActivities(newActivities);
                          }}
                          placeholder={`Evaluation item ${idx + 1}`}
                          className="flex-1 rounded-xl h-9 border-muted-foreground/10"
                        />
                        {evaluationActivities.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEvaluationActivities(evaluationActivities.filter((_, i) => i !== idx))}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Assignments */}
                <div className="space-y-3">
                  <Label className="text-sm font-black flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">5</div>
                    Assignments
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 border rounded-2xl bg-primary/5 border-primary/10">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Class Work</Label>
                      <Textarea value={classWork} onChange={(e) => setClassWork(e.target.value)} rows={3} placeholder="Class tasks..." className="bg-background border-primary/20 rounded-xl" />
                    </div>
                    <div className="space-y-2 p-4 border rounded-2xl bg-violet-500/5 border-violet-500/10">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600">Home Assignment</Label>
                      <Textarea value={homeAssignment} onChange={(e) => setHomeAssignment(e.target.value)} rows={3} placeholder="Homework..." className="bg-background border-violet-500/20 rounded-xl" />
                    </div>
                  </div>
                </div>

                {/* Footer Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">General Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Additional comments..." className="rounded-xl border-muted-foreground/20" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resource Attachment</Label>
                    <div className="flex flex-col gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,image/*"
                        capture="environment"
                        onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                        className="rounded-xl border-muted-foreground/20 h-10 py-1.5"
                      />
                      <p className="text-[10px] text-muted-foreground italic">PDF, DOCX, or Image resources</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="flex-1 rounded-xl">
                    Cancel
                  </Button>
                  <Button onClick={() => editingLessonPlan ? updateLessonPlanMutation.mutate() : createLessonPlanMutation.mutate()} disabled={!subject || !chapter || !topic || !lessonDate} className="flex-[2] rounded-xl shadow-strong">
                    {editingLessonPlan ? "Update Lesson Plan" : "Create Lesson Plan"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            Plan Library
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : lessonPlans.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">No lesson plans found for selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/10">
                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chapter & Topic</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Grade</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessonPlans.map((lp) => (
                    <TableRow key={lp.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground/90 leading-none">{lp.chapter}</p>
                          <p className="text-xs text-muted-foreground italic line-clamp-1">{lp.topic}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {lp.subject}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {lp.grade ? (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {lp.grade}
                          </Badge>
                        ) : <span className="text-xs font-bold text-slate-400">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                          {format(new Date(lp.lesson_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider border-none",
                            lp.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                            lp.status === 'rejected' ? "bg-red-100 text-red-700" :
                            lp.status === 'pending' ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-700"
                          )}
                        >
                          {lp.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleViewClick(lp)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(user?.role === 'center_admin' || lp.status === 'draft' || lp.status === 'rejected') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleEditClick(lp)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {lp.lesson_file_url && (
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/5" asChild>
                               <a href={supabase.storage.from("lesson-files").getPublicUrl(lp.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                 <Download className="h-4 w-4" />
                               </a>
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lesson Plan Details</DialogTitle>
            <DialogDescription>Full pedagogical breakdown and roadmap.</DialogDescription>
          </DialogHeader>
          {viewingLessonPlan && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-6 rounded-3xl bg-primary/5 border-primary/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <FileText className="h-24 w-24 text-primary" />
                </div>
                <div className="space-y-4 relative z-10">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Subject & Unit</Label>
                    <p className="text-xl font-black text-primary leading-tight">{viewingLessonPlan.subject}</p>
                    <p className="text-sm font-bold text-muted-foreground">{viewingLessonPlan.chapter || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Topic</Label>
                    <p className="text-md font-bold text-foreground">{viewingLessonPlan.topic}</p>
                  </div>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Grade</Label>
                      <p className="text-sm font-bold">{viewingLessonPlan.grade || "All Grades"}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Period</Label>
                      <p className="text-sm font-bold">{viewingLessonPlan.period || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Date</Label>
                    <div className="flex items-center gap-2 text-sm font-bold">
                       <CalendarIcon className="h-4 w-4 text-primary" />
                       {format(new Date(viewingLessonPlan.lesson_date), "EEEE, MMM do yyyy")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-black flex items-center gap-2 text-primary">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    1. Learning Outcomes
                  </h3>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-2xl border border-muted-foreground/10 min-h-[60px]">
                    {viewingLessonPlan.objectives || "No specific outcomes defined."}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-black flex items-center gap-2 text-primary">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    2. Warm up & Review
                  </h3>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-2xl border border-muted-foreground/10 min-h-[60px]">
                    {viewingLessonPlan.warm_up_review || "No review notes."}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-black flex items-center gap-2 text-primary">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    3. Teaching Learning Activities
                  </h3>
                  <div className="space-y-2 bg-muted/30 p-4 rounded-2xl border border-muted-foreground/10 min-h-[60px]">
                    {Array.isArray(viewingLessonPlan.learning_activities) && (viewingLessonPlan.learning_activities as string[]).length > 0 ? (
                      (viewingLessonPlan.learning_activities as string[]).map((activity, idx) => (
                        <div key={idx} className="flex gap-3 text-sm">
                          <span className="font-black text-primary/40">{String.fromCharCode(97 + idx)}.</span>
                          <span className="text-muted-foreground">{activity}</span>
                        </div>
                      ))
                    ) : <p className="text-sm text-muted-foreground italic">None listed.</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-black flex items-center gap-2 text-primary">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    4. Class Review / Evaluation
                  </h3>
                  <div className="space-y-2 bg-muted/30 p-4 rounded-2xl border border-muted-foreground/10 min-h-[60px]">
                    {Array.isArray(viewingLessonPlan.evaluation_activities) && (viewingLessonPlan.evaluation_activities as string[]).length > 0 ? (
                      (viewingLessonPlan.evaluation_activities as string[]).map((activity, idx) => (
                        <div key={idx} className="flex gap-3 text-sm">
                          <span className="font-black text-primary/40">{String.fromCharCode(97 + idx)}.</span>
                          <span className="text-muted-foreground">{activity}</span>
                        </div>
                      ))
                    ) : <p className="text-sm text-muted-foreground italic">None listed.</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-black flex items-center gap-2 text-primary">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    5. Assignments
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Class Work</Label>
                       <p className="text-sm text-muted-foreground">{viewingLessonPlan.class_work || "N/A"}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-2 block">Home Assignment</Label>
                       <p className="text-sm text-muted-foreground">{viewingLessonPlan.home_assignment || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {viewingLessonPlan.notes && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">General Notes</h3>
                    <p className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-2xl border border-muted/20 italic">
                      "{viewingLessonPlan.notes}"
                    </p>
                  </div>
                )}

                {/* Approval Section for Admin */}
                {user?.role === 'center_admin' && viewingLessonPlan.status === 'pending' && (
                  <div className="space-y-4 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10">
                    <Label className="text-sm font-black text-amber-700">Principal's Review</Label>
                    <Textarea
                      value={principalRemarks}
                      onChange={(e) => setPrincipalRemarks(e.target.value)}
                      placeholder="Enter feedback or remarks..."
                      className="bg-background border-amber-200"
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => updateStatusMutation.mutate({ id: viewingLessonPlan.id, status: 'rejected', remarks: principalRemarks })}
                      >
                        Reject
                      </Button>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => updateStatusMutation.mutate({ id: viewingLessonPlan.id, status: 'approved', remarks: principalRemarks })}
                      >
                        Approve Plan
                      </Button>
                    </div>
                  </div>
                )}

                {/* Display remarks if they exist and not in pending mode for admin */}
                {viewingLessonPlan.principal_remarks && (viewingLessonPlan.status !== 'pending' || user?.role !== 'center_admin') && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Principal Remarks</h3>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 italic">
                      <p className="text-sm text-amber-800">"{viewingLessonPlan.principal_remarks}"</p>
                      {viewingLessonPlan.approval_date && (
                        <p className="text-[10px] text-amber-600/60 mt-2 font-bold uppercase tracking-widest">
                          Reviewed on {format(new Date(viewingLessonPlan.approval_date), "PP")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Teacher Submit for Approval */}
                {user?.role === 'teacher' && viewingLessonPlan.status === 'draft' && (
                  <div className="pt-4">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 rounded-xl"
                      onClick={() => updateStatusMutation.mutate({ id: viewingLessonPlan.id, status: 'pending' })}
                    >
                      Submit for Approval
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  {viewingLessonPlan.lesson_file_url && (
                    <Button variant="outline" size="sm" className="w-full rounded-xl" asChild>
                      <a href={supabase.storage.from("lesson-files").getPublicUrl(viewingLessonPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" /> Download Attached Resource
                      </a>
                    </Button>
                  )}
                  {viewingLessonPlan.status === 'approved' && (
                     <div className="flex items-center justify-end gap-2 text-xs font-black text-emerald-600">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100 border-none">APPROVED BY PRINCIPAL</Badge>
                     </div>
                  )}
                </div>

                <div className="pt-6 no-print">
                   <Button
                     onClick={() => {
                       if (viewingLessonPlan) {
                         const printWindow = window.open("", "_blank");
                         printWindow?.document.write(`
                           <html>
                             <head>
                               <title>Lesson Plan - ${viewingLessonPlan.subject}</title>
                               <style>
                                 @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                                 body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                                 .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
                                 .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #4f46e5; text-transform: uppercase; }
                                 .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                                 .field { margin-bottom: 15px; }
                                 .label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
                                 .value { font-size: 14px; font-weight: 700; color: #1e293b; }
                                 .section { margin-bottom: 25px; }
                                 .section-title { font-size: 12px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
                                 .section-content { font-size: 13px; color: #334155; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; min-height: 50px; white-space: pre-wrap; }
                                 .activity-item { display: flex; gap: 10px; margin-bottom: 8px; }
                                 .activity-num { font-weight: 800; color: #4f46e5; min-width: 20px; }
                                 .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 30px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
                                 .signature-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 8px; font-size: 10px; font-weight: 700; color: #64748b; text-align: center; text-transform: uppercase; }
                                 @media print { body { padding: 0; } .no-print { display: none; } }
                               </style>
                             </head>
                             <body>
                               <div class="header">
                                 <h1>Daily Lesson Plan</h1>
                                 <div style="text-align: right">
                                   <div class="label">Institution</div>
                                   <div class="value">${user?.center_name || 'Academic Institution'}</div>
                                 </div>
                               </div>

                               <div class="grid">
                                 <div>
                                   <div class="field"><div class="label">Subject</div><div class="value">${viewingLessonPlan.subject}</div></div>
                                   <div class="field"><div class="label">Unit / Chapter</div><div class="value">${viewingLessonPlan.chapter || 'N/A'}</div></div>
                                   <div class="field"><div class="label">Topic</div><div class="value">${viewingLessonPlan.topic}</div></div>
                                 </div>
                                 <div>
                                   <div class="field"><div class="label">Grade</div><div class="value">${viewingLessonPlan.grade || 'All Grades'}</div></div>
                                   <div class="field"><div class="label">Period</div><div class="value">${viewingLessonPlan.period || 'N/A'}</div></div>
                                   <div class="field"><div class="label">Date</div><div class="value">${format(new Date(viewingLessonPlan.lesson_date), "EEEE, MMM do yyyy")}</div></div>
                                 </div>
                               </div>

                               <div class="section">
                                 <div class="section-title">1. Learning Outcomes</div>
                                 <div class="section-content">${viewingLessonPlan.objectives || 'None defined.'}</div>
                               </div>

                               <div class="section">
                                 <div class="section-title">2. Warm up & Review</div>
                                 <div class="section-content">${viewingLessonPlan.warm_up_review || 'N/A'}</div>
                               </div>

                               <div class="section">
                                 <div class="section-title">3. Teaching Learning Activities</div>
                                 <div class="section-content">
                                   ${Array.isArray(viewingLessonPlan.learning_activities) && (viewingLessonPlan.learning_activities as string[]).length > 0
                                     ? (viewingLessonPlan.learning_activities as string[]).map((a, i) => `<div class="activity-item"><span class="activity-num">${String.fromCharCode(97 + i)}.</span><span>${a}</span></div>`).join('')
                                     : 'None listed.'}
                                 </div>
                               </div>

                               <div class="section">
                                 <div class="section-title">4. Class Review / Evaluation</div>
                                 <div class="section-content">
                                   ${Array.isArray(viewingLessonPlan.evaluation_activities) && (viewingLessonPlan.evaluation_activities as string[]).length > 0
                                     ? (viewingLessonPlan.evaluation_activities as string[]).map((a, i) => `<div class="activity-item"><span class="activity-num">${String.fromCharCode(97 + i)}.</span><span>${a}</span></div>`).join('')
                                     : 'None listed.'}
                                 </div>
                               </div>

                               <div class="grid">
                                 <div class="section">
                                   <div class="section-title">5a. Class Work</div>
                                   <div class="section-content">${viewingLessonPlan.class_work || 'N/A'}</div>
                                 </div>
                                 <div class="section">
                                   <div class="section-title">5b. Home Assignment</div>
                                   <div class="section-content">${viewingLessonPlan.home_assignment || 'N/A'}</div>
                                 </div>
                               </div>

                               ${viewingLessonPlan.principal_remarks ? `
                               <div class="section">
                                 <div class="section-title" style="color: #ea580c">Principal Remarks</div>
                                 <div class="section-content" style="background: #fff7ed; border-color: #ffedd5">"${viewingLessonPlan.principal_remarks}"</div>
                               </div>
                               ` : ''}

                               <div class="footer">
                                 <div class="signature-line">Teacher's Signature</div>
                                 <div class="signature-line">Principal / Coordinator's Signature</div>
                               </div>
                             </body>
                           </html>
                         `);
                         printWindow?.document.close();
                         printWindow?.focus();
                         setTimeout(() => {
                           printWindow?.print();
                           printWindow?.close();
                         }, 500);
                       }
                     }}
                     className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 font-bold shadow-strong"
                   >
                     <Printer className="h-4 w-4 mr-2" /> Print Lesson Plan
                   </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
