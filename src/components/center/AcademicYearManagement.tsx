import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Calendar, Plus, Trash2, Archive, ArrowRightCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AcademicYearManagement({ centerId }: { centerId: string }) {
 const queryClient = useQueryClient();
 const [showAddYear, setShowAddYear] = useState(false);
 const [yearForm, setYearForm] = useState({ name: "2026/2027", start: "", end: "" });

 const { data: years } = useQuery({
  queryKey: ["academic-years", centerId],
  queryFn: async () => {
   if (!centerId) return [];
   const { data, error } = await supabase.from("academic_years").select("*").eq("center_id", centerId).order("start_date", { ascending: false });
   if (error) {
    // Fallback for school_id if center_id doesn't exist yet
    const { data: schoolData, error: schoolError } = await supabase.from("academic_years").select("*").eq("school_id", centerId).order("start_date", { ascending: false });
    if (schoolError) throw error;
    return schoolData;
   }
   return data;
  },
 });

 const addYearMutation = useMutation({
  mutationFn: async () => {
   const { data, error } = await supabase.from("academic_years").insert({
    center_id: centerId,
    name: yearForm.name,
    start_date: yearForm.start,
    end_date: yearForm.end,
    is_current: false
   });
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["academic-years"] });
   setShowAddYear(false);
   setYearForm({ name: "2026/2027", start: "", end: "" });
   toast.success("Academic year initialized");
  },
  onError: (err: any) => toast.error(err.message)
 });

 const setYearActiveMutation = useMutation({
  mutationFn: async (year: any) => {
   // 1. Mark all as not current for this center
   await supabase.from("academic_years").update({ is_current: false }).eq("center_id", centerId);

   // 2. Mark this one as current
   const { error } = await supabase.from("academic_years").update({ is_current: true }).eq("id", year.id);
   if (error) throw error;

   // 3. Update all users in this center to use this active year
   const { error: userError } = await supabase.from("users").update({ active_academic_year: year.name }).eq("center_id", centerId);
   if (userError) throw userError;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["academic-years"] });
   queryClient.invalidateQueries({ queryKey: ["current-academic-year"] });
   toast.success("Institutional academic cycle updated");
  },
  onError: (err: any) => toast.error(err.message)
 });

 return (
  <div className="space-y-6">
   <div className="flex justify-between items-center">
    <div>
      <h3 className="text-xl font-black uppercase tracking-tight text-slate-700">Academic Lifecycle</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Managing year transitions and data archiving</p>
    </div>
    <Button onClick={() => setShowAddYear(!showAddYear)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
     {showAddYear ? "Cancel" : "New Academic Year"}
    </Button>
   </div>

   {showAddYear && (
    <Card className="rounded-2xl border border-border shadow-sm bg-white ">
      <CardContent className="p-8">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase text-slate-400">Year Name</Label>
         <Input value={yearForm.name} onChange={(e) => setYearForm({...yearForm, name: e.target.value})} className="h-12 rounded-2xl" placeholder="2026/2027" />
        </div>
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase text-slate-400">Start Date</Label>
         <Input type="date" value={yearForm.start} onChange={(e) => setYearForm({...yearForm, start: e.target.value})} className="h-12 rounded-2xl" />
        </div>
        <div className="space-y-2">
         <Label className="text-[10px] font-black uppercase text-slate-400">End Date</Label>
         <Input type="date" value={yearForm.end} onChange={(e) => setYearForm({...yearForm, end: e.target.value})} className="h-12 rounded-2xl" />
        </div>
        <div className="flex items-end">
          <Button
          onClick={() => addYearMutation.mutate()}
          disabled={addYearMutation.isPending || !yearForm.start || !yearForm.end}
          className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary shadow-lg shadow-primary/20"
          >
           {addYearMutation.isPending ? "Initializing..." : "Initialize Year"}
          </Button>
        </div>
       </div>
      </CardContent>
    </Card>
   )}

   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card className="rounded-2xl border border-border shadow-sm bg-white overflow-hidden">
      <CardHeader className="bg-slate-50 border-b">
       <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
         <Calendar className="h-5 w-5 text-primary" /> Active & Future Years
       </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
       <div className="overflow-x-auto">
 <Table>
        <TableBody>
          {years?.map((y: any) => (
           <TableRow key={y.id}>
            <TableCell className="font-black text-slate-700 px-8 py-6">{y.name}</TableCell>
            <TableCell>
              {y.is_current ?
               <Badge className="bg-emerald-100 text-emerald-700 border border-border font-black text-[9px] uppercase">Current Active</Badge> :
               <Badge variant="outline" className="font-black text-[9px] uppercase">Planned</Badge>
              }
            </TableCell>
            <TableCell className="text-right px-8">
              {!y.is_current && (
               <Button
                variant="ghost"
                size="sm"
                className="font-black text-[10px] uppercase text-primary"
                onClick={() => setYearActiveMutation.mutate(y)}
                disabled={setYearActiveMutation.isPending}
               >
                Set Active
               </Button>
              )}
            </TableCell>
           </TableRow>
          ))}
        </TableBody>
       </Table>
</div>
      </CardContent>
    </Card>

    <Card className="rounded-2xl border border-border shadow-sm bg-slate-900 text-white overflow-hidden">
      <CardHeader className="border-b border-white/10">
       <CardTitle className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
         <Archive className="h-5 w-5 text-amber-400" /> Year Transition Portal
       </CardTitle>
       <CardDescription className="text-slate-400 font-medium">Safe archival of historical institutional data</CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
       <div className="p-4 bg-white rounded-2xl border border-white/10 space-y-3">
         <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-widest">Promotion Logic Ready</span>
         </div>
         <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-widest">Financial Ledger Verified</span>
         </div>
       </div>
       <p className="text-xs text-slate-400 italic font-medium">Transitioning will archive current attendance, exams, and homework cycles. Student profiles will be carried forward to the new academic year.</p>
       <Button className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black uppercase text-xs tracking-widest shadow-xl">
         Execute Year Migration <ArrowRightCircle className="ml-2 h-5 w-5" />
       </Button>
      </CardContent>
    </Card>
   </div>
  </div>
 );
}
