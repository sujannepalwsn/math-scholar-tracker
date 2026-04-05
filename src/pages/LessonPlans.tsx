import React, { useEffect, useState } from "react";
import { UserRole } from "@/types/roles";
import { CalendarIcon, Download, Edit, Eye, FileText, Plus, Trash2, PlusCircle, MinusCircle, Printer, Send, CheckCircle2, XCircle, User, Loader2, Scan, ExternalLink } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { usePagination } from "@/hooks/usePagination"
import { ServerPagination } from "@/components/ui/ServerPagination"
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
import { hasPermission, hasActionPermission } from "@/utils/permissions";
import LessonPlanOCR from "@/components/center/LessonPlanOCR";
import LessonGeneratorModal from "@/components/center/LessonGeneratorModal";
import { parseLessonPlanText } from "@/utils/lessonPlanParser";
import { logger } from "@/utils/logger";
import { tracking } from "@/utils/tracking";

type LessonPlan = Tables<'lesson_plans'>;

export default function LessonPlans() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOCROpen, setIsOCROpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
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
  const [learningActivities, setLearningActivities] = useState<string[]>(["", "", "", ""]);
  const [evaluationActivities, setEvaluationActivities] = useState<string[]>(["", "", "", ""]);
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [classWork, setClassWork] = useState("");
  const [homeAssignment, setHomeAssignment] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const isTeacher = user?.role === UserRole.TEACHER;

  const { data: assignedSchedules = [] } = useQuery({
    queryKey: ["teacher-assigned-schedules", user?.teacher_id, user?.center_id, isTeacher],
    queryFn: async () => {
      if (!user?.center_id || !user?.teacher_id || !isTeacher) return [];
      const { data, error } = await supabase
        .from("period_schedules")
        .select("grade, subject, day_of_week, class_periods(period_number)")
        .eq("teacher_id", user.teacher_id)
        .eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id && !!user?.teacher_id && isTeacher,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-grades", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("students").select("grade").eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  const uniqueGrades = isTeacher
    ? Array.from(new Set(assignedSchedules.map(s => s.grade).filter(Boolean))).sort()
    : Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

  const assignedSubjectsForSelectedGrade = isTeacher && selectedGrade !== "all"
    ? Array.from(new Set(assignedSchedules.filter(s => s.grade === selectedGrade).map(s => s.subject).filter(Boolean))).sort()
    : [];

  // Auto-generate Period logic
  useEffect(() => {
    if (isTeacher && selectedGrade !== "all" && subject && lessonDate) {
      const [year, month, day] = lessonDate.split('-').map(Number);
      const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0 = Sunday, 1 = Monday, etc.

      const match = (assignedSchedules as any[]).find(s =>
        s.grade === selectedGrade &&
        s.subject === subject &&
        s.day_of_week === dayOfWeek
      );
      if (match && match.class_periods) {
        // Handle both single object and array cases for safety
        const classPeriod = Array.isArray(match.class_periods) ? match.class_periods[0] : match.class_periods;
        if (classPeriod?.period_number) {
          setPeriod(classPeriod.period_number.toString());
        }
      }
    }
  }, [selectedGrade, subject, lessonDate, assignedSchedules, isTeacher]);

  const isRestricted = isTeacher && user?.teacher_scope_mode !== 'full';
  const { currentPage, pageSize, setPage, getRange } = usePagination(10);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [subjectFilter, gradeFilter, setPage]);

  const { data: lessonPlansData, isLoading } = useQuery({
    queryKey: ["lesson-plans-all", user?.center_id, subjectFilter, gradeFilter, user?.teacher_id, isRestricted, currentPage, pageSize],
    queryFn: async () => {
      if (!user?.center_id) return { data: [], count: 0 };
      const { from, to } = getRange();
      let query = supabase
        .from("lesson_plans")
        .select("*, teachers(name)", { count: 'exact' })
        .eq("center_id", user.center_id)
        .order("lesson_date", { ascending: false });
      if (subjectFilter !== "all") query = query.eq("subject", subjectFilter);
      if (gradeFilter !== "all") query = query.eq("grade", gradeFilter);

      // Full access for teachers if module is enabled
      const hasFullAccess = hasPermission(user, 'lesson_plans');

      // Hardening: Frontend filtering is for UI/UX. RLS enforces the actual restriction.
      if (isTeacher && (isRestricted || !hasFullAccess)) {
        query = query.eq('teacher_id', user.teacher_id);
      }

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.center_id });

  const lessonPlans = lessonPlansData?.data || [];
  const totalCount = lessonPlansData?.count || 0;

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
    setLearningActivities(["", "", "", ""]);
    setEvaluationActivities(["", "", "", ""]);
    setClassWork("");
    setHomeAssignment("");
    setNotes("");
    setFile(null);
    setEditingLessonPlan(null);
    setIsGeneratorOpen(false);
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
      if (!hasActionPermission(user, 'lesson_plans', 'edit')) {
        throw new Error("Access Denied: You do not have permission to create or modify lesson plans.");
      }
      if (!user?.center_id) throw new Error("Center ID not found");
      let fileUrl: string | null = editingLessonPlan?.lesson_file_url || null;
      if (file) fileUrl = await uploadFile(file, "lesson-files");

      const isRestrictedTeacher = isTeacher && user?.teacher_scope_mode !== 'full';
      if (isRestrictedTeacher) {
        const isGradeAssigned = assignedSchedules.some(s => s.grade === selectedGrade);
        const isSubjectAssigned = assignedSchedules.some(s => s.grade === selectedGrade && s.subject === subject);

        if (!isGradeAssigned) throw new Error(`Access Denied: Grade ${selectedGrade} is not in your assigned routine.`);
        if (!isSubjectAssigned) throw new Error(`Access Denied: Subject ${subject} for Grade ${selectedGrade} is not in your assigned routine.`);
      }

      const payload: Partial<Tables<"lesson_plans">> = {
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
      tracking.trackEvent('feature_action', submit ? 'submit_lesson_plan' : 'save_lesson_plan_draft', {
        subject,
        grade: selectedGrade,
        topic
      });
      queryClient.invalidateQueries({ queryKey: ["lesson-plans-all"] });
      toast.success(submit ? "Lesson Plan submitted for approval!" : "Lesson Plan saved as draft");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save")
  });

  const deleteLessonPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasActionPermission(user, 'lesson_plans', 'edit')) {
        throw new Error("Access Denied: You do not have permission to delete lesson plans.");
      }
      const { error } = await supabase.from("lesson_plans").delete().eq("id", id); if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lesson-plans-all"] }); toast.success("Deleted!"); },
    onError: (error: Error) => toast.error(error.message || "Failed to delete") });


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
    const activities = Array.isArray(lp.learning_activities) ? lp.learning_activities as string[] : [];
    setLearningActivities(activities.length > 0 ? activities : ["", "", "", ""]);

    const evals = Array.isArray(lp.evaluation_activities) ? lp.evaluation_activities as string[] : [];
    setEvaluationActivities(evals.length > 0 ? evals : ["", "", "", ""]);
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

  const handleOCRExtracted = (data: Record<string, unknown>) => {
    logger.debug("Mapping OCR data to form...", data);
    if (!data) return;

    if (data.subject) setSubject(data.subject.toString());

    // Fuzzy match for grade
    if (data.class) {
      const extractedGrade = data.class.toString().toUpperCase().replace(/GRADE\s*/i, '').trim();
      const matchedGrade = uniqueGrades.find(g => {
        const gradeStr = g?.toString().toUpperCase().replace(/GRADE\s*/i, '').trim() || "";
        return gradeStr === extractedGrade || gradeStr.includes(extractedGrade) || extractedGrade.includes(gradeStr);
      });
      if (matchedGrade) {
        setSelectedGrade(matchedGrade);
      } else {
        setSelectedGrade(data.class.toString());
      }
    }

    if (data.unit) setChapter(data.unit.toString());
    if (data.period) setPeriod(data.period.toString());
    if (data.topic) setTopic(data.topic.toString());

    // Validate and set date
    if (data.date) {
      try {
        const dateObj = new Date(data.date);
        if (!isNaN(dateObj.getTime())) {
          setLessonDate(format(dateObj, "yyyy-MM-dd"));
        }
      } catch (e) {
        logger.warn("Extracted date was invalid:", data.date);
      }
    }

    if (data.objectives) setObjectives(data.objectives.toString());
    if (data.warm_up_review) setWarmUpReview(data.warm_up_review.toString());

    if (Array.isArray(data.learning_activities)) {
      const activities = data.learning_activities.map(a => a?.toString() || "").filter(Boolean);
      setLearningActivities(activities);
    }

    if (Array.isArray(data.evaluation_activities)) {
      const evals = data.evaluation_activities.map(e => e?.toString() || "").filter(Boolean);
      setEvaluationActivities(evals);
    }

    if (data.class_work) setClassWork(data.class_work.toString());
    if (data.home_assignment) setHomeAssignment(data.home_assignment.toString());
    if (data.notes) setNotes(data.notes.toString());

    toast.info("Form populated from AI extraction. Please review and save.");
  };

  const handlePasteSubmit = () => {
    if (!pasteContent.trim()) {
      toast.error("Please paste some content");
      return;
    }

    const data = parseLessonPlanText(pasteContent);

    if (data.topic) setTopic(data.topic);
    if (data.subject) setSubject(data.subject);

    // Fuzzy match for grade
    if (data.grade) {
      const extractedGrade = data.grade.toUpperCase().replace(/GRADE\s*/i, '').trim();
      const matchedGrade = uniqueGrades.find(g => {
        const gradeStr = g?.toString().toUpperCase().replace(/GRADE\s*/i, '').trim() || "";
        return gradeStr === extractedGrade || gradeStr.includes(extractedGrade) || extractedGrade.includes(gradeStr);
      });
      if (matchedGrade) {
        setSelectedGrade(matchedGrade);
      } else {
        setSelectedGrade(data.grade);
      }
    }

    if (data.objectives) setObjectives(data.objectives);
    if (data.warmUp) setWarmUpReview(data.warmUp);

    if (data.learningActivities && data.learningActivities.length > 0) {
      setLearningActivities(data.learningActivities);
    }

    if (data.evaluation && data.evaluation.length > 0) {
      setEvaluationActivities(data.evaluation);
    }

    if (data.classWork) setClassWork(data.classWork);
    if (data.homeAssignment) setHomeAssignment(data.homeAssignment);
    if (data.remarks) setNotes(data.remarks);

    setIsPasteDialogOpen(false);
    setPasteContent("");
    toast.success("Form populated from pasted text!");
  };

  const handlePasteAndPopulate = async () => {
    try {
      // Try to read from clipboard
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        // Fallback if clipboard is empty
        setIsPasteDialogOpen(true);
        return;
      }

      const data = parseLessonPlanText(text);

      if (data.topic) setTopic(data.topic);
      if (data.subject) setSubject(data.subject);

      // Fuzzy match for grade
      if (data.grade) {
        const extractedGrade = data.grade.toUpperCase().replace(/GRADE\s*/i, '').trim();
        const matchedGrade = uniqueGrades.find(g => {
          const gradeStr = g?.toString().toUpperCase().replace(/GRADE\s*/i, '').trim() || "";
          return gradeStr === extractedGrade || gradeStr.includes(extractedGrade) || extractedGrade.includes(gradeStr);
        });
        if (matchedGrade) {
          setSelectedGrade(matchedGrade);
        } else {
          setSelectedGrade(data.grade);
        }
      }

      if (data.objectives) setObjectives(data.objectives);
      if (data.warmUp) setWarmUpReview(data.warmUp);

      if (data.learningActivities && data.learningActivities.length > 0) {
        setLearningActivities(data.learningActivities);
      }

      if (data.evaluation && data.evaluation.length > 0) {
        setEvaluationActivities(data.evaluation);
      }

      if (data.classWork) setClassWork(data.classWork);
      if (data.homeAssignment) setHomeAssignment(data.homeAssignment);
      if (data.remarks) setNotes(data.remarks);

      toast.success("Form populated directly from clipboard!");
    } catch (err) {
      logger.warn("Clipboard access denied or failed", err);
      // Fallback to dialog if permission denied
      setIsPasteDialogOpen(true);
    }
  };

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
          {hasActionPermission(user, 'lesson_plans', 'edit') && (
            <>
              <Button
                onClick={() => setIsGeneratorOpen(true)}
                size="sm"
                className="rounded-xl h-10 px-4 font-bold shadow-soft transition-all gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <ExternalLink className="h-4 w-4" /> GENERATOR
              </Button>
              <Button onClick={() => setIsDialogOpen(true)} size="sm" className="rounded-xl h-10 px-4 font-bold shadow-soft transition-all gap-2">
                <Plus className="h-4 w-4" /> CREATE PLAN
              </Button>
            </>
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
                        <Badge
                          variant={lp.status === 'approved' ? "pulse" : "outline"}
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest border-none px-2 py-1",
                            lp.status === 'approved' ? "" :
                            lp.status === 'pending' ? "bg-amber-100 text-amber-700 animate-pulse" :
                            lp.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                            "bg-slate-100 text-slate-600"
                          )}
                        >
                          {lp.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleViewClick(lp)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(hasActionPermission(user, 'lesson_plans', 'edit') && (isTeacher && (lp.status === 'draft' || lp.status === 'rejected'))) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleEditClick(lp)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasActionPermission(user, 'lesson_plans', 'edit') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive hover:bg-destructive/10" onClick={() => deleteLessonPlanMutation.mutate(lp.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ServerPagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Scanner Dialog */}
      <LessonPlanOCR
        open={isOCROpen}
        onOpenChange={setIsOCROpen}
        onExtracted={handleOCRExtracted}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[98vw] sm:max-w-4xl md:max-w-5xl max-h-[90vh] md:max-h-[98vh] overflow-y-auto rounded-t-[2rem] sm:rounded-3xl p-4 sm:p-6 custom-scrollbar">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pr-10">
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black">{editingLessonPlan ? "Refine Lesson Architecture" : "Construct New Lesson Plan"}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm font-medium">Define the pedagogical structure for institutional review.</DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasteAndPopulate}
                  className="rounded-xl border-violet-600 text-violet-600 font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-2 shadow-soft hover:bg-violet-600 hover:text-white transition-all"
                >
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> PASTE & POPULATE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOCROpen(true)}
                  className="rounded-xl border-primary text-primary font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-2 shadow-soft hover:bg-primary hover:text-white transition-all"
                >
                  <Scan className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> SCAN HANDWRITTEN
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
             {/* Daily Lesson Plan Format Header */}
             <div className="border-2 border-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden divide-y-2 md:divide-y-0 md:divide-x-2 divide-slate-900 grid grid-cols-1 md:grid-cols-2">
                <div className="divide-y-2 divide-slate-900">
                  <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest min-w-[80px] sm:min-w-[100px]">Subject:</Label>
                    {isTeacher ? (
                      <Select value={subject} onValueChange={setSubject} disabled={selectedGrade === "all"}>
                        <SelectTrigger className="h-8 sm:h-9 border-0 border-b border-slate-400 rounded-none focus:ring-0 px-0 bg-transparent font-bold text-xs sm:text-sm">
                          <SelectValue placeholder={selectedGrade === "all" ? "Select Grade First" : "Select Subject"} />
                        </SelectTrigger>
                        <SelectContent>
                          {assignedSubjectsForSelectedGrade.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-0 bg-transparent font-bold" />
                    )}
                  </div>
                  <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest min-w-[80px] sm:min-w-[100px]">Unit:</Label>
                    <Input value={chapter} onChange={(e) => setChapter(e.target.value)} className="h-8 sm:h-9 border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-0 bg-transparent font-bold text-xs sm:text-sm" />
                  </div>
                  <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest min-w-[80px] sm:min-w-[100px]">Lesson Topic:</Label>
                    <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="h-8 sm:h-9 border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-0 bg-transparent font-bold text-xs sm:text-sm" />
                  </div>
                </div>
                <div className="divide-y-2 divide-slate-900">
                  <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest min-w-[80px] sm:min-w-[100px]">Class:</Label>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger className="h-8 sm:h-9 border-0 border-b border-slate-400 rounded-none focus:ring-0 px-0 bg-transparent font-bold text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">General</SelectItem>
                        {uniqueGrades.map(g => <SelectItem key={g} value={g || "unassigned"}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest min-w-[80px] sm:min-w-[100px]">Period:</Label>
                    <Input value={period} onChange={(e) => setPeriod(e.target.value)} className="h-8 sm:h-9 border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-0 bg-transparent font-bold text-xs sm:text-sm" />
                  </div>
                  <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest min-w-[80px] sm:min-w-[100px]">Date:</Label>
                    <Input type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} className="h-8 sm:h-9 border-0 border-b border-slate-400 rounded-none focus-visible:ring-0 px-0 bg-transparent font-bold text-xs sm:text-sm" />
                  </div>
                </div>
             </div>

             <div className="space-y-1 sm:space-y-1.5">
                <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">1. Learning Outcomes</Label>
                <Textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={3} placeholder="Define what students will master..." className="rounded-xl sm:rounded-2xl bg-card/50 border-muted-foreground/10 text-xs sm:text-sm" />
             </div>

             <div className="space-y-1 sm:space-y-1.5">
                <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">2. Warm up & Review</Label>
                <Textarea value={warmUpReview} onChange={(e) => setWarmUpReview(e.target.value)} rows={3} placeholder="Previous lesson recap and engagement..." className="rounded-xl sm:rounded-2xl bg-card/50 border-muted-foreground/10 text-xs sm:text-sm" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                   <div className="flex items-center justify-between">
                     <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary">3. Teaching Learning Activities</Label>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                        onClick={() => setLearningActivities([...learningActivities, ""])}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                   </div>
                   <div className="space-y-1 sm:space-y-2">
                      {learningActivities.map((act, i) => (
                        <div key={i} className="flex gap-2 items-center group/item">
                           <span className="text-[10px] sm:text-xs font-black text-slate-400 w-4">{String.fromCharCode(97 + i)}.</span>
                           <Input value={act} onChange={(e) => {
                             const n = [...learningActivities]; n[i] = e.target.value; setLearningActivities(n);
                           }} className="h-8 sm:h-9 border-0 border-b border-dotted border-slate-300 rounded-none focus-visible:ring-0 bg-transparent text-[11px] sm:text-xs font-medium flex-1" />
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                              onClick={() => setLearningActivities(learningActivities.filter((_, idx) => idx !== i))}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                   <div className="flex items-center justify-between">
                     <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-violet-600">4. Class Review / Evaluation</Label>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-violet-600/10 text-violet-600 hover:bg-violet-600 hover:text-white transition-all"
                        onClick={() => setEvaluationActivities([...evaluationActivities, ""])}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                   </div>
                   <div className="space-y-1 sm:space-y-2">
                      {evaluationActivities.map((act, i) => (
                        <div key={i} className="flex gap-2 items-center group/item">
                           <span className="text-[10px] sm:text-xs font-black text-slate-400 w-4">{String.fromCharCode(97 + i)}.</span>
                           <Input value={act} onChange={(e) => {
                             const n = [...evaluationActivities]; n[i] = e.target.value; setEvaluationActivities(n);
                           }} className="h-8 sm:h-9 border-0 border-b border-dotted border-slate-300 rounded-none focus-visible:ring-0 bg-transparent text-[11px] sm:text-xs font-medium flex-1" />
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                              onClick={() => setEvaluationActivities(evaluationActivities.filter((_, idx) => idx !== i))}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             <div className="space-y-2 sm:space-y-3">
                <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">5. Assignments</Label>
                <div className="border-2 border-slate-900 md:divide-x-2 divide-slate-900 grid grid-cols-1 md:grid-cols-2 rounded-xl sm:rounded-2xl overflow-hidden">
                  <div className="divide-y-2 divide-slate-900">
                    <div className="bg-slate-50 p-2 text-center font-black uppercase text-[9px] sm:text-[10px]">Class Work</div>
                    <Textarea value={classWork} onChange={(e) => setClassWork(e.target.value)} rows={3} className="border-0 rounded-none focus-visible:ring-0 text-xs sm:text-sm font-medium" />
                  </div>
                  <div className="divide-y-2 divide-slate-900 border-t-2 md:border-t-0 border-slate-900">
                    <div className="bg-slate-50 p-2 text-center font-black uppercase text-[9px] sm:text-[10px]">Home Assignment</div>
                    <Textarea value={homeAssignment} onChange={(e) => setHomeAssignment(e.target.value)} rows={3} className="border-0 rounded-none focus-visible:ring-0 text-xs sm:text-sm font-medium" />
                  </div>
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-muted/10">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm order-3 sm:order-1">CANCEL</Button>
                <Button variant="outline" onClick={() => saveLessonPlan.mutate(false)} className="flex-1 rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest border-2 shadow-soft order-2 sm:order-2 h-10 sm:h-11" disabled={saveLessonPlan.isPending}>SAVE DRAFT</Button>
                <Button onClick={() => saveLessonPlan.mutate(true)} className="flex-[1.5] rounded-xl sm:rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest bg-gradient-to-r from-primary to-violet-600 shadow-strong hover:scale-[1.02] transition-all order-1 sm:order-3 h-10 sm:h-11" disabled={saveLessonPlan.isPending}><Send className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> SUBMIT FOR APPROVAL</Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paste Text Dialog */}
      <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Paste Lesson Plan Content</DialogTitle>
            <DialogDescription>
              Copy the full lesson plan text and paste it below. The system will automatically map the fields.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="TOPIC: ...&#10;SUBJECT: ...&#10;..."
              className="min-h-[300px] rounded-2xl bg-slate-50 border-slate-200"
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsPasteDialogOpen(false)} className="rounded-xl font-bold">CANCEL</Button>
              <Button onClick={handlePasteSubmit} className="rounded-xl font-black bg-gradient-to-r from-violet-600 to-indigo-600">PARSE & POPULATE</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* External Generator Modal */}
      <LessonGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />

      {/* View/Approval Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="w-[98vw] sm:max-w-6xl max-h-[98vh] overflow-y-auto rounded-t-none sm:rounded-3xl p-0 border-none shadow-strong custom-scrollbar">
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
