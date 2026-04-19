import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { ServerPagination } from "@/components/ui/ServerPagination";

export default function StudentPromotion({ centerId, canEdit }: { centerId: string, canEdit?: boolean }) {
  const queryClient = useQueryClient();
  const { currentPage, pageSize, setPage, getRange } = usePagination(50, 1, 'promotion');
  const [fromGrade, setFromGrade] = useState<string>("");
  const [toGrade, setToGrade] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2024-2025");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students-for-promotion", centerId, fromGrade, currentPage, pageSize],
    queryFn: async () => {
      if (!fromGrade) return { data: [], count: 0 };
      const { from, to } = getRange();
      const { data, error, count } = await supabase
        .from("students").select("id, name, grade, roll_number, status, center_id, photo_url", { count: 'exact' })
        .eq("center_id", centerId)
        .eq("grade", fromGrade)
        .eq("is_active", true)
        .range(from, to);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!centerId && !!fromGrade,
  });

  const students = studentsData?.data || [];
  const totalCount = studentsData?.count || 0;

  const promoteMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("Access Denied: You do not have permission to execute promotions.");
      if (!toGrade || selectedStudentIds.length === 0) {
        throw new Error("Please select target grade and at least one student.");
      }

      // 1. Update students grade
      const { error: updateError } = await supabase
        .from("students")
        .update({ grade: toGrade })
        .in("id", selectedStudentIds);
      if (updateError) throw updateError;

      // 2. Create promotion history records
      const historyRecords = selectedStudentIds.map(id => ({
        center_id: centerId,
        student_id: id,
        from_grade: fromGrade,
        to_grade: toGrade,
        academic_year: academicYear,
      }));
      const { error: historyError } = await supabase
        .from("student_promotion_history")
        .insert(historyRecords);
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students", centerId] });
      queryClient.invalidateQueries({ queryKey: ["students-for-promotion", centerId, fromGrade] });
      toast.success(`${selectedStudentIds.length} students promoted to Grade ${toGrade}`);
      setSelectedStudentIds([]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Promotion failed");
    },
  });

  const uniqueGrades = Array.from(new Set(students?.map(s => s.grade) || [])).sort();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(students?.map(s => s.id) || []);
    } else {
      setSelectedStudentIds([]);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-none shadow-strong bg-white/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Bulk Grade Promotion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Promote From Grade</label>
              <Select value={fromGrade} onValueChange={setFromGrade}>
                <SelectTrigger><SelectValue placeholder="Select Source Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Grade 1</SelectItem>
                  <SelectItem value="2">Grade 2</SelectItem>
                  <SelectItem value="3">Grade 3</SelectItem>
                  <SelectItem value="4">Grade 4</SelectItem>
                  <SelectItem value="5">Grade 5</SelectItem>
                  <SelectItem value="6">Grade 6</SelectItem>
                  <SelectItem value="7">Grade 7</SelectItem>
                  <SelectItem value="8">Grade 8</SelectItem>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="10">Grade 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Promote To Grade</label>
              <Select value={toGrade} onValueChange={setToGrade}>
                <SelectTrigger><SelectValue placeholder="Select Target Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">Grade 2</SelectItem>
                  <SelectItem value="3">Grade 3</SelectItem>
                  <SelectItem value="4">Grade 4</SelectItem>
                  <SelectItem value="5">Grade 5</SelectItem>
                  <SelectItem value="6">Grade 6</SelectItem>
                  <SelectItem value="7">Grade 7</SelectItem>
                  <SelectItem value="8">Grade 8</SelectItem>
                  <SelectItem value="9">Grade 9</SelectItem>
                  <SelectItem value="10">Grade 10</SelectItem>
                  <SelectItem value="11">Grade 11</SelectItem>
                  <SelectItem value="Graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Year</label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2025-2026">2025-2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {fromGrade && (
            <div className="border rounded-2xl overflow-hidden shadow-soft bg-white">
              <div className="overflow-x-auto">
  <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedStudentIds.length === (students?.length || 0) && (students?.length || 0) > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Student Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Current Grade</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Roll Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                  ) : students?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10">No students found in Grade {fromGrade}</TableCell></TableRow>
                  ) : (
                    students?.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudentIds.includes(s.id)}
                            onCheckedChange={() => toggleStudentSelection(s.id)}
                          />
                        </TableCell>
                        <TableCell className="font-bold">{s.name}</TableCell>
                        <TableCell>Grade {s.grade}</TableCell>
                        <TableCell>{s.roll_number || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
</div>
              <div className="mt-4 px-4 pb-4">
                <ServerPagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  onPageChange={setPage}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between items-center">
            <p className="text-xs text-muted-foreground font-medium">
              {selectedStudentIds.length} students selected for promotion.
            </p>
            {canEdit && (
              <Button
                disabled={promoteMutation.isPending || selectedStudentIds.length === 0 || !toGrade}
                onClick={() => promoteMutation.mutate()}
                className="rounded-xl font-black uppercase text-xs tracking-widest"
              >
                Execute Promotion
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
