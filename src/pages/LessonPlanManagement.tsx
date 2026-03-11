import React, { useState } from "react";
import {
  Check,
  X,
  Eye,
  FileText,
  Calendar,
  User,
  Download,
  Loader2,
  Search,
  Filter
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function LessonPlanManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch lesson plans for management
  const { data: lessonPlans = [], isLoading } = useQuery({
    queryKey: ["center-lesson-plans-management", user?.center_id, statusFilter],
    queryFn: async () => {
      if (!user?.center_id) return [];

      let query = supabase
        .from("lesson_plans")
        .select(`
          *,
          teachers(name)
        `)
        .eq("center_id", user.center_id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("lesson_plans")
        .update({
          status,
          admin_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      if (error) throw error;

      // Send notification to teacher
      if (selectedPlan?.teacher_id) {
        // We need the user_id for the teacher. Usually it's in the teachers table
        const { data: teacherData } = await supabase
          .from("teachers")
          .select("user_id")
          .eq("id", selectedPlan.teacher_id)
          .single();

        if (teacherData?.user_id) {
          await supabase.from("notifications").insert({
            center_id: user?.center_id,
            user_id: teacherData.user_id,
            title: `Lesson Plan ${status.toUpperCase()}`,
            message: `Your lesson plan for ${selectedPlan.subject} has been ${status}.`,
            type: "lesson_plan_status",
          });
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["center-lesson-plans-management"] });
      toast.success(`Lesson plan ${variables.status} successfully`);
      setIsDetailOpen(false);
      setSelectedPlan(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast.error("Update failed: " + error.message);
    },
  });

  const filteredPlans = lessonPlans.filter((lp: any) => {
    const searchMatch =
      (lp.chapter || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lp.topic || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lp.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lp.teachers?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Lesson Plan Management
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Review and authorize curriculum roadmaps.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by chapter, topic, subject or teacher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card/40 border-muted-foreground/10"
          />
        </div>
        <div className="flex items-center gap-2 bg-card/40 p-1 rounded-xl border border-muted-foreground/10">
          {['all', 'pending', 'approved', 'rejected'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="rounded-lg h-9 font-bold capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-[2rem] bg-card/40 backdrop-blur-md border border-border/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="border-muted/10 hover:bg-transparent">
                <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Teacher & Subject</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chapter & Topic</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Grade</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Planned Date</TableHead>
                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/40" />
                  </TableCell>
                </TableRow>
              ) : filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <p className="text-muted-foreground font-bold italic">No lesson plans found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((lp: any) => (
                  <TableRow key={lp.id} className="border-muted/5 group hover:bg-primary/5 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground/90">{lp.teachers?.name || "Unknown Teacher"}</p>
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 border-primary/10 text-primary">
                            {lp.subject}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-foreground/80">{lp.chapter}</p>
                        <p className="text-[10px] font-medium text-muted-foreground truncate max-w-[200px]">{lp.topic}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-black uppercase">
                        {lp.grade || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(lp.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {lp.lesson_date ? format(new Date(lp.lesson_date), "MMM d, yyyy") : "No date"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-9 w-9 bg-white shadow-soft hover:bg-primary hover:text-white transition-all"
                        onClick={() => {
                          setSelectedPlan(lp);
                          setAdminNotes("");
                          setIsDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl">
          {selectedPlan && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center pr-8">
                  <DialogTitle className="text-2xl font-black">Review Lesson Plan</DialogTitle>
                  {getStatusBadge(selectedPlan.status)}
                </div>
                <DialogDescription className="font-medium">
                  Review the instructional roadmap submitted by {selectedPlan.teachers?.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Subject & Grade</Label>
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {selectedPlan.subject}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Grade: {selectedPlan.grade || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1.5 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600/60">Target Date</Label>
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-violet-600" />
                      {selectedPlan.lesson_date ? format(new Date(selectedPlan.lesson_date), "MMM d, yyyy") : "Not set"}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Created: {format(new Date(selectedPlan.created_at), "MMM d")}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chapter & Topic</Label>
                  <div className="p-4 rounded-2xl bg-card border border-muted-foreground/10">
                    <p className="font-black text-lg text-primary">{selectedPlan.chapter}</p>
                    <p className="text-sm font-medium text-foreground/70 italic mt-1">{selectedPlan.topic}</p>
                  </div>
                </div>

                {selectedPlan.notes && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Teacher Notes</Label>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-muted-foreground/10 text-sm whitespace-pre-wrap">
                      {selectedPlan.notes}
                    </div>
                  </div>
                )}

                {selectedPlan.lesson_file_url && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instructional Resource</Label>
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl h-12 border-dashed border-2 font-bold justify-start px-6 gap-3"
                      asChild
                    >
                      <a href={supabase.storage.from("lesson-files").getPublicUrl(selectedPlan.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                        DOWNLOAD PLAN ATTACHMENT
                      </a>
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Admin Feedback (Optional)</Label>
                  <Textarea
                    placeholder="Enter feedback for the teacher..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="rounded-2xl min-h-[100px] border-muted-foreground/20"
                  />
                </div>
              </div>

              <DialogFooter className="gap-3 sm:gap-0 mt-6 pt-6 border-t border-muted/20">
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-xl font-bold uppercase text-[10px] tracking-widest"
                >
                  DISMISS
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="rounded-xl font-black uppercase text-[10px] tracking-widest border-2 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => updateStatusMutation.mutate({ id: selectedPlan.id, status: 'rejected', notes: adminNotes })}
                    disabled={updateStatusMutation.isPending || selectedPlan.status === 'rejected'}
                  >
                    <X className="w-4 h-4 mr-2" /> REJECT
                  </Button>
                  <Button
                    className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-green-600 to-emerald-600 shadow-soft"
                    onClick={() => updateStatusMutation.mutate({ id: selectedPlan.id, status: 'approved', notes: adminNotes })}
                    disabled={updateStatusMutation.isPending || selectedPlan.status === 'approved'}
                  >
                    <Check className="w-4 h-4 mr-2" /> AUTHORIZE
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
