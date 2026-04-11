import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Eye, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function AdmissionWorkflow({ centerId, canEdit }: { centerId: string, canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admission-applications", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_applications").select("id, name, email, status")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to update application status.");
      const { error } = await supabase
        .from("admission_applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;

      if (status === "Application Approved") {
        // Automatically create student profile
        const app = applications?.find((a: any) => a.id === id);
        if (app) {
          const { error: studentError } = await supabase.from("students").insert({
            name: app.student_name,
            grade: app.applied_grade,
            parent_name: app.parent_name,
            parent_email: app.parent_email,
            parent_phone: app.parent_phone,
            center_id: centerId,
            is_active: true,
          });
          if (studentError) throw studentError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-applications", centerId] });
      queryClient.invalidateQueries({ queryKey: ["students", centerId] });
      toast.success("Application status updated");
      setSelectedApp(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const [showPublicForm, setShowPublicForm] = useState(false);
  const [publicFormData, setPublicFormData] = useState({
    studentName: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    appliedGrade: ""
  });

  const submitPublicMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admission_applications").insert({
        center_id: centerId,
        student_name: publicFormData.studentName,
        parent_name: publicFormData.parentName,
        parent_email: publicFormData.parentEmail,
        parent_phone: publicFormData.parentPhone,
        applied_grade: publicFormData.appliedGrade,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      toast.success("Application submitted successfully!");
      setShowPublicForm(false);
      setPublicFormData({ studentName: "", parentName: "", parentEmail: "", parentPhone: "", appliedGrade: "" });
    }
  });

  if (isLoading) return <div>Loading applications...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold uppercase tracking-wider text-slate-700">Admission Pipeline</h3>
        <Button onClick={() => setShowPublicForm(true)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
           Open Public Application Form
        </Button>
      </div>

      <div className="border rounded-2xl overflow-hidden bg-white shadow-soft">
        <div className="overflow-x-auto">
  <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Student</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Grade</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Parent</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications?.map((app: any) => (
              <TableRow key={app.id}>
                <TableCell className="font-bold text-sm">{app.student_name}</TableCell>
                <TableCell><Badge variant="outline">Grade {app.applied_grade}</Badge></TableCell>
                <TableCell className="text-xs text-slate-500">{app.parent_name} ({app.parent_phone})</TableCell>
                <TableCell>
                  <Badge className={cn(
                    "text-[10px] font-black uppercase tracking-tight",
                    app.status === "Application Approved" ? "bg-emerald-100 text-emerald-700" :
                    app.status === "Rejected" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {app.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedApp(app)}><Eye className="h-4 w-4" /></Button>
                  {canEdit && (
                    <>
                      {app.status === "Application Submitted" || app.status === "Application Under Review" ? (
                        <>
                          <Button variant="ghost" size="icon" className="text-emerald-600" onClick={() => updateStatusMutation.mutate({ id: app.id, status: "Application Approved" })}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => updateStatusMutation.mutate({ id: app.id, status: "Rejected" })}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : app.status === "Application Approved" && (
                        <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase" onClick={() => updateStatusMutation.mutate({ id: app.id, status: "Enrollment Completed" })}>
                           Complete Enrollment
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
</div>
      </div>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Review full application for {selectedApp?.student_name}</DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 font-black uppercase text-[10px]">Student Name</p>
                  <p className="font-bold">{selectedApp.student_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-black uppercase text-[10px]">Applied Grade</p>
                  <p className="font-bold">Grade {selectedApp.applied_grade}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-black uppercase text-[10px]">Parent Name</p>
                  <p className="font-bold">{selectedApp.parent_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-black uppercase text-[10px]">Parent Contact</p>
                  <p className="font-bold">{selectedApp.parent_phone}</p>
                </div>
              </div>
              <div>
                <p className="text-slate-400 font-black uppercase text-[10px]">Additional Data</p>
                <pre className="mt-2 p-3 bg-slate-50 rounded-xl text-[10px] overflow-auto max-h-40">
                  {JSON.stringify(selectedApp.application_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPublicForm} onOpenChange={setShowPublicForm}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] bg-indigo-900 text-white border-none shadow-strong">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase text-white">Public Admission Portal</DialogTitle>
            <DialogDescription className="text-indigo-200">Prospective student registration form</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-indigo-300">Student Full Name</Label>
                <Input value={publicFormData.studentName} onChange={e => setPublicFormData({...publicFormData, studentName: e.target.value})} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="e.g. Rahul Sharma" />
             </div>
             <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-indigo-300">Guardian Name</Label>
                <Input value={publicFormData.parentName} onChange={e => setPublicFormData({...publicFormData, parentName: e.target.value})} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-indigo-300">Contact Phone</Label>
                  <Input value={publicFormData.parentPhone} onChange={e => setPublicFormData({...publicFormData, parentPhone: e.target.value})} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-indigo-300">Applied Grade</Label>
                  <Input value={publicFormData.appliedGrade} onChange={e => setPublicFormData({...publicFormData, appliedGrade: e.target.value})} className="bg-white/10 border-white/20 text-white placeholder:text-white/40" placeholder="e.g. 5" />
                </div>
             </div>
             <Button onClick={() => submitPublicMutation.mutate()} className="w-full h-12 rounded-2xl bg-white text-indigo-900 font-black uppercase text-xs tracking-widest mt-4 hover:bg-indigo-50">
                Submit Application
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
