import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, isBefore, startOfDay, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  Calendar,
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
  Loader2,
  Trash2,
  User,
  AlertTriangle
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
import { compressImage } from "@/lib/image-utils";
import { Switch } from "@/components/ui/switch";
import { hasActionPermission } from "@/utils/permissions";
import { usePagination } from "@/hooks/use-pagination";
import { ServerPagination } from "@/components/ui/server-pagination";

export default function LeaveApplications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isMidDay, setIsMidDay] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const isParent = user?.role === 'parent';
  const { page, pageSize, setPage, setPageSize } = usePagination(12);

  // Fetch leave categories
  const { data: categories = [] } = useQuery({
    queryKey: ['leave-categories', user?.center_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_categories')
        .select('*')
        .eq('center_id', user?.center_id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id
  });

  // Fetch user's leave applications
  const { data: applicationsData, isLoading } = useQuery({
    queryKey: ['my-leave-applications', user?.id, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('leave_applications')
        .select('*, leave_categories(name), students(name)', { count: 'exact' });

      if (isParent && user?.student_id) {
        query = query.eq('student_id', user.student_id);
      } else {
        query = query.eq('teacher_id', user?.teacher_id);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      return { data, count: count || 0 };
    },
    enabled: !!user?.id
  });

  const applications = applicationsData?.data || [];
  const totalRows = applicationsData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let finalFile = file;
      if (file.type.startsWith('image/')) {
        finalFile = await compressImage(file);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `leave-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, finalFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setDocumentUrl(publicUrl);
      toast.success("Document uploaded successfully");
    } catch (error: any) {
      toast.error("Error uploading document: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        center_id: user?.center_id,
        leave_category_id: categoryId,
        start_date: startDate,
        end_date: isMidDay ? startDate : endDate,
        reason,
        document_url: documentUrl,
        status: 'pending',
        leave_type: isMidDay ? 'mid_day' : 'full_day'
      };

      if (isMidDay) {
        payload.start_time = startTime;
        payload.end_time = endTime;
      }

      if (isParent) {
        payload.student_id = user?.student_id;
        payload.applied_by_parent_id = user?.id;
      } else {
        payload.teacher_id = user?.teacher_id;
      }

      const { error } = await supabase
        .from('leave_applications')
        .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-applications'] });
      toast.success("Leave application submitted successfully");
      setIsDialogOpen(false);
      // Reset form
      setStartDate("");
      setEndDate("");
      setReason("");
      setCategoryId("");
      setDocumentUrl("");
      setIsMidDay(false);
      setStartTime("");
      setEndTime("");
    },
    onError: (error: any) => {
      toast.error("Error submitting application: " + error.message);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" className="h-5 px-1.5 text-[8px] font-black uppercase">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="h-5 px-1.5 text-[8px] font-black uppercase">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase">Pending</Badge>;
    }
  };

  const canApply = hasActionPermission(user, 'leave_management', 'edit');

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Calendar className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Absence Protocol
              </h1>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Personal Leave Lifecycle Management</p>
            </div>
          </div>
        </div>

        {canApply && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-2xl shadow-strong h-12 px-6 text-sm font-black bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.02] transition-all">
                <Plus className="h-5 w-5 mr-2" /> REQUEST LEAVE
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Leave Application</DialogTitle>
                <DialogDescription className="font-medium">
                  Submit a formal request for institutional absence.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="flex items-center space-x-2 bg-muted/30 p-4 rounded-2xl border">
                  <Switch
                    id="mid-day"
                    checked={isMidDay}
                    onCheckedChange={setIsMidDay}
                  />
                  <Label htmlFor="mid-day" className="font-bold text-sm">Short Duration / Mid-Day Leave</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-xs font-bold uppercase tracking-wider">{isMidDay ? "Date" : "Start Date"}</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-11 rounded-xl bg-card/50 border-muted-foreground/10"
                    />
                  </div>
                  {!isMidDay && (
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
                  )}
                </div>

                {isMidDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider">From Time</Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-11 rounded-xl bg-card/50 border-muted-foreground/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider">To Time</Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-11 rounded-xl bg-card/50 border-muted-foreground/10"
                      />
                    </div>
                  </div>
                )}

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
                    className="rounded-xl bg-card/50 border-muted-foreground/10 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">Supporting Document</Label>
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
                  disabled={submitMutation.isPending || !startDate || (!isMidDay && !endDate) || !categoryId}
                >
                  {submitMutation.isPending ? "SUBMITTING..." : "SUBMIT REQUEST"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6">
        {isLoading && !applications.length ? (
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
              {canApply && (
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(true)}
                  className="rounded-xl font-bold border-2"
                >
                  Submit Your First Application
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {applications.map((app) => (
                <Card key={app.id} className="group border-none shadow-soft hover:shadow-medium transition-all duration-300 rounded-[2rem] bg-card/40 backdrop-blur-md overflow-hidden border border-white/20">
                  <CardHeader className="pb-4 bg-primary/5 border-b border-primary/5">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-primary/60" />
                          <span className="text-xs font-black text-primary/80 uppercase tracking-widest">
                            {format(new Date(app.start_date), "MMM d")}
                            {app.start_date !== app.end_date && ` - ${format(new Date(app.end_date), "MMM d, yyyy")}`}
                          </span>
                          {app.leave_type === "emergency" && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[8px] font-black uppercase">Emergency</Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl font-black">
                          {app.leave_categories?.name}
                        </CardTitle>
                        {app.start_time && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                            <Clock className="w-3 h-3" />
                            {app.start_time.slice(0, 5)} - {app.end_time?.slice(0, 5)}
                          </div>
                        )}
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
            <div className="mt-8 flex justify-center">
              <ServerPagination
                currentPage={page}
                totalPages={totalPages}
                totalRows={totalRows}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
