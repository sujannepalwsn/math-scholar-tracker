import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import {
  CalendarIcon, CheckCircle2, Download, Eye, FileText,
  Filter, Loader2, Search, User, XCircle, AlertCircle,
  TrendingUp, BookOpen, Clock, Plus
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { KPICard } from "@/components/dashboard/KPICard"
import { hasActionPermission } from "@/utils/permissions";

type LessonPlan = Tables<'lesson_plans'>;

export default function LessonPlanManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingLessonPlan, setViewingLessonPlan] = useState<LessonPlan & { teachers?: { name: string } } | null>(null);
  const [adminRemarks, setAdminRemarks] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-grades-mgmt", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("students").select("grade").eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-mgmt", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase.from("teachers").select("id, name").eq("center_id", user.center_id).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  const { data: lessonPlans = [], isLoading } = useQuery({
    queryKey: ["lesson-plans-mgmt", user?.center_id, statusFilter, subjectFilter, gradeFilter, teacherFilter, isRestricted],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("lesson_plans")
        .select("*, teachers(name)")
        .eq("center_id", user.center_id)
        .order("submitted_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (subjectFilter !== "all") query = query.eq("subject", subjectFilter);
      if (gradeFilter !== "all") query = query.eq("grade", gradeFilter);
      if (teacherFilter !== "all") query = query.eq("teacher_id", teacherFilter);

      if (isRestricted) {
        query = query.eq('teacher_id', user?.teacher_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string, status: string, remarks?: string }) => {
      const updates: any = { status };
      if (status === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
        updates.principal_remarks = remarks || null;
      } else if (status === 'rejected') {
        updates.rejection_reason = remarks || null;
      }

      const { error } = await supabase.from("lesson_plans").update(updates).eq("id", id);
      if (error) throw error;

      // Notify Teacher
      if (viewingLessonPlan?.teacher_id) {
        const { data: teacherUser } = await supabase.from("teachers").select("user_id").eq("id", viewingLessonPlan.teacher_id).single();
        if (teacherUser?.user_id) {
          await supabase.from("notifications").insert({
            user_id: teacherUser.user_id,
            center_id: user?.center_id,
            title: status === 'approved' ? "Lesson Plan Approved" : "Lesson Plan Rejected",
            message: status === 'approved' ? `Your lesson plan for ${viewingLessonPlan.topic} has been approved.` : `Your lesson plan for ${viewingLessonPlan.topic} was rejected. Reason: ${remarks}`,
            type: "lesson_plan",
            link: "/teacher/lesson-plans"
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans-mgmt"] });
      toast.success("Status updated successfully!");
      setIsViewOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to update status")
  });

  const handleViewClick = (lp: any) => {
    setViewingLessonPlan(lp);
    setAdminRemarks(lp.status === 'rejected' ? lp.rejection_reason || "" : lp.principal_remarks || "");
    setIsViewOpen(true);
  };

  const stats = {
    pending: lessonPlans.filter(lp => lp.status === 'pending').length,
    approved: lessonPlans.filter(lp => lp.status === 'approved').length,
    rejected: lessonPlans.filter(lp => lp.status === 'rejected').length,
    total: lessonPlans.length
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
                Plan Oversight
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Institutional Review & Quality Assurance Nexus</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button onClick={() => navigate("/lesson-plans")} size="sm" className="rounded-xl h-10 px-4 font-bold shadow-soft transition-all gap-2">
            <Plus className="h-4 w-4" /> CREATE PLAN
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Pending Review"
          value={stats.pending}
          description="Awaiting approval"
          icon={Clock}
          color="orange"
          onClick={() => setStatusFilter("pending")}
          className={cn(statusFilter === "pending" && "ring-2 ring-orange-500")}
        />
        <KPICard
          title="Approved Plans"
          value={stats.approved}
          description="Certified roadmaps"
          icon={CheckCircle2}
          color="green"
          onClick={() => setStatusFilter("approved")}
          className={cn(statusFilter === "approved" && "ring-2 ring-green-500")}
        />
        <KPICard
          title="Rejected"
          value={stats.rejected}
          description="Needs revision"
          icon={XCircle}
          color="rose"
          onClick={() => setStatusFilter("rejected")}
          className={cn(statusFilter === "rejected" && "ring-2 ring-rose-500")}
        />
        <KPICard
          title="Total Processed"
          value={stats.total}
          description="Combined registry"
          icon={BookOpen}
          color="indigo"
          onClick={() => setStatusFilter("all")}
          className={cn(statusFilter === "all" && "ring-2 ring-primary")}
        />
      </div>

      <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/10 pb-6">
           <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl border-none bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Teacher</Label>
                <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                  <SelectTrigger className="rounded-xl border-none bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Grade</Label>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="rounded-xl border-none bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {uniqueGrades.map(g => (
                      <SelectItem key={g} value={g || "unassigned"}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : lessonPlans.length === 0 ? (
            <div className="py-20 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No lesson plans found matching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/10">
                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plan Details</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Teacher</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject/Grade</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessonPlans.map((lp) => (
                    <TableRow key={lp.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="font-bold text-foreground/90">{lp.title || lp.topic}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">REF: {lp.id.slice(0,8)}</div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-600">{lp.teachers?.name || '---'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[9px] font-black uppercase">{lp.subject}</Badge>
                          <span className="text-[10px] font-bold text-slate-400">GRADE {lp.grade || 'ALL'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] font-bold text-slate-600">
                        {format(new Date(lp.lesson_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-widest border-none px-2 py-1",
                          lp.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                          lp.status === 'pending' ? "bg-amber-100 text-amber-700" :
                          lp.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {lp.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleViewClick(lp)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 sm:p-6">
          <DialogHeader className="p-6 pb-0 sm:p-0">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Lesson Plan Review</DialogTitle>
            <DialogDescription>Detailed view for approving or rejecting a lesson plan.</DialogDescription>
          </DialogHeader>
          {viewingLessonPlan && (
            <div className="space-y-8 p-6 pt-4 sm:p-0">
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
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">Objectives</h4>
                        <p className="text-sm font-medium text-slate-600 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 leading-relaxed italic">"{viewingLessonPlan.objectives || 'None specified.'}"</p>
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">Learning Activities</h4>
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
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 flex items-center gap-2">Evaluation Strategy</h4>
                        <div className="space-y-2">
                           {Array.isArray(viewingLessonPlan.evaluation_activities) && (viewingLessonPlan.evaluation_activities as string[]).map((act, i) => (
                              <div key={i} className="flex gap-3 text-sm bg-violet-50/50 p-3 rounded-xl border border-violet-100">
                                 <span className="font-black text-violet-400">{i+1}.</span>
                                 <span className="text-slate-700 font-medium">{act}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assignment</h4>
                        <div className="text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{viewingLessonPlan.home_assignment || 'N/A'}</div>
                     </div>
                     {viewingLessonPlan.lesson_file_url && (
                        <Button variant="outline" size="sm" className="h-9 rounded-xl border-dashed border-2 w-full text-[10px] font-black uppercase tracking-tighter" asChild>
                           <a href={supabase.storage.from("lesson-files").getPublicUrl(viewingLessonPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3 mr-2" /> View Attachment
                           </a>
                        </Button>
                     )}
                  </div>
               </div>

               {viewingLessonPlan.status === 'pending' && (
                 <>
                   {hasActionPermission(user, 'lesson_plans', 'approve') ? (
                    <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-strong space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Institutional Review Notes</Label>
                            <Textarea
                              value={adminRemarks}
                              onChange={(e) => setAdminRemarks(e.target.value)}
                              placeholder="Provide feedback or justification for rejection..."
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-2xl h-24"
                            />
                        </div>
                        <div className="flex gap-4">
                            <Button
                              variant="ghost"
                              className="flex-1 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest text-rose-400 hover:bg-rose-400/10"
                              onClick={() => updateStatusMutation.mutate({ id: viewingLessonPlan.id, status: 'rejected', remarks: adminRemarks })}
                              disabled={updateStatusMutation.isPending}
                            >
                              Reject Plan
                            </Button>
                            <Button
                              className="flex-[2] h-12 rounded-xl font-black uppercase text-[10px] tracking-widest bg-emerald-500 hover:bg-emerald-600"
                              onClick={() => updateStatusMutation.mutate({ id: viewingLessonPlan.id, status: 'approved', remarks: adminRemarks })}
                              disabled={updateStatusMutation.isPending}
                            >
                              Grant Approval
                            </Button>
                        </div>
                    </div>
                   ) : (
                    <div className="p-6 rounded-3xl border-2 border-dashed bg-amber-50/50 border-amber-100">
                        <p className="text-sm font-medium text-amber-700 italic flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> You do not have permission to approve or reject lesson plans.
                        </p>
                    </div>
                   )}
                 </>
               )}

               {(viewingLessonPlan.status === 'approved' || viewingLessonPlan.status === 'rejected') && (
                  <div className={cn("p-6 rounded-3xl border-2 border-dashed",
                     viewingLessonPlan.status === 'approved' ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100")}>
                     <h4 className="text-sm font-black uppercase tracking-widest mb-2">{viewingLessonPlan.status === 'approved' ? "Approval Record" : "Rejection Dossier"}</h4>
                     <p className="text-sm font-medium text-slate-700 italic">
                        "{viewingLessonPlan.status === 'approved' ? viewingLessonPlan.principal_remarks : viewingLessonPlan.rejection_reason || 'No remarks provided.'}"
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
