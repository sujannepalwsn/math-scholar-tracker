import React, { useState } from "react";
import {
  CalendarIcon, CheckCircle2, Download, Eye, FileText,
  Loader2, User, XCircle, Clock, BookOpen, AlertCircle
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { KPICard } from "@/components/dashboard/KPICard"

type LessonPlan = Tables<'lesson_plans'>;

export default function LessonPlanManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingLessonPlan, setViewingLessonPlan] = useState<any>(null);
  const [adminRemarks, setAdminRemarks] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-mgmt", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("teachers")
        .select("id, name")
        .eq("center_id", user.center_id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const { data: lessonPlans = [], isLoading, refetch } = useQuery({
    queryKey: ["lesson-plans-mgmt", user?.center_id, statusFilter, teacherFilter],
    queryFn: async () => {
      if (!user?.center_id) return [];
      console.log("Fetching lesson plans for management...");

      let query = supabase
        .from("lesson_plans")
        .select("*, teachers(name, user_id)")
        .eq("center_id", user.center_id);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (teacherFilter !== "all") query = query.eq("teacher_id", teacherFilter);

      query = query
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string, status: string, remarks?: string }) => {
      if (!user?.id) throw new Error("Authentication required");

      const now = new Date().toISOString();
      console.log(`Actioning plan ${id}: Setting status to ${status}`);

      const updates: any = {
        status,
        updated_at: now
      };

      if (status === 'approved') {
        updates.approved_by = user.id;
        updates.approval_date = now;
        updates.principal_remarks = remarks || "Approved by institutional administration.";
      } else if (status === 'rejected') {
        updates.principal_remarks = remarks || "Rejected. Please revise based on pedagogical guidelines.";
      }

      const { data, error: updateError } = await supabase
        .from("lesson_plans")
        .update(updates)
        .eq("id", id)
        .select();

      if (updateError) {
        console.error("Update failed:", updateError);
        throw updateError;
      }

      console.log("Update succeeded:", data);

      // Async Notification Dispatch
      if (viewingLessonPlan?.teachers?.user_id) {
        supabase.from("notifications").insert({
          user_id: viewingLessonPlan.teachers.user_id,
          center_id: viewingLessonPlan.center_id,
          title: status === 'approved' ? "Plan Approved" : "Plan Rejected",
          message: status === 'approved'
            ? `Certification granted for ${viewingLessonPlan.topic}.`
            : `Plan for ${viewingLessonPlan.topic} was rejected: ${remarks || 'Revision required.'}`,
          type: "lesson_plan",
          link: "/teacher/lesson-plans"
        }).then(({ error: notifyErr }) => {
          if (notifyErr) console.warn("Background notification failed:", notifyErr);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans-mgmt"] });
      toast.success("Institutional status updated successfully");
      setIsViewOpen(false);
      setViewingLessonPlan(null);
      setAdminRemarks("");
    },
    onError: (error: any) => {
      toast.error(`Decision error: ${error.message || "Operation failed"}`);
    }
  });

  const handleViewClick = (lp: any) => {
    setViewingLessonPlan(lp);
    setAdminRemarks(lp.principal_remarks || "");
    setIsViewOpen(true);
  };

  const stats = {
    pending: lessonPlans.filter((lp: any) => lp.status === 'pending').length,
    approved: lessonPlans.filter((lp: any) => lp.status === 'approved').length,
    total: lessonPlans.length
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600 uppercase">
            Curriculum Approval
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Quality Assurance Registry</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl border-2 font-bold px-4 h-10">
          SYNC REGISTRY
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Awaiting Review" value={stats.pending} description="Pedagogical Backlog" icon={Clock} color="orange" />
        <KPICard title="Certified Plans" value={stats.approved} description="Institutional Ready" icon={CheckCircle2} color="green" />
        <KPICard title="Total Records" value={stats.total} description="Combined Registry" icon={BookOpen} color="indigo" />
      </div>

      <Card className="border-none shadow-strong rounded-[2.5rem] bg-card/40 backdrop-blur-md border border-border/20 overflow-hidden">
        <CardHeader className="border-b border-muted/10 bg-muted/5 py-8 px-8">
           <div className="flex flex-wrap gap-6 items-center">
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Lifecycle Stage</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl border-none bg-white shadow-soft h-11 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-strong">
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="pending">Awaiting Review</SelectItem>
                    <SelectItem value="approved">Certified</SelectItem>
                    <SelectItem value="rejected">Revision Required</SelectItem>
                    <SelectItem value="draft">Draft (Visible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px] space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Faculty Member</Label>
                <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                  <SelectTrigger className="rounded-xl border-none bg-white shadow-soft h-11 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-strong">
                    <SelectItem value="all">All Instructors</SelectItem>
                    {teachers.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Establishing Secure Link...</p>
            </div>
          ) : lessonPlans.length === 0 ? (
            <div className="py-32 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted/20 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest italic opacity-50">No plans identified in current segment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/10 bg-muted/5">
                    <TableHead className="pl-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-6">Instructor & Submission</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Subject & Target Grade</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Scheduled Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">State</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessonPlans.map((lp: any) => (
                    <TableRow key={lp.id} className="group border-muted/5 hover:bg-primary/[0.02] transition-colors">
                      <TableCell className="pl-8 py-6">
                        <div className="space-y-1">
                          <p className="font-black text-slate-700 text-sm group-hover:text-primary transition-colors">{lp.teachers?.name || '---'}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            STAMPED: {lp.submitted_at ? format(new Date(lp.submitted_at), "MMM d, HH:mm") : 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase tracking-tighter">
                            {lp.subject}
                          </Badge>
                          <p className="text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase">GRADE {lp.grade || 'GEN'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase tracking-tighter">
                          <CalendarIcon className="h-3.5 w-3.5 text-primary/40" />
                          {lp.lesson_date ? format(new Date(lp.lesson_date), "MMM d, yyyy") : 'TBD'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-widest border-none px-3 py-1.5 rounded-lg shadow-soft",
                          lp.status === 'approved' ? "bg-emerald-500 text-white" :
                          lp.status === 'pending' ? "bg-amber-100 text-amber-700 animate-pulse" :
                          lp.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {lp.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white shadow-soft text-primary hover:bg-primary hover:text-white transition-all" onClick={() => handleViewClick(lp)}>
                          <Eye className="h-5 w-5" />
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-strong p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
          {viewingLessonPlan && (
            <div className="flex flex-col h-full">
               <div className="p-10 border-b bg-primary/5 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                         <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1">{viewingLessonPlan.subject}</Badge>
                         <Badge className="bg-slate-900 text-white border-none text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1">GRADE {viewingLessonPlan.grade || 'GENERAL'}</Badge>
                       </div>
                       <h2 className="text-4xl font-black text-slate-900 leading-tight">{viewingLessonPlan.title || viewingLessonPlan.topic}</h2>
                    </div>
                    <div className="text-right">
                       <Badge className={cn("text-xs font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-soft border-none",
                          viewingLessonPlan.status === 'approved' ? "bg-emerald-500 text-white" :
                          viewingLessonPlan.status === 'pending' ? "bg-amber-500 text-white animate-pulse" :
                          viewingLessonPlan.status === 'rejected' ? "bg-rose-500 text-white" : "bg-slate-400 text-white")}>
                          {viewingLessonPlan.status}
                       </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                     <span className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {viewingLessonPlan.teachers?.name}</span>
                     <span className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-primary" /> EXECUTION: {viewingLessonPlan.lesson_date ? format(new Date(viewingLessonPlan.lesson_date), "PPP") : 'TBD'}</span>
                     <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> SUBMITTED: {viewingLessonPlan.submitted_at ? format(new Date(viewingLessonPlan.submitted_at), "PPP p") : 'N/A'}</span>
                  </div>
               </div>

               <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-10">
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary" /> Learning Objectives
                        </h4>
                        <p className="text-base font-medium text-slate-600 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 leading-relaxed italic shadow-inner">
                          "{viewingLessonPlan.objectives || 'No master objectives specified for this plan.'}"
                        </p>
                     </div>
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary" /> Pedagogical Workflow
                        </h4>
                        <div className="space-y-3">
                           {Array.isArray(viewingLessonPlan.learning_activities) && (viewingLessonPlan.learning_activities as string[]).map((act, i) => (
                              <div key={i} className="flex gap-5 text-sm bg-white p-5 rounded-2xl border border-slate-100 shadow-soft hover:border-primary/20 transition-colors">
                                 <span className="font-black text-primary/30 text-lg">0{i+1}.</span>
                                 <span className="text-slate-700 font-bold leading-relaxed">{act}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-10">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-600 flex items-center gap-3">
                           <div className="h-2 w-2 rounded-full bg-violet-600" /> Evaluation Matrix
                        </h4>
                        <div className="space-y-3">
                           {Array.isArray(viewingLessonPlan.evaluation_activities) && (viewingLessonPlan.evaluation_activities as string[]).map((act, i) => (
                              <div key={i} className="flex gap-5 text-sm bg-violet-50/30 p-5 rounded-2xl border border-violet-100/50 shadow-soft">
                                 <span className="font-black text-violet-400 text-lg">0{i+1}.</span>
                                 <span className="text-slate-700 font-bold leading-relaxed">{act}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assignment</h4>
                           <div className="text-xs font-black text-slate-600 bg-slate-100 p-5 rounded-2xl border border-slate-200 uppercase tracking-tight">{viewingLessonPlan.home_assignment || 'NO HOMEWORK'}</div>
                        </div>
                        <div className="space-y-3">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assets</h4>
                           {viewingLessonPlan.lesson_file_url ? (
                              <Button variant="outline" className="h-14 rounded-2xl border-dashed border-2 w-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all" asChild>
                                 <a href={supabase.storage.from("lesson-files").getPublicUrl(viewingLessonPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4 mr-2" /> View Attached File
                                 </a>
                              </Button>
                           ) : <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] p-5 border-2 border-dashed rounded-2xl text-center">No Assets</div>}
                        </div>
                     </div>
                  </div>
               </div>

               {viewingLessonPlan.status === 'pending' && (
                  <div className="m-10 mt-0 p-10 rounded-[3rem] bg-slate-900 text-white shadow-elevated space-y-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <CheckCircle2 className="h-64 w-64 text-white" />
                     </div>
                     <div className="space-y-3 relative z-10">
                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Institutional Quality Review</Label>
                        <Textarea
                          value={adminRemarks}
                          onChange={(e) => setAdminRemarks(e.target.value)}
                          placeholder="Provide pedagogical feedback or reason for rejection..."
                          className="bg-white/10 border-white/10 text-white placeholder:text-white/20 rounded-[1.5rem] h-32 focus:ring-primary/40 focus:border-primary/40 text-sm font-medium p-6"
                        />
                     </div>
                     <div className="flex gap-6 relative z-10">
                        <Button
                          variant="ghost"
                          className="flex-1 h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] text-rose-400 hover:bg-rose-400/10 hover:text-rose-400 transition-all border border-rose-400/20"
                          onClick={() => updateStatusMutation.mutate({ id: viewingLessonPlan.id, status: 'rejected', remarks: adminRemarks })}
                          disabled={updateStatusMutation.isPending}
                        >
                           {updateStatusMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <XCircle className="h-5 w-5 mr-3" />}
                           Reject Plan
                        </Button>
                        <Button
                          className="flex-[2] h-16 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] bg-emerald-500 hover:bg-emerald-600 text-white shadow-strong transition-all transform hover:scale-[1.02]"
                          onClick={() => updateStatusMutation.mutate({ id: viewingLessonPlan.id, status: 'approved', remarks: adminRemarks })}
                          disabled={updateStatusMutation.isPending}
                        >
                           {updateStatusMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <CheckCircle2 className="h-5 w-5 mr-3" />}
                           Certify Plan
                        </Button>
                     </div>
                  </div>
               )}

               {(viewingLessonPlan.status === 'approved' || viewingLessonPlan.status === 'rejected') && (
                  <div className="mx-10 mb-10 p-10 rounded-[3rem] border-2 border-dashed bg-slate-50/50 shadow-soft">
                     <div className="flex items-center gap-4 mb-6">
                        <div className={cn("p-4 rounded-2xl shadow-soft", viewingLessonPlan.status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                           {viewingLessonPlan.status === 'approved' ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
                        </div>
                        <div>
                           <h4 className="text-lg font-black uppercase tracking-widest">{viewingLessonPlan.status === 'approved' ? "Institutional Approval Dossier" : "Rejection Summary"}</h4>
                           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                             Timestamped on {format(new Date(viewingLessonPlan.approval_date || viewingLessonPlan.updated_at), "PPP p")}
                           </p>
                        </div>
                     </div>
                     <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-slate-600 font-bold leading-relaxed italic text-lg">
                           "{viewingLessonPlan.principal_remarks || 'Protocol executed without additional feedback.'}"
                        </p>
                     </div>
                  </div>
               )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
