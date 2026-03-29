import React, { useMemo, useRef, useState } from "react";
import { Download, Printer, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, getGradeFormal } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function MarksheetView() {
  const { user } = useAuth();
  const centerId = user?.center_id;
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const { page, pageSize, setPage, setPageSize } = usePagination(24); // Multiple of 2 and 3 for grid

  const { data: center } = useQuery({
    queryKey: ["center-info", centerId],
    queryFn: async () => {
      if (!centerId) return null;
      const { data } = await supabase.from("centers").select("*").eq("id", centerId).single();
      return data;
    },
    enabled: !!centerId,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ["exams-all-marksheet", centerId, user?.role, user?.teacher_id],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase.from("exams")
        .select("*")
        .eq("center_id", centerId)
        .order("created_at", { ascending: false });

      if (user?.role === 'parent') {
        query = query.eq("status", "published");
      }

      if (user?.role === 'teacher' && user?.teacher_id) {
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user.teacher_id);
        const assignedGrades = assignments?.map(a => a.grade) || [];
        const { data: subjectAssignments } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user.teacher_id);
        const subjectGrades = subjectAssignments?.map(a => a.grade) || [];
        const allTeacherGrades = Array.from(new Set([...assignedGrades, ...subjectGrades]));

        if (allTeacherGrades.length > 0) {
          query = query.in('grade', allTeacherGrades);
        } else {
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  const selectedExam = exams.find((e: any) => e.id === selectedExamId);

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["students-marksheet", centerId, selectedExam?.grade, searchQuery, page, pageSize],
    queryFn: async () => {
      if (!centerId || !selectedExam?.grade) return { data: [], count: 0 };
      let query = supabase.from("students")
        .select("*", { count: 'exact' })
        .eq("center_id", centerId)
        .eq("grade", selectedExam.grade)
        .eq("is_active", true);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order("name")
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      return { data, count: count || 0 };
    },
    enabled: !!centerId && !!selectedExam?.grade,
  });

  const students = studentsData?.data || [];
  const totalRows = studentsData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const { data: subjects = [] } = useQuery({
    queryKey: ["marksheet-subjects", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase.from("exam_subjects").select("*").eq("exam_id", selectedExamId).order("subject_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId,
  });

  const { data: gradingSystems } = useQuery({
    queryKey: ["grading-systems", centerId],
    queryFn: async () => {
      const { data } = await supabase.from("grading_systems").select("*").eq("center_id", centerId);
      return data;
    },
    enabled: !!centerId,
  });

  const { data: marks = [] } = useQuery({
    queryKey: ["marks-all-marksheet", selectedExamId, selectedStudentId],
    queryFn: async () => {
      if (!selectedExamId || !selectedStudentId) return [];
      const { data, error } = await supabase.from("student_marks").select("*").eq("exam_id", selectedExamId).eq("student_id", selectedStudentId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId && !!selectedStudentId,
  });

  const marksheetData = useMemo(() => {
    if (!selectedStudentId || !selectedExamId || marks.length === 0) return null;

    const student = students.find((s: any) => s.id === selectedStudentId);
    if (!student) return null;

    let totalObtained = 0;
    let totalFull = 0;
    let allPassed = true;

    const subjectResults = subjects.map((subj: any) => {
      const mark = marks.find((m: any) => m.subject_id === subj.id);
      const obtained = mark?.marks_obtained || 0;
      const passed = obtained >= subj.pass_marks;
      if (!passed) allPassed = false;

      totalObtained += obtained;
      totalFull += subj.full_marks;

      return {
        ...subj,
        obtained,
        passed,
      };
    });

    const percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;

    // Rank calculation (mock for now, would need all students' marks)
    const rank = "N/A";

    const gradingSystem = gradingSystems?.find((gs: any) => gs.id === selectedExam?.grading_system_id);
    let calculatedGrade = getGradeFormal(percentage);
    let calculatedGPA = "0.0";

    if (gradingSystem) {
      const range = gradingSystem.ranges.find((r: any) => percentage >= r.min && percentage <= r.max);
      if (range) {
        calculatedGrade = range.grade;
        calculatedGPA = range.gpa.toFixed(2);
      }
    }

    return {
      student,
      subjectResults,
      totalObtained,
      totalFull,
      percentage,
      grade: calculatedGrade,
      gpa: calculatedGPA,
      rank,
      passed: allPassed,
    };
  }, [marks, subjects, students, selectedStudentId, gradingSystems, selectedExam]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Marksheet</title><style>
      body { font-family: sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      th { background: #f5f5f5; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-bold { font-weight: bold; }
      .text-sm { font-size: 14px; }
      .mt-8 { margin-top: 32px; }
      .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
      .sig-line { border-top: 1px solid #333; padding-top: 4px; width: 150px; text-align: center; }
    </style></head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <Printer className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Credentials Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Marksheet & Achievement Generation</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <Card className="relative border-none shadow-medium overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Examination Context</label>
              <Select value={selectedExamId} onValueChange={(v) => { setSelectedExamId(v); setSelectedStudentId(""); setPage(1); }}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                  <SelectValue placeholder="Select an exam" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl font-bold">
                  {exams.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} - Grade {e.grade}
                      {e.status === 'draft' && " (Draft)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedExamId && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Scholar Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll number..."
                    className="pl-9 h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedExamId && !selectedStudentId && (
        <div className="space-y-8">
          {studentsLoading && !students.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-3xl" />)}
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map((s: any) => (
                  <Card
                    key={s.id}
                    className="border-none shadow-medium bg-card/40 backdrop-blur-md rounded-3xl cursor-pointer hover:shadow-strong hover:scale-[1.02] transition-all duration-300 border border-white/20 group"
                    onClick={() => setSelectedStudentId(s.id)}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        <Search className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-700 leading-none">{s.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1.5">Roll: {s.roll_number || "-"} • Grade {s.grade}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {students.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground font-medium italic">No scholars identified matching your criteria.</div>
                )}
              </div>
              <ServerPagination
                currentPage={page}
                totalPages={totalPages}
                totalRows={totalRows}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </div>
      )}

      {marksheetData && (
        <>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handlePrint} className="rounded-xl font-bold text-xs shadow-soft bg-white/50 h-10 px-6 border-2">
              <Printer className="h-4 w-4 mr-2" /> Print Official Copy
            </Button>
            <Button variant="outline" onClick={handlePrint} className="rounded-xl font-bold text-xs shadow-soft bg-white/50 h-10 px-6 border-2">
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </Button>
            <Button variant="outline" onClick={() => setSelectedStudentId("")} className="rounded-xl font-bold text-xs shadow-soft bg-white/50 h-10 px-6 border-2">
              Return to Catalog
            </Button>
          </div>

          <Card className="border-none shadow-strong rounded-[2.5rem] bg-white overflow-hidden border border-slate-200">
            <CardContent className="p-12" ref={printRef}>
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-foreground">{center?.name || "School Name"}</h1>
                <p className="text-sm text-muted-foreground">{center?.address || ""}</p>
                <Separator className="my-3" />
                <h2 className="text-lg font-semibold text-foreground">MARKSHEET - {selectedExam?.name}</h2>
                <p className="text-sm text-muted-foreground">Academic Year: {selectedExam?.academic_year}</p>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><span className="text-muted-foreground">Student Name:</span> <strong className="text-foreground">{marksheetData.student.name}</strong></div>
                <div><span className="text-muted-foreground">Roll Number:</span> <strong className="text-foreground">{marksheetData.student.roll_number || "-"}</strong></div>
                <div><span className="text-muted-foreground">Grade:</span> <strong className="text-foreground">{marksheetData.student.grade}</strong></div>
                <div><span className="text-muted-foreground">Section:</span> <strong className="text-foreground">{marksheetData.student.section || "-"}</strong></div>
              </div>

              {/* Marks Table */}
              <div className="overflow-x-auto">
  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Full Marks</TableHead>
                    <TableHead className="text-center">Pass Marks</TableHead>
                    <TableHead className="text-center">Marks Obtained</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marksheetData.subjectResults.map((subj: any) => (
                    <TableRow key={subj.id}>
                      <TableCell className="font-medium">{subj.subject_name}</TableCell>
                      <TableCell className="text-center">{subj.full_marks}</TableCell>
                      <TableCell className="text-center">{subj.pass_marks}</TableCell>
                      <TableCell className="text-center font-semibold">{subj.obtained}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={subj.passed ? "default" : "destructive"}>
                          {subj.passed ? "Pass" : "Fail"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
</div>

              {/* Summary */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-5 gap-6 text-center">
                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-soft">
                  <p className="text-2xl font-black text-slate-700">{marksheetData.totalObtained}/{marksheetData.totalFull}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Aggregate</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-soft">
                  <p className="text-2xl font-black text-primary">{marksheetData.percentage.toFixed(1)}%</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Efficiency</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-soft">
                  <p className="text-2xl font-black text-slate-700">{marksheetData.grade}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Grade (GPA: {marksheetData.gpa})</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-soft">
                  <p className="text-2xl font-black text-slate-700">{marksheetData.rank}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Institutional Rank</p>
                </div>
                <div className={cn("p-6 rounded-[1.5rem] border shadow-strong", marksheetData.passed ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                  <p className={cn("text-2xl font-black", marksheetData.passed ? "text-emerald-600" : "text-rose-600")}>
                    {marksheetData.passed ? "PASS" : "FAIL"}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Outcome</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between mt-16 text-sm">
                <div className="text-center">
                  <div className="border-t border-foreground/30 w-32 mx-auto mb-1"></div>
                  <p className="text-muted-foreground">Class Teacher</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-foreground/30 w-32 mx-auto mb-1"></div>
                  <p className="text-muted-foreground">Principal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
