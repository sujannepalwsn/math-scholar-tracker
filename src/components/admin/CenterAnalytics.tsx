import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Database, Server, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CenterAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-center-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_analytics_view").select("id")
        .order("name");

      if (error) throw error;

      return data.map(center => ({
        ...center,
        students: center.students_count || 0,
        teachers: center.teachers_count || 0,
        parents: center.parents_count || 0,
        activeNow: center.active_now_count || 0
      }));
    },
  });

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black uppercase tracking-tight">Institutional Analytics Matrix</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="rounded-2xl border shadow-soft bg-blue-500/5">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600"><Users className="h-6 w-6" /></div>
               <div>
                  <p className="text-[10px] font-black uppercase text-blue-600/60 leading-none mb-1">Total Students</p>
                  <p className="text-2xl font-black text-blue-700">{analytics?.reduce((acc, c) => acc + c.students, 0) || 0}</p>
               </div>
            </CardContent>
         </Card>
         <Card className="rounded-2xl border shadow-soft bg-emerald-500/5">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600"><UserCheck className="h-6 w-6" /></div>
               <div>
                  <p className="text-[10px] font-black uppercase text-emerald-600/60 leading-none mb-1">Total Teachers</p>
                  <p className="text-2xl font-black text-emerald-700">{analytics?.reduce((acc, c) => acc + c.teachers, 0) || 0}</p>
               </div>
            </CardContent>
         </Card>
         <Card className="rounded-2xl border shadow-soft bg-indigo-500/5">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600"><Activity className="h-6 w-6" /></div>
               <div>
                  <p className="text-[10px] font-black uppercase text-indigo-600/60 leading-none mb-1">Active Now</p>
                  <p className="text-2xl font-black text-indigo-700">{analytics?.reduce((acc, c) => acc + c.activeNow, 0) || 0}</p>
               </div>
            </CardContent>
         </Card>
         <Card className="rounded-2xl border shadow-soft bg-slate-500/5">
            <CardContent className="p-6 flex items-center gap-4">
               <div className="p-3 bg-slate-500/10 rounded-xl text-slate-600"><Server className="h-6 w-6" /></div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-600/60 leading-none mb-1">Total Centers</p>
                  <p className="text-2xl font-black text-slate-700">{analytics?.length || 0}</p>
               </div>
            </CardContent>
         </Card>
      </div>

      <Card className="rounded-[2.5rem] border shadow-strong overflow-hidden bg-card/40 backdrop-blur-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
  <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead className="px-8 py-4 font-black uppercase text-[10px] tracking-widest">Center Entity</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Students</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Teachers</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Parents</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right px-8">Real-time Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-8 py-5">
                    <p className="font-black text-slate-700">{c.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{c.short_code || 'No Code'}</p>
                  </TableCell>
                  <TableCell className="font-bold text-slate-600">{c.students}</TableCell>
                  <TableCell className="font-bold text-slate-600">{c.teachers}</TableCell>
                  <TableCell className="font-bold text-slate-600">{c.parents}</TableCell>
                  <TableCell className="text-right px-8">
                     <div className="flex items-center justify-end gap-2">
                        <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", c.activeNow > 0 ? "bg-emerald-500" : "bg-slate-300")} />
                        <span className="font-black text-xs text-slate-700">{c.activeNow} Online</span>
                     </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
</div>
        </CardContent>
      </Card>
    </div>
  );
}
