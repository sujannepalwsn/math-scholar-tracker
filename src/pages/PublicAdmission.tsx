import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, GraduationCap, School } from "lucide-react";

export default function PublicAdmission() {
 const [submitted, setSubmitted] = useState(false);
 const [formData, setFormData] = useState({
  centerId: "",
  studentName: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  appliedGrade: ""
 });

 const { data: centers = [] } = useQuery({
  queryKey: ["public-centers"],
  queryFn: async () => {
   const { data, error } = await supabase.from("centers").select("id, name");
   if (error) throw error;
   return data;
  }
 });

 const submitMutation = useMutation({
  mutationFn: async () => {
   const { error } = await supabase.from("admission_applications").insert({
    center_id: formData.centerId,
    student_name: formData.studentName,
    parent_name: formData.parentName,
    parent_email: formData.parentEmail,
    parent_phone: formData.parentPhone,
    applied_grade: formData.appliedGrade,
   });
   if (error) throw error;
  },
  onSuccess: () => {
   setSubmitted(true);
   toast.success("Application submitted successfully!");
  },
  onError: (error: any) => {
   toast.error(error.message || "Submission failed");
  }
 });

 if (submitted) {
  return (
   <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
    <Card className="max-w-md w-full rounded-2xl border border-border shadow-sm text-center p-12">
     <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
      <CheckCircle2 className="h-10 w-10" />
     </div>
     <h2 className="text-3xl font-black uppercase tracking-tight text-slate-800 mb-2">Application Logged</h2>
     <p className="text-slate-500 font-medium">Thank you for your interest. Our admissions office will review your application and contact you via the provided details.</p>
     <Button onClick={() => setSubmitted(false)} variant="ghost" className="mt-8 font-black uppercase text-[10px] tracking-widest">Submit Another</Button>
    </Card>
   </div>
  );
 }

 return (
  <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 py-12">
   <div className="mb-12 text-center">
     <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
      <GraduationCap className="h-8 w-8" />
     </div>
     <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Nexis Admission Portal</h1>
     <p className="text-slate-500 font-medium tracking-wide">Begin your child's academic journey with our network.</p>
   </div>

   <Card className="max-w-2xl w-full rounded-2xl border border-border shadow-sm bg-white overflow-hidden">
    <CardHeader className="bg-slate-900 text-white p-10">
     <CardTitle className="text-2xl font-black uppercase tracking-tight">Prospective Student Registry</CardTitle>
     <CardDescription className="text-slate-400 font-medium">Please provide accurate information for the initial evaluation.</CardDescription>
    </CardHeader>
    <CardContent className="p-10 space-y-8">
     <div className="space-y-4">
       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Institution *</Label>
        <Select value={formData.centerId} onValueChange={(v) => setFormData({...formData, centerId: v})}>
          <SelectTrigger className="h-12 rounded-xl border-slate-200">
           <SelectValue placeholder="Select a School" />
          </SelectTrigger>
          <SelectContent>
           {centers.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
           ))}
          </SelectContent>
        </Select>
       </div>

       <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Full Name *</Label>
          <Input value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Applied Grade *</Label>
          <Input value={formData.appliedGrade} onChange={e => setFormData({...formData, appliedGrade: e.target.value})} className="h-12 rounded-xl" placeholder="e.g. 5" />
        </div>
       </div>

       <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Guardian Name *</Label>
        <Input value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} className="h-12 rounded-xl" />
       </div>

       <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Email</Label>
          <Input type="email" value={formData.parentEmail} onChange={e => setFormData({...formData, parentEmail: e.target.value})} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Phone *</Label>
          <Input value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} className="h-12 rounded-xl" />
        </div>
       </div>
     </div>

     <Button
      onClick={() => submitMutation.mutate()}
      disabled={!formData.centerId || !formData.studentName || !formData.parentPhone || submitMutation.isPending}
      className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all"
     >
      {submitMutation.isPending ? "Transmitting..." : "Submit Formal Application"}
     </Button>
     <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">By submitting, you agree to our data processing protocols.</p>
    </CardContent>
   </Card>
  </div>
 );
}
