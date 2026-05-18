import React, { useState } from "react";
import { UserRole } from "@/types/roles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, isBefore, startOfDay, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
  Loader2,
  User,
  AlertTriangle,
  Send
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
import { logger } from "@/utils/logger";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";

export default function ParentLeave() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    if (user?.student_id) return user.student_id;
    const linked = (user?.linked_students as any[]) || [];
    if (linked.length > 0) return typeof linked[0] === 'string' ? linked[0] : linked[0].id;
    return null;
  });

  const activeStudentId = selectedStudentId;

  // Form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [leaveType, setLeaveType] = useState<"regular" | "emergency">("regular");
  const [isMidDay, setIsMidDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  // Fetch leave categories
  const { data: categories = [] } = useQuery({
    queryKey: ["leave-categories", user?.center_id],
    queryFn: async () => {
      let query = supabase
        .from("leave_categories")
        .select("*")
        .eq("is_active", true)
        .in("applicable_to", ["student", "both"]);

      if (user?.center_id) {
        query = query.or(`center_id.is.null,center_id.eq."${user.center_id}"`);
      } else {
        query = query.is("center_id", null);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch student's leave applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["student-leave-applications", activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return [];
      const { data, error } = await supabase
        .from("leave_applications")
        .select("*, leave_categories(name), students(name)")
        .eq("student_id", activeStudentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudentId,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let finalFile: File | Blob = file;
      if (file.type.startsWith('image/')) {
        finalFile = await compressImage(file, 100);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `leaves/${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('leave-documents')
        .upload(filePath, finalFile);

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
      if (!activeStudentId) return;

      const payload: any = {
        center_id: user?.center_id,
        user_id: user?.id,
        student_id: activeStudentId,
        start_date: startDate,
        end_date: isMidDay ? startDate : endDate,
        category_id: categoryId,
        reason,
        document_url: documentUrl,
        status: 'pending',
        leave_type: leaveType,
        start_time: isMidDay ? startTime : null,
        end_time: isMidDay ? endTime : null,
      };

      const { error } = await supabase.from("leave_applications").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-leave-applications"] });
      toast.success("Leave application submitted successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Submission failed: " + error.message);
    },
  });

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setCategoryId("");
    setReason("");
    setDocumentUrl("");
    setLeaveType("regular");
    setIsMidDay(false);
    setStartTime("09:00");
    setEndTime("17:00");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter p-4 md:p-8 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
            Leave Applications
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl">
            Draft and submit leave requests for your child. Track approval status and response from the school administration.
          </p>
          <ChildSwitcher selectedId={activeStudentId} onSelect={setSelectedStudentId} />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl h-14 px-8 font-black text-sm uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all gap-3">
              <Plus className="h-5 w-5" />
              Draft Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl max-h-[95vh] overflow-y-auto border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">New Leave Request</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                Provide details for the absence period.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-slate-700">Emergency Leave</Label>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Critical/Immediate Absence</p>
                </div>
                <Switch
                  checked={leaveType === "emergency"}
                  onCheckedChange={(checked) => setLeaveType(checked ? "emergency" : "regular")}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-indigo-700">Mid-Day Leave</Label>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase">Partial day absence</p>
                </div>
                <Switch
                  checked={isMidDay}
                  onCheckedChange={setIsMidDay}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isMidDay ? "Leave Date" : "Start Date"}
                  </Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-slate-900 font-bold"
                  />
                </div>
                {!isMidDay && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-slate-900 font-bold"
                    />
                  </div>
                )}
              </div>

              {isMidDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">From Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">To Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leave Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold">
                    <SelectValue placeholder="Select reason type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detailed Reason</Label>
                <Textarea
                  placeholder="Explain the reason for absence..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-xl bg-slate-50 border-slate-200 min-h-[100px] font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supporting Document (Optional)</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-12 border-dashed border-2 flex-1 font-bold text-slate-500"
                    onClick={() => document.getElementById('parent-file-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Paperclip className="w-4 h-4 mr-2" />}
                    {documentUrl ? "Document Attached" : "Attach Medical/Support Note"}
                  </Button>
                  <input
                    id="parent-file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl font-bold text-slate-500"
              >
                CANCEL
              </Button>
              <Button
                className="rounded-xl font-black px-8 bg-slate-900 text-white shadow-lg h-12"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !startDate || (!isMidDay && !endDate) || !categoryId || !activeStudentId}
              >
                {submitMutation.isPending ? "SENDING..." : "SUBMIT REQUEST"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-slate-200" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Records...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
            <div className="p-6 rounded-full bg-white shadow-soft">
              <FileText className="w-12 h-12 text-slate-200" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black text-slate-900">No Leave History</p>
              <p className="text-slate-500 font-medium max-w-sm">You haven't submitted any leave requests for this child yet.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {applications.map((app) => (
              <Card key={app.id} className="group border-none shadow-medium hover:shadow-strong transition-all duration-500 rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden flex flex-col">
                <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100 p-8">
                  <div className="flex justify-between items-start mb-4">
                    {getStatusBadge(app.status)}
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-slate-200">
                      {app.leave_type}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-black text-slate-900">
                      {app.leave_categories?.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                      <CalendarIcon className="w-4 h-4" />
                      <span>
                        {format(new Date(app.start_date), "MMM d")}
                        {app.start_date !== app.end_date && ` - ${format(new Date(app.end_date), "MMM d")}`}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6 flex-1 flex flex-col">
                  <div className="space-y-2 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</p>
                    <p className="text-slate-600 font-medium leading-relaxed italic">
                      "{app.reason || 'No specific reason provided.'}"
                    </p>
                  </div>

                  {app.admin_notes && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Admin Response</p>
                      <p className="text-sm font-bold text-amber-900 leading-tight">
                        {app.admin_notes}
                      </p>
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {app.document_url && (
                        <a
                          href={app.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-colors"
                        >
                          <Paperclip className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Ref: {app.id.slice(0, 8)}
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
