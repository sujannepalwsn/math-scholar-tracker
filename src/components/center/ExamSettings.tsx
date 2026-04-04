import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Settings2 } from "lucide-react";

export default function ExamSettings({ centerId }: { centerId: string }) {
 const queryClient = useQueryClient();
 const [examTypeName, setExamTypeName] = useState("");
 const [gradingName, setGradingName] = useState("");
 const [gradingRanges, setGradingRanges] = useState([
  { grade: "A+", min: 90, max: 100, gpa: 4.0 },
  { grade: "A", min: 80, max: 89, gpa: 3.6 },
  { grade: "B+", min: 70, max: 79, gpa: 3.2 },
  { grade: "B", min: 60, max: 69, gpa: 2.8 },
  { grade: "C+", min: 50, max: 59, gpa: 2.4 },
  { grade: "C", min: 40, max: 49, gpa: 2.0 },
  { grade: "D", min: 35, max: 39, gpa: 1.6 },
  { grade: "F", min: 0, max: 34, gpa: 0.0 },
 ]);

 const { data: examTypes } = useQuery({
  queryKey: ["exam-types", centerId],
  queryFn: async () => {
   const { data, error } = await supabase.from("exam_types").select("*").eq("center_id", centerId);
   if (error) throw error;
   return data;
  },
 });

 const { data: gradingSystems } = useQuery({
  queryKey: ["grading-systems", centerId],
  queryFn: async () => {
   const { data, error } = await supabase.from("grading_systems").select("*").eq("center_id", centerId);
   if (error) throw error;
   return data;
  },
 });

 const createExamType = useMutation({
  mutationFn: async () => {
   const { error } = await supabase.from("exam_types").insert({ center_id: centerId, name: examTypeName });
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["exam-types"] });
   setExamTypeName("");
   toast.success("Exam type created");
  }
 });

 const createGradingSystem = useMutation({
  mutationFn: async () => {
   const { error } = await supabase.from("grading_systems").insert({
    center_id: centerId,
    name: gradingName,
    ranges: gradingRanges
   });
   if (error) throw error;
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["grading-systems"] });
   setGradingName("");
   toast.success("Grading system created");
  }
 });

 return (
  <div className="grid md:grid-cols-2 gap-6">
   <Card className="rounded-2xl border border-border shadow-sm overflow-hidden bg-white ">
    <CardHeader className="bg-primary/5 border-b border-slate-100">
     <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center gap-2">
      <Settings2 className="h-5 w-5" /> Custom Exam Types
     </CardTitle>
    </CardHeader>
    <CardContent className="p-6 space-y-4">
     <div className="flex gap-2">
      <Input
       placeholder="e.g. Practical, Mid-Term"
       value={examTypeName}
       onChange={(e) => setExamTypeName(e.target.value)}
       className="rounded-xl h-11"
      />
      <Button onClick={() => createExamType.mutate()} disabled={!examTypeName} className="rounded-xl h-11 px-6"><Plus className="h-4 w-4" /></Button>
     </div>
     <div className="space-y-2">
      {examTypes?.map((t: any) => (
       <div key={t.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-slate-50">
        <span className="font-bold text-slate-700">{t.name}</span>
        <Button variant="ghost" size="sm" className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
       </div>
      ))}
     </div>
    </CardContent>
   </Card>

   <Card className="rounded-2xl border border-border shadow-sm overflow-hidden bg-white ">
    <CardHeader className="bg-primary/5 border-b border-slate-100">
     <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center gap-2">
      <Settings2 className="h-5 w-5" /> Grading Scales
     </CardTitle>
    </CardHeader>
    <CardContent className="p-6 space-y-4">
     <div className="flex gap-2">
      <Input
       placeholder="e.g. Standard 4.0 GPA"
       value={gradingName}
       onChange={(e) => setGradingName(e.target.value)}
       className="rounded-xl h-11"
      />
      <Button onClick={() => createGradingSystem.mutate()} disabled={!gradingName} className="rounded-xl h-11 px-6"><Plus className="h-4 w-4" /></Button>
     </div>
     <div className="space-y-4">
      {gradingSystems?.map((gs: any) => (
       <div key={gs.id} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-50">
        <div className="flex justify-between items-center mb-2">
         <span className="font-black text-sm uppercase tracking-wider text-primary">{gs.name}</span>
         <Button variant="ghost" size="sm" className="text-rose-500 h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2 mb-2">
         <span>Grade</span><span>Min</span><span>Max</span><span>GPA</span>
        </div>
        {gs.ranges.map((r: any, idx: number) => (
         <div key={idx} className="grid grid-cols-4 gap-2 text-xs py-1 border-b border-slate-50 last:border border-border">
          <span className="font-bold">{r.grade}</span><span>{r.min}%</span><span>{r.max}%</span><span className="text-primary font-bold">{r.gpa}</span>
         </div>
        ))}
       </div>
      ))}
     </div>
    </CardContent>
   </Card>
  </div>
 );
}
