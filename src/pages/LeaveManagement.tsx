import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  MoreVertical,
  Paperclip,
  Loader2,
  Calendar,
  User,
  GraduationCap,
  MessageSquare,
  Eye,
  Check,
  X,
  FileText,
  Settings,
  Plus,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import LeaveCategoryManager from "@/components/LeaveCategoryManager";

export default function LeaveManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Fetch all leave applications for the center
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["center-leave-applications", user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_applications")
        .select(`
          *,
          leave_categories(name),
          students(id, name, grade),
          users!leave_applications_user_id_fkey(username),
          teachers(id, name)
        `)
        .eq("center_id", user?.center_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("leave_applications")
        .update({ status, admin_notes: notes, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["center-leave-applications"] });
      toast.success(`Application ${variables.status} successfully`);
      setIsDetailOpen(false);
      setSelectedApp(null);
      setAdminNotes("");

      // Notify user
      if (selectedApp) {
        createNotificationMutation.mutate({
          userId: selectedApp.user_id,
          status: variables.status
        });
      }
    },
    onError: (error: any) => {
      toast.error("Update failed: " + error.message);
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      if (!user?.center_id) return;

      const { error } = await supabase.from("notifications").insert({
        center_id: user.center_id,
        user_id: userId,
        title: `Leave Application ${status.toUpperCase()}`,
        message: `Your leave application has been ${status}.`,
        type: "leave_status",
        link: selectedApp.teacher_id ? "/teacher/leave" : "/parent-leave"
      });

      if (error) {
        console.error("Failed to send notification:", error);
      }
    }
  });

  const filteredApps = applications.filter((app: any) => {
    const nameMatch =
      (app.students?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.teachers?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.users?.username || "").toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch = statusFilter === "all" || app.status === statusFilter;

    return nameMatch && statusMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const handleApprove = () => {
    if (selectedApp) {
      updateStatusMutation.mutate({ id: selectedApp.id, status: 'approved', notes: adminNotes });
    }
  };

  const handleReject = () => {
    if (selectedApp) {
      updateStatusMutation.mutate({ id: selectedApp.id, status: 'rejected', notes: adminNotes });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Leave Management
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Review and process staff and student leave requests.</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsCategoryOpen(true)}
          className="rounded-2xl h-12 px-6 font-bold shadow-soft gap-2 border-2"
        >
          <Settings className="h-5 w-5" />
          LEAVE CATEGORIES
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card/40 border-muted-foreground/10"
          />
        </div>
        <div className="flex items-center gap-2 bg-card/40 p-1 rounded-xl border border-muted-foreground/10">
          <Button
            variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="rounded-lg h-9 font-bold"
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
            className="rounded-lg h-9 font-bold"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('approved')}
            className="rounded-lg h-9 font-bold"
          >
            Approved
          </Button>
          <Button
            variant={statusFilter === 'rejected' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('rejected')}
            className="rounded-lg h-9 font-bold"
          >
            Rejected
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-[2rem] bg-card/40 backdrop-blur-md border border-border/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow className="border-muted/10 hover:bg-transparent">
                <TableHead className="font-black text-[10px] uppercase tracking-widest pl-6">Applicant</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Type</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Period</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Category</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/40" />
                  </TableCell>
                </TableRow>
              ) : filteredApps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <p className="text-muted-foreground font-bold italic">No leave applications found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApps.map((app: any) => (
                  <TableRow key={app.id} className="border-muted/5 group hover:bg-primary/5 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                          {(app.teachers?.name || app.students?.name || app.users?.username || "?")[0].toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground/90">{app.teachers?.name || app.students?.name || app.users?.username}</p>
                          <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60">
                            {app.teacher_id ? 'Faculty Member' : 'Student'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-600">
                        {app.teacher_id ? <User className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                        <span className="text-[10px] font-black uppercase tracking-tight">{app.teacher_id ? 'Teacher' : 'Student'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-foreground/80">{format(new Date(app.start_date), "MMM d")} - {format(new Date(app.end_date), "MMM d")}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                          {format(new Date(app.start_date), "yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="rounded-lg border-primary/20 text-primary bg-primary/5 font-black text-[10px] uppercase px-2 py-0.5">
                        {app.leave_categories?.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(app.status)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl h-9 w-9 bg-white shadow-soft group-hover:bg-primary group-hover:text-white transition-all"
                        onClick={() => {
                          setSelectedApp(app);
                          setAdminNotes(app.admin_notes || "");
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

      {/* Category Management Dialog */}
      <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Manage Leave Categories</DialogTitle>
            <DialogDescription className="font-medium">
              Add or remove leave types that appear in the application forms.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <LeaveCategoryManager />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCategoryOpen(false)} className="rounded-xl font-bold">
              DONE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl">
          {selectedApp && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center pr-8">
                  <DialogTitle className="text-2xl font-black">Application Details</DialogTitle>
                  {getStatusBadge(selectedApp.status)}
                </div>
                <DialogDescription className="font-medium">
                  Review the leave request submitted by {selectedApp.teachers?.name || selectedApp.students?.name || selectedApp.users?.username}.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Applicant Info</Label>
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      {selectedApp.teachers?.name || selectedApp.students?.name || selectedApp.users?.username}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Role: {selectedApp.teacher_id ? 'Teacher' : 'Student'}
                    </p>
                  </div>
                  <div className="space-y-1.5 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-violet-600/60">Leave Period</Label>
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-violet-600" />
                      {format(new Date(selectedApp.start_date), "MMM d")} - {format(new Date(selectedApp.end_date), "MMM d")}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Total Days: {Math.ceil((new Date(selectedApp.end_date).getTime() - new Date(selectedApp.start_date).getTime()) / (1000 * 3600 * 24)) + 1}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reason for Leave</Label>
                  <div className="p-4 rounded-2xl bg-card border border-muted-foreground/10 italic text-sm font-medium">
                    "{selectedApp.reason || 'No reason provided'}"
                  </div>
                </div>

                {selectedApp.document_url && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Supporting Document</Label>
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl h-12 border-dashed border-2 font-bold justify-start px-6 gap-3"
                      asChild
                    >
                      <a href={selectedApp.document_url} target="_blank" rel="noopener noreferrer">
                        <Paperclip className="w-4 h-4" />
                        VIEW ATTACHED DOCUMENT
                      </a>
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Decision Notes</Label>
                  <Textarea
                    placeholder="Enter approval/rejection notes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="rounded-2xl min-h-[100px] border-muted-foreground/20 focus:ring-primary/20"
                  />
                </div>
              </div>

              <DialogFooter className="gap-3 sm:gap-0">
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-xl font-bold uppercase text-[10px] tracking-widest"
                >
                  CLOSE
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="rounded-xl font-black uppercase text-[10px] tracking-widest border-2 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={handleReject}
                    disabled={updateStatusMutation.isPending || selectedApp.status === 'rejected'}
                  >
                    <X className="w-4 h-4 mr-2" /> REJECT
                  </Button>
                  <Button
                    className="rounded-xl font-black uppercase text-[10px] tracking-widest bg-gradient-to-r from-green-600 to-emerald-600 shadow-soft"
                    onClick={handleApprove}
                    disabled={updateStatusMutation.isPending || selectedApp.status === 'approved'}
                  >
                    <Check className="w-4 h-4 mr-2" /> APPROVE
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
