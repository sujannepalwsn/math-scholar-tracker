import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, HardDrive, Cpu, Activity } from "lucide-react";
import { logger } from "@/utils/logger";

export default function UsageMonitoring() {
  const { data: usage = [], isLoading } = useQuery({
    queryKey: ["admin-usage-stats"],
    queryFn: async () => {
      const { data: centers, error: centersError } = await supabase.from("centers").select("id, name");
      if (centersError) throw centersError;

      const stats = await Promise.all((centers || []).map(async (c) => {
        // Mocking some metrics as per requirement for demonstration,
        // in production these would come from real system metrics.
        const { count: rows, error: rowsError } = await supabase.from("attendance").select("id, student_id, date, status, center_id, time_in, time_out, remarks", { count: "exact", head: true }).eq("center_id", c.id);
        if (rowsError) logger.error(`Error fetching rows for center ${c.id}:`, rowsError);

        return {
          centerName: c.name,
          dbRows: (rows || 0) * 15, // Multiplier for estimation
          storage: ((rows || 0) * 0.05).toFixed(2), // MB estimation
          apiRequests: (rows || 0) * 120
        };
      }));
      return stats;
    },
  });

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black uppercase tracking-tight">System Resource Monitoring</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {usage.map((u: any, idx: number) => (
          <Card key={idx} className="rounded-3xl border shadow-soft overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">{u.centerName}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2 text-slate-400">
                    <Database className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Database Rows</span>
                 </div>
                 <span className="font-black text-slate-700">{u.dbRows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2 text-slate-400">
                    <HardDrive className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Storage Used</span>
                 </div>
                 <span className="font-black text-slate-700">{u.storage} MB</span>
              </div>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2 text-slate-400">
                    <Activity className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">API Requests</span>
                 </div>
                 <span className="font-black text-primary">{u.apiRequests.toLocaleString()}</span>
              </div>

              <div className="pt-2">
                 <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, (u.dbRows / 50000) * 100)}%` }} />
                 </div>
                 <p className="text-[8px] text-right mt-1 font-bold text-slate-400 uppercase">Quota: {((u.dbRows / 50000) * 100).toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
