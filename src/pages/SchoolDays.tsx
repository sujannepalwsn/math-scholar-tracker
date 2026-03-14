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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

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
  const queryClient = useQueryClient();
  const centerId = user?.center_id;

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isBulkMode, setIsBulkMode] = useState(false);

  // For individual entry
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSchoolDay, setIsSchoolDay] = useState(true);
  const [reason, setReason] = useState("");

  const { data: schoolDays = [], isLoading } = useQuery({
    queryKey: ["school-days", centerId, selectedMonth],
    queryFn: async () => {
      if (!centerId) return [];
      const start = format(startOfMonth(new Date(selectedMonth)), "yyyy-MM-dd");
      const end = format(endOfMonth(new Date(selectedMonth)), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("school_days")
        .select("*")
        .eq("center_id", centerId)
        .gte("date", start)
        .lte("date", end)
        .order("date");

      if (error) throw error;
      return data;
    },
    enabled: !!centerId
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("school_days")
        .upsert({ ...payload, center_id: centerId }, { onConflict: 'center_id,date' });
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
    <div className="space-y-8 animate-in fade-in duration-1000">
      <PageHeader
        title="School Days Management"
        description="Control institutional operations and attendance availability."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-none shadow-strong rounded-3xl bg-card/40 backdrop-blur-md h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase tracking-widest">Configuration</CardTitle>
            <CardDescription>Mark a specific date as non-operational.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-xs font-black uppercase tracking-wider">Operational Day</Label>
                <p className="text-[10px] text-muted-foreground font-medium italic">Toggle off to disable attendance</p>
              </div>
              <Switch checked={isSchoolDay} onCheckedChange={setIsSchoolDay} />
            </div>
            {!isSchoolDay && (
              <div className="space-y-2">
                <Label>Reason for Closure</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOSURE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full rounded-xl font-black tracking-widest uppercase text-[10px]"
              onClick={() => upsertMutation.mutate({ date, is_school_day: isSchoolDay, reason: isSchoolDay ? null : reason })}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Configuration"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-strong rounded-3xl bg-card/40 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-widest">Calendar Registry</CardTitle>
              <CardDescription>Override list for operational days.</CardDescription>
            </div>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40 h-10 rounded-xl"
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft" onClick={() => handleToggle(sd)}>
                              {sd.is_school_day ? <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive" onClick={() => deleteMutation.mutate(sd.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
