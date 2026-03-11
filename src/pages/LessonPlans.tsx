import React, { useState } from "react";
import { CalendarIcon, Download, Edit, Eye, FileText, Plus, Send, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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

type LessonPlan = Tables<'lesson_plans'>;

export default function LessonPlans() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingLessonPlan, setEditingLessonPlan] = useState<LessonPlan | null>(null);
  const [viewingLessonPlan, setViewingLessonPlan] = useState<LessonPlan | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [lessonDate, setLessonDate] = useState(format(new Date(), "yyyy-MM-dd"));
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
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

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

  const resetForm = () => { setSubject(""); setChapter(""); setTopic(""); setSelectedGrade("all"); setLessonDate(format(new Date(), "yyyy-MM-dd")); setNotes(""); setFile(null); setEditingLessonPlan(null); };

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

      const payload: any = {
        center_id: user.center_id,
        teacher_id: user.teacher_id || null,
        subject, chapter, topic,
        class: selectedGrade === "all" ? "General" : selectedGrade,
        grade: selectedGrade === "all" ? null : selectedGrade,
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
        status: user.role === 'center' ? 'approved' : 'planned'
      };

      const { error } = await supabase.from("lesson_plans").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson-plans"] }); toast.success("Lesson Plan created!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to create") });

  const updateLessonPlanMutation = useMutation({
    mutationFn: async () => {
      if (!editingLessonPlan || !user?.center_id) throw new Error("Missing info");
      let fileUrl: string | null = editingLessonPlan.lesson_file_url;
      if (file) fileUrl = await uploadFile(file, "lesson-files");
      const { error } = await supabase.from("lesson_plans").update({
        subject, chapter, topic, lesson_date: lessonDate, notes: notes || null, lesson_file_url: fileUrl,
        grade: selectedGrade === "all" ? null : selectedGrade }).eq("id", editingLessonPlan.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson-plans"] }); toast.success("Updated!"); setIsDialogOpen(false); resetForm(); },
    onError: (error: any) => toast.error(error.message || "Failed to update") });

  const deleteLessonPlanMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("lesson_plans").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson-plans"] }); toast.success("Deleted!"); },
    onError: (error: any) => toast.error(error.message || "Failed to delete") });

  const submitForApprovalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lesson_plans")
        .update({ status: 'pending' })
        .eq("id", id);
      if (error) throw error;

      // Send notification to admin
      await supabase.from("notifications").insert({
        center_id: user?.center_id,
        title: "Lesson Plan Submission",
        message: `${user?.username || 'A teacher'} has submitted a new lesson plan for approval.`,
        type: "lesson_plan_submission",
        user_id: null, // Broadcast to admins
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      toast.success("Lesson plan submitted for approval!");
    },
    onError: (error: any) => toast.error(error.message || "Failed to submit")
  });

  const handleEditClick = (lp: LessonPlan) => {
    setEditingLessonPlan(lp); setSubject(lp.subject); setChapter(lp.chapter); setTopic(lp.topic);
    setLessonDate(lp.lesson_date); setNotes(lp.notes || ""); setSelectedGrade(lp.grade || "all");
    setFile(null); setIsDialogOpen(true);
  };

  const handleViewClick = (lp: LessonPlan) => {
    setViewingLessonPlan(lp);
    setIsViewOpen(true);
  };

  const uniqueSubjects = Array.from(new Set(lessonPlans.map(lp => lp.subject))).sort();

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600 border-none text-[10px] font-black uppercase tracking-tighter px-2 py-0">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="border-none text-[10px] font-black uppercase tracking-tighter px-2 py-0">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500 hover:bg-amber-600 border-none text-[10px] font-black uppercase tracking-tighter px-2 py-0">Pending</Badge>;
      default:
        return <Badge variant="secondary" className="border-none text-[10px] font-black uppercase tracking-tighter px-2 py-0">Draft</Badge>;
    }
  };

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
            <DialogTrigger asChild>
              <Button className="h-11 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-primary to-violet-600 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all px-6">
                <Plus className="h-4 w-4 mr-2" /> CREATE PLAN
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {editingLessonPlan ? "Nexus: Edit Strategy" : "Nexus: New Strategy"}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Drafting instructional roadmap for academic execution.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject Protocol *</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Chapter Index *</Label>
                    <Input
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      placeholder="e.g. Algebra"
                      className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Topic Specification *</Label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Linear Equations"
                    className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Grade Level</Label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-xl bg-card/90 border-none rounded-2xl shadow-strong">
                        <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest">All Grades</SelectItem>
                        {uniqueGrades.map(g => <SelectItem key={g} value={g!} className="font-black text-[10px] uppercase tracking-widest">Grade {g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Execution Date *</Label>
                    <Input
                      type="date"
                      value={lessonDate}
                      onChange={(e) => setLessonDate(e.target.value)}
                      className="h-12 rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Instructional Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter pedagogical details..."
                    className="rounded-2xl border-none bg-slate-50 shadow-inner focus-visible:ring-primary/20 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pedagogical Resource (PDF/Image)</Label>
                  <div className="relative group/file">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      capture="environment"
                      onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                      className="h-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer file:hidden text-slate-400 text-xs font-bold pt-3.5 pl-10"
                    />
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover/file:text-primary transition-colors" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                       {file ? (
                         <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] font-black">FILE LINKED</Badge>
                       ) : (
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Select File</span>
                       )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => editingLessonPlan ? updateLessonPlanMutation.mutate() : createLessonPlanMutation.mutate()}
                  disabled={!subject || !chapter || !topic || !lessonDate}
                  className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 transition-all active:scale-95"
                >
                  {editingLessonPlan ? "UPDATE PLAN" : "ESTABLISH PLAN"}
                </Button>
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
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
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
                      <TableCell className="text-center">
                        {getStatusBadge(lp.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                          {format(new Date(lp.lesson_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            {user?.role === 'teacher' && (lp.status === 'planned' || lp.status === 'rejected' || !lp.status) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl bg-white shadow-soft text-amber-600 hover:bg-amber-50"
                                    onClick={() => submitForApprovalMutation.mutate(lp.id)}
                                    disabled={submitForApprovalMutation.isPending}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Submit for Approval</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>

                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleViewClick(lp)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleEditClick(lp)}>
                            <Edit className="h-4 w-4" />
                          </Button>
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
        <DialogContent className="max-w-xl rounded-[2.5rem] border-none shadow-strong bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Strategy Blueprint</DialogTitle>
            <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-primary">In-depth look at the pedagogical roadmap.</DialogDescription>
          </DialogHeader>
          {viewingLessonPlan && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 shadow-inner">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</Label>
                  <p className="font-black text-primary leading-none mt-1">{viewingLessonPlan.subject}</p>
                </div>
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 shadow-inner">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chapter</Label>
                  <p className="font-black text-slate-700 leading-none mt-1">{viewingLessonPlan.chapter}</p>
                </div>
              </div>
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 shadow-inner">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topic Specification</Label>
                <p className="font-bold text-slate-600 italic leading-tight mt-1">{viewingLessonPlan.topic}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 shadow-inner">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Grade</Label>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg text-[10px] font-black uppercase mt-1">Grade {viewingLessonPlan.grade || "All"}</Badge>
                </div>
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 shadow-inner">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Execution Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                    <span className="font-black text-slate-700 text-xs">{format(new Date(viewingLessonPlan.lesson_date), "PPP")}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 shadow-inner">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Instructional Notes</Label>
                <p className="text-xs font-bold text-slate-500 whitespace-pre-wrap leading-relaxed mt-1">
                  {viewingLessonPlan.notes || "No notes provided."}
                </p>
              </div>
              {(viewingLessonPlan as any).admin_notes && (
                <div className="space-y-1.5 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-orange-600/60">Institutional Feedback</Label>
                  <p className="text-xs font-black text-orange-700 leading-tight mt-1">
                    {(viewingLessonPlan as any).admin_notes}
                  </p>
                </div>
              )}
              {viewingLessonPlan.lesson_file_url && (
                <div className="pt-2">
                  <Button variant="outline" className="w-full rounded-2xl h-12 border-2 border-dashed font-black text-[10px] uppercase tracking-widest gap-2" asChild>
                    <a href={supabase.storage.from("lesson-files").getPublicUrl(viewingLessonPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" /> DOWNLOAD RESOURCE
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
