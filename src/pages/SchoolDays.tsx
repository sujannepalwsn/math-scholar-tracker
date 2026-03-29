import React, { useState } from "react";
import { CalendarIcon, Plus, Trash2, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AcademicYearManagement from "@/components/center/AcademicYearManagement";
import { hasActionPermission } from "@/utils/permissions";

const CLOSURE_REASONS = [
  "Holiday",
  "Exam",
  "Special closure",
  "Emergency closure",
  "Staff Training",
  "Weekend",
  "Other"
];

export default function SchoolDays() {
  const { user } = useAuth();
  const canEdit = hasActionPermission(user, 'school_days', 'edit');
  const queryClient = useQueryClient();
  const centerId = user?.center_id;

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  // For individual entry
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSchoolDay, setIsSchoolDay] = useState(true);
  const [reason, setReason] = useState("");
  const { page, setPage, pageSize, setPageSize } = usePagination();

  const { data: schoolDaysData, isLoading } = useQuery({
    queryKey: ["school-days", centerId, selectedMonth, page, pageSize],
    queryFn: async () => {
      if (!centerId) return { data: [], count: 0 };
      const start = format(startOfMonth(new Date(selectedMonth)), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date(selectedMonth)), "yyyy-MM-dd");

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("school_days")
        .select("*", { count: "exact" })
        .eq("center_id", centerId)
        .gte("date", start)
        .lte("date", end)
        .order("date")
        .range(from, to);

      if (error) throw error;
      return { data, count: count || 0 };
    },
    enabled: !!centerId,
    placeholderData: (previousData) => previousData
  });

  const schoolDays = schoolDaysData?.data || [];
  const totalRows = schoolDaysData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!centerId) throw new Error("Center ID is missing");
      if (!canEdit) throw new Error("Access Denied: You do not have permission to modify school days.");

      const upsertData: any = {
        center_id: centerId,
        date: payload.date,
        is_school_day: payload.is_school_day
      };

      // Only add reason if it's explicitly provided and not null,
      // to avoid issues if the column is missing in Postgrest cache
      if (payload.reason) {
        upsertData.reason = payload.reason;
      }

      const { error } = await supabase
        .from("school_days")
        .upsert(upsertData, { onConflict: 'center_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-days"] });
      toast.success("School day settings updated");
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to remove calendar overrides.");
      const { error } = await supabase.from("school_days").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-days"] });
      toast.success("Restriction removed");
    }
  });

  const handleToggle = (day: any) => {
    upsertMutation.mutate({
      date: day.date,
      is_school_day: !day.is_school_day,
      reason: day.reason
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <CalendarIcon className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Institutional Calendar
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Academic Cycles & Operations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="days" className="space-y-8">
        <TabsList className="flex flex-nowrap overflow-x-auto w-full bg-white/50 border border-slate-100 p-1 rounded-2xl h-14 shadow-soft backdrop-blur-md">
          <TabsTrigger value="days" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-soft">Operational Days</TabsTrigger>
          <TabsTrigger value="years" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:shadow-soft">Academic Years</TabsTrigger>
        </TabsList>

        <TabsContent value="days" className="outline-none">
      <div className="grid gap-8 lg:grid-cols-3">
        {canEdit ? (
          <Card className="lg:col-span-1 border-none shadow-strong rounded-[2rem] bg-card/40 backdrop-blur-md h-fit border border-white/20">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6">
              <CardTitle className="text-xl font-black uppercase tracking-widest">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Target Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 bg-white/50 border-none shadow-soft rounded-xl font-bold" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Operational Day</label>
                  <p className="text-[9px] text-muted-foreground font-bold italic uppercase tracking-tight">Toggle off for closure</p>
                </div>
                <Switch checked={isSchoolDay} onCheckedChange={setIsSchoolDay} />
              </div>
              {!isSchoolDay && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Reason for Closure</label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="h-11 bg-white/50 border-none shadow-soft rounded-xl font-bold">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLOSURE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="w-full h-14 text-sm font-black shadow-strong rounded-2xl bg-gradient-to-r from-primary to-violet-600 hover:scale-[1.01] transition-all duration-300"
                onClick={() => upsertMutation.mutate({ date, is_school_day: isSchoolDay, reason: isSchoolDay ? null : reason })}
                disabled={upsertMutation.isPending}
              >
                {upsertMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "COMMIT CONFIGURATION"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="lg:col-span-1 p-8 rounded-[2rem] border-2 border-dashed border-muted flex items-center justify-center text-center italic text-muted-foreground text-sm font-medium">
             Configuration controls are restricted to administrators.
          </div>
        )}

        <Card className="lg:col-span-2 border-none shadow-strong rounded-[2rem] bg-card/40 backdrop-blur-md border border-white/20">
          <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black uppercase tracking-widest">Calendar Registry</CardTitle>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-44 h-11 rounded-xl bg-white/50 border-none shadow-soft font-bold"
            />
          </CardHeader>
          <CardContent className="p-0">
          {isLoading && !schoolDays.length ? (
            <TableSkeleton columns={4} rows={pageSize} />
            ) : schoolDays.length === 0 ? (
              <div className="text-center py-12 bg-muted/5 rounded-3xl border border-dashed border-muted/20">
                <p className="text-muted-foreground font-medium italic">No overrides configured for this month. All days are operational by default.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Status</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest">Reason</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolDays.map((sd) => (
                      <TableRow key={sd.id}>
                        <TableCell className="font-bold">{format(new Date(sd.date), "PPP")}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase border-none px-2 py-1",
                            sd.is_school_day ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {sd.is_school_day ? "Operational" : "Closed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground italic">
                          {sd.reason || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" onClick={() => handleToggle(sd)}>
                                  {sd.is_school_day ? <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive" onClick={() => deleteMutation.mutate(sd.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <ServerPagination
              currentPage={page}
              totalPages={totalPages}
              totalRows={totalRows}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="years" className="outline-none">
          <AcademicYearManagement centerId={centerId || ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
