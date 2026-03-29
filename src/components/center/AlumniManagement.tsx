import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, GraduationCap, Archive, History, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function AlumniManagement({ centerId, canEdit }: { centerId: string, canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Graduated");
  const [selectedStudentForTC, setSelectedStudentForTC] = useState<any>(null);
  const [tcData, setTcData] = useState({
    reason: "",
    leavingDate: new Date().toISOString().split('T')[0]
  });
  const { page, pageSize, setPage, setPageSize } = usePagination(20);

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["alumni-students", centerId, statusFilter, search, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("*", { count: "exact" })
        .eq("center_id", centerId)
        .eq("status", statusFilter);

      if (search) {
        query = query.or(`name.ilike.%${search}%,student_id_number.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order("name")
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      return { data, count: count || 0 };
    },
    enabled: !!centerId,
  });

  const students = studentsData?.data || [];
  const totalRows = studentsData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const generateTCMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to generate transfer certificates.");
      const { error } = await supabase.from("transfer_certificates").insert({
        center_id: centerId,
        student_id: selectedStudentForTC.id,
        leaving_date: tcData.leavingDate,
        reason_for_leaving: tcData.reason,
        certificate_number: `TC-${centerId.slice(0,4)}-${Date.now().toString().slice(-6)}`
      });
      if (error) throw error;

      // Also update student status to Transferred if they aren't already alumni
      const { error: studentError } = await supabase.from("students").update({ status: 'Transferred', is_active: false }).eq("id", selectedStudentForTC.id);
      if (studentError) throw studentError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni-students"] });
      toast.success("Transfer Certificate Generated");
      setSelectedStudentForTC(null);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search alumni by name or ID..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Graduated">Graduated</SelectItem>
            <SelectItem value="Transferred">Transferred</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-2xl overflow-hidden bg-white shadow-soft">
        <div className="overflow-x-auto">
  <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Student</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Graduation/Leaving Grade</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">ID Number</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !students.length ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <TableSkeleton columns={5} rows={pageSize} />
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 italic text-slate-400">No records found for {statusFilter}</TableCell></TableRow>
            ) : (
              students.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-bold">{s.name}</TableCell>
                  <TableCell>Grade {s.grade}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-black uppercase">
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{s.student_id_number || "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" title="View History"><History className="h-4 w-4" /></Button>
                    {canEdit && (
                      <Button variant="ghost" size="icon" title="Generate TC" onClick={() => setSelectedStudentForTC(s)}><FileText className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
</div>
      </div>

      <ServerPagination
        currentPage={page}
        totalPages={totalPages}
        totalRows={totalRows}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={!!selectedStudentForTC} onOpenChange={() => setSelectedStudentForTC(null)}>
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle>Generate Transfer Certificate</DialogTitle>
            <DialogDescription>Create a formal TC for {selectedStudentForTC?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Leaving Date</Label>
              <Input
                type="date"
                value={tcData.leavingDate}
                onChange={(e) => setTcData({...tcData, leavingDate: e.target.value})}
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Leaving</Label>
              <Input
                placeholder="e.g. Completed Education, Relocating"
                value={tcData.reason}
                onChange={(e) => setTcData({...tcData, reason: e.target.value})}
                className="h-12 rounded-2xl"
              />
            </div>
            <Button
              className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest mt-4"
              onClick={() => generateTCMutation.mutate()}
              disabled={generateTCMutation.isPending}
            >
              Generate & Print TC
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
