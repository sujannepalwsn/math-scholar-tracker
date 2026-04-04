import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { useNavigate } from "react-router-dom";
import { BookOpen, Calendar, Edit, GraduationCap, Plus, Trash2, ListChecks, CheckCircle2, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePagination } from "@/hooks/usePagination"
import { ServerPagination } from "@/components/ui/ServerPagination"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExamSettings from "@/components/center/ExamSettings";
import { hasPermission, hasActionPermission } from "@/utils/permissions";
import { logger } from "@/utils/logger";

const grades = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export default function ExamManagement() {
 const { user } = useAuth();
 const canEdit = hasActionPermission(user, 'exams_results', 'edit');
 const hasFullAccess = hasPermission(user, 'exams_results'); // Kept for viewing sub-sections
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
  exam_type_id: "",
  grading_system_id: "",
 });

 // Subject management for exam
 const [showSubjectDialog, setShowSubjectDialog] = useState(false);
 const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
 const [subjectForm, setSubjectForm] = useState({ subject_name: "", full_marks: "100", pass_marks: "40" });

 const { data: examTypes } = useQuery({
  queryKey: ["exam-types", centerId],
  queryFn: async () => {
   const { data } = await supabase.from("exam_types").select("*").eq("center_id", centerId);
   return data;
  },
  enabled: !!centerId,
 });

 const { data: gradingSystems } = useQuery({
  queryKey: ["grading-systems", centerId],
  queryFn: async () => {
   const { data } = await supabase.from("grading_systems").select("*").eq("center_id", centerId);
   return data;
  },
  enabled: !!centerId,
 });

 const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';
 const { currentPage, pageSize, setPage, getRange } = usePagination(10);

 const { data: examsData, isLoading } = useQuery({
  queryKey: ["exams", centerId, isRestricted, user?.teacher_id, user?.id, currentPage, pageSize],
  queryFn: async () => {
   if (!centerId) return { data: [], count: 0 };
   const { from, to } = getRange();
   let query = supabase
    .from("exams")
    .select("*", { count: 'exact' })
    .eq("center_id", centerId)
    .order("created_at", { ascending: false });

   if (isRestricted) {
    // Teacher restricted mode: only exams they created OR exams for their assigned grades
    const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user?.teacher_id);
    const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user?.teacher_id);
    const myGrades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

    const conditions = [`created_by.eq.${user?.id}`];
    if (myGrades.length > 0) {
     myGrades.forEach(g => {
      conditions.push(`grade.eq."${g}"`);
      conditions.push(`applicable_grades.cs.{"${g}"}`);
     });
    }
    query = query.or(conditions.join(','));
   }

   const { data, error, count } = await query.range(from, to);
   if (error) throw error;
   return { data: data || [], count: count || 0 };
  },
  enabled: !!centerId,
 });

 const exams = examsData?.data || [];
 const totalCount = examsData?.count || 0;

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
   if (!canEdit) throw new Error("Access Denied: You do not have permission to manage exams.");
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
   if (!canEdit) throw new Error("Access Denied: You do not have permission to delete exams.");
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
   if (!hasActionPermission(user, 'exams_results', 'publish')) throw new Error("Access Denied: You do not have permission to publish exam routines.");
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
   if (!hasActionPermission(user, 'exams_results', 'publish')) throw new Error("Access Denied: You do not have permission to publish results.");
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
     const { error: notifError } = await supabase.from("notifications").insert(notifications);
     if (notifError) logger.error("Notification error:", notifError);
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
   if (!canEdit) throw new Error("Access Denied: You do not have permission to manage exam subjects.");
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
   if (!canEdit) throw new Error("Access Denied: You do not have permission to delete exam subjects.");
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
   status: "draft",
   exam_type_id: "",
   grading_system_id: "",
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
   exam_type_id: exam.exam_type_id || "",
   grading_system_id: exam.grading_system_id || "",
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
  <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div className="space-y-2">
     <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
       <GraduationCap className="h-8 w-8 text-primary animate-pulse" />
      </div>
      <div>
       <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
        Examination Hub
       </h1>
       <div className="flex items-center gap-2 mt-1">
         <div className="h-2 w-2 rounded-full bg-primary" />
         <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Formal Assessment Control</p>
       </div>
      </div>
     </div>
    </div>
   </div>

   <Tabs defaultValue="exams" className="space-y-8">
    <TabsList className="flex flex-nowrap overflow-x-auto w-full bg-white border border-slate-100 p-1 rounded-2xl h-14 shadow-sm ">
     <TabsTrigger value="exams" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Exams</TabsTrigger>
     <TabsTrigger value="settings" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-sm">Settings & Scales</TabsTrigger>
    </TabsList>

    <TabsContent value="exams" className="space-y-6 outline-none">
     {canEdit && (
      <div className="flex justify-end">
       <Button onClick={() => setShowForm(true)} className="rounded-xl shadow-sm font-black uppercase text-[10px] tracking-widest h-11 px-6">
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
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-1">
        <Label>Exam Type</Label>
        <Select value={formData.exam_type_id} onValueChange={(v) => setFormData({...formData, exam_type_id: v})}>
         <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
         <SelectContent>
          {examTypes?.map((t: any) => (
           <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>
       <div className="space-y-1">
        <Label>Grading System</Label>
        <Select value={formData.grading_system_id} onValueChange={(v) => setFormData({...formData, grading_system_id: v})}>
         <SelectTrigger><SelectValue placeholder="System" /></SelectTrigger>
         <SelectContent>
          {gradingSystems?.map((gs: any) => (
           <SelectItem key={gs.id} value={gs.id}>{gs.name}</SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>
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
       <div className="overflow-x-auto">
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
</div>
      )}
     </div>
    </DialogContent>
   </Dialog>

   {/* Exam List */}
   <div className="grid gap-6">
    {isLoading ? (
     <Card className="border border-border shadow-sm bg-white rounded-2xl"><CardContent className="p-12 text-center text-muted-foreground font-medium italic">Synchronizing exam registry...</CardContent></Card>
    ) : exams.length === 0 ? (
     <Card className="border border-border shadow-sm bg-white rounded-2xl"><CardContent className="p-12 text-center text-muted-foreground font-medium italic">No examinations identified in the current session.</CardContent></Card>
    ) : (
     exams.map((exam: any) => (
      <Card key={exam.id} className="border border-border shadow-sm bg-white rounded-2xl overflow-hidden group hover:shadow-sm transition-all duration-300 border border-white/20">
       <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
         <div className="flex gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
           <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
          <div className="flex items-center gap-3">
           <h3 className="text-xl font-black text-slate-700">{exam.name}</h3>
           <Badge
            variant={exam.status === "results_published" ? "default" : exam.status === "published" ? "secondary" : "outline"}
            className={cn(
             "rounded-lg px-2 py-0.5 font-black text-[10px] tracking-tight uppercase border border-border shadow-sm",
             exam.status === "results_published" && "bg-emerald-500/10 text-emerald-600",
             exam.status === "published" && "bg-amber-500/10 text-amber-600",
             exam.status === "draft" && "bg-slate-500/10 text-slate-500"
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
         </div>
         <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {canEdit && (
           <Button variant="outline" size="sm" onClick={() => { setSelectedExamId(exam.id); setShowSubjectDialog(true); }} className="rounded-xl font-bold text-xs shadow-sm bg-white h-9">
            <BookOpen className="h-3 w-3 mr-2" /> Subjects
           </Button>
          )}

          {exam.status === "draft" && canEdit && (
           <>
            <Button variant="outline" size="sm" onClick={() => handleEdit(exam)} className="rounded-xl font-bold text-xs shadow-sm bg-white h-9">
             <Edit className="h-3 w-3 mr-2" /> Edit
            </Button>
            {hasActionPermission(user, 'exams_results', 'publish') && (
             <Button variant="outline" size="sm" onClick={() => publishExam.mutate(exam.id)} className="rounded-xl font-bold text-xs shadow-sm bg-white h-9">
              <ListChecks className="h-3 w-3 mr-2" /> Routine
             </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => deleteExam.mutate(exam.id)} className="rounded-xl font-bold text-xs shadow-sm bg-white h-9 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200">
             <Trash2 className="h-3 w-3" />
            </Button>
           </>
          )}

          {exam.status === "published" && (
           <>
            <Button variant="outline" size="sm" onClick={() => navigate(`/marks-entry?examId=${exam.id}`)} className="rounded-xl font-bold text-xs shadow-sm bg-white h-9">
             <Edit className="h-3 w-3 mr-2" /> Entry
            </Button>
            {hasActionPermission(user, 'exams_results', 'publish') && (
             <Button
              variant="outline"
              size="sm"
              onClick={() => publishResults.mutate(exam)}
              disabled={publishResults.isPending}
              className="rounded-xl font-bold text-xs shadow-sm bg-white h-9 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
             >
              <GraduationCap className="h-3 w-3 mr-2" /> Publish
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
    {totalCount > pageSize && (
     <div className="p-4 bg-white rounded-2xl border border-white/20 shadow-sm">
      <ServerPagination
       currentPage={currentPage}
       pageSize={pageSize}
       totalCount={totalCount}
       onPageChange={setPage}
      />
     </div>
    )}
   </div>
    </TabsContent>
    <TabsContent value="settings" className="outline-none">
     <ExamSettings centerId={centerId || ""} />
    </TabsContent>
   </Tabs>
  </div>
 );
}
