import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
  Loader2,
  Trash2,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LeaveApplications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [studentId, setStudentId] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");

  const isParent = user?.role === 'parent';
  const isTeacher = user?.role === 'teacher';

  // Fetch leave categories
  const { data: categories = [] } = useQuery({
    queryKey: ["leave-categories", user?.center_id, user?.role],
    queryFn: async () => {
      let query = supabase
        .from("leave_categories")
        .select("*").eq('center_id', user?.center_id)
        .eq("is_active", true);

      if (user?.center_id) {
        query = query.or(`center_id.is.null,center_id.eq.${user.center_id}`);
      } else {
        query = query.is("center_id", null);
      }

      if (isParent) {
        query = query.in("applicable_to", ["student", "both"]);
      } else if (isTeacher) {
        query = query.in("applicable_to", ["teacher", "both"]);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch linked students if parent
  const { data: linkedStudents = [] } = useQuery({
    queryKey: ["linked-students", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_students")
        .select("student_id, students(id, name)").eq('center_id', user?.center_id)
        .eq("parent_user_id", user?.id!);
      if (error) throw error;
      return data.map((d: any) => d.students);
    },
    enabled: isParent && !!user?.id,
  });

  // Fetch user's leave applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["my-leave-applications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_applications")
        .select("*, leave_categories(name), students(name)").eq('center_id', user?.center_id)
        .eq("user_id", user?.id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('leave-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('leave-documents')
        .getPublicUrl(filePath);

      setDocumentUrl(publicUrl);
      toast.success("Document uploaded successfully");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        center_id: user?.center_id,
        user_id: user?.id,
        start_date: startDate,
        end_date: endDate,
        category_id: categoryId,
        reason,
        document_url: documentUrl,
        status: 'pending',
      };

      if (isParent) {
        payload.student_id = studentId;
      } else if (isTeacher) {
        payload.teacher_id = user?.teacher_id;
      }

      const { error } = await supabase.from("leave_applications").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-applications"] });
      toast.success("Leave application submitted successfully");
      setIsDialogOpen(false);
      resetForm();

      // Send notification to admin (conceptual, as per instructions)
      createNotificationMutation.mutate();
    },
    onError: (error: any) => {
      toast.error("Submission failed: " + error.message);
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) return;

      const { error } = await supabase.from("notifications").insert({
        center_id: user.center_id,
        title: "New Leave Application",
        message: `${user?.username || 'A user'} has submitted a new leave application.`,
        type: "leave_request",
        user_id: null, // Broadcast to center admins
      });

      if (error) {
        console.error("Failed to send notification:", error);
      }
    }
  });

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setCategoryId("");
    setReason("");
    setStudentId("");
    setDocumentUrl("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Leave Applications
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Manage and track your time-off requests.</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-12 px-6 font-bold shadow-soft hover:shadow-medium transition-all gap-2">
              <Plus className="h-5 w-5" />
              NEW APPLICATION
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Submit Leave Request</DialogTitle>
              <DialogDescription className="font-medium">
                Fill in the details for your leave application. All fields are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {isParent && (
                <div className="space-y-2">
                  <Label htmlFor="student" className="text-xs font-bold uppercase tracking-wider">Select Student</Label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger className="h-11 rounded-xl bg-card/50 border-muted-foreground/10">
                      <SelectValue placeholder="Select child" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkedStudents.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-xs font-bold uppercase tracking-wider">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 rounded-xl bg-card/50 border-muted-foreground/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-xs font-bold uppercase tracking-wider">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-11 rounded-xl bg-card/50 border-muted-foreground/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider">Leave Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-11 rounded-xl bg-card/50 border-muted-foreground/10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain the reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-xl bg-card/50 border-muted-foreground/10 min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Supporting Document (Optional)</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11 border-dashed border-2 flex-1"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Paperclip className="w-4 h-4 mr-2" />}
                    {documentUrl ? "Document Linked" : "Upload Document"}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl font-bold"
              >
                CANCEL
              </Button>
              <Button
                className="rounded-xl font-black px-8 bg-gradient-to-r from-primary to-violet-600 shadow-soft"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !startDate || !endDate || !categoryId}
              >
                {submitMutation.isPending ? "SUBMITTING..." : "SUBMIT REQUEST"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
          </div>
        ) : applications.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent shadow-none rounded-[2rem] py-20">
            <CardContent className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/5 text-primary/40">
                <FileText className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-foreground/70">No Leave History</p>
                <p className="text-muted-foreground font-medium">You haven't submitted any leave applications yet.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(true)}
                className="rounded-xl font-bold border-2"
              >
                Submit Your First Application
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {applications.map((app) => (
              <Card key={app.id} className="group border-none shadow-soft hover:shadow-medium transition-all duration-300 rounded-[2rem] bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
                <CardHeader className="pb-4 bg-primary/5 border-b border-primary/5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-primary/60" />
                        <span className="text-xs font-black text-primary/80 uppercase tracking-widest">
                          {format(new Date(app.start_date), "MMM d")} - {format(new Date(app.end_date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <CardTitle className="text-xl font-black">
                        {app.leave_categories?.name}
                      </CardTitle>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {isParent && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/5 text-violet-600">
                      <User className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-tight">Student: {app.students?.name}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Reason for Leave</Label>
                    <p className="text-sm font-medium text-foreground/80 leading-relaxed line-clamp-3 italic">
                      "{app.reason || 'No reason provided'}"
                    </p>
                  </div>

                  {app.admin_notes && (
                    <div className="space-y-1.5 p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-600/60">Admin Response</Label>
                      <p className="text-xs font-bold text-orange-700 leading-tight">
                        {app.admin_notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-muted/20">
                    <div className="flex gap-2">
                      {app.document_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8 px-3 rounded-lg text-primary font-bold hover:bg-primary/10"
                        >
                          <a href={app.document_url} target="_blank" rel="noopener noreferrer">
                            <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                            DOCUMENT
                          </a>
                        </Button>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">
                      Applied {format(new Date(app.created_at), "MMM d")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
