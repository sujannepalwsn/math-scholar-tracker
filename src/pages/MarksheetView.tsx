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
import { PageHeader } from "@/components/ui/page-header";
import { cn, getGradeFormal } from "@/lib/utils";

export default function MarksheetView() {
  const { user } = useAuth();
  const centerId = user?.center_id;
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

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
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('center_id', user?.center_id).eq('teacher_id', user.teacher_id);
        const assignedGrades = assignments?.map(a => a.grade) || [];
        const { data: subjectAssignments } = await supabase.from('period_schedules').select('grade').eq('center_id', user?.center_id).eq('teacher_id', user.teacher_id);
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

  const { data: students = [] } = useQuery({
    queryKey: ["students-marksheet", centerId, selectedExam?.grade],
    queryFn: async () => {
      if (!centerId || !selectedExam?.grade) return [];
      const { data, error } = await supabase.from("students").select("*").eq("center_id", centerId).eq("grade", selectedExam.grade).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!centerId && !!selectedExam?.grade,
  });

  const filteredStudents = students.filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.roll_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { data: subjects = [] } = useQuery({
    queryKey: ["marksheet-subjects", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase.from("exam_subjects").select("*").eq('center_id', user?.center_id).eq("exam_id", selectedExamId).order("subject_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId,
  });

  const { data: marks = [] } = useQuery({
    queryKey: ["marksheet-marks", selectedExamId, selectedStudentId],
    queryFn: async () => {
      if (!selectedExamId || !selectedStudentId) return [];
      const { data, error } = await supabase.from("exam_marks").select("*").eq('center_id', user?.center_id).eq("exam_id", selectedExamId).eq("student_id", selectedStudentId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId && !!selectedStudentId,
  });

  const marksheetData = useMemo(() => {
    if (!marks.length || !subjects.length) return null;
    const student = students.find((s: any) => s.id === selectedStudentId);
    if (!student) return null;

    let totalObtained = 0;
    let totalFull = 0;
    let allPassed = true;

    const subjectResults = subjects.map((subj: any) => {
      const mark = marks.find((m: any) => m.exam_subject_id === subj.id);
      const obtained = mark?.marks_obtained || 0;
      totalObtained += obtained;
      totalFull += subj.full_marks;
      const passed = obtained >= subj.pass_marks;
      if (!passed) allPassed = false;
      return { ...subj, obtained, passed };
    });

    const percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;

    return {
      student,
      subjectResults,
      totalObtained,
      totalFull,
      percentage,
      grade: getGradeFormal(percentage),
      passed: allPassed,
    };
  }, [marks, subjects, students, selectedStudentId]);

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
    <div className="space-y-6">
      <PageHeader title="Marksheet" description="View and print student marksheets" />

      <div className="grid sm:grid-cols-2 gap-4">
        <Select value={selectedExamId} onValueChange={(v) => { setSelectedExamId(v); setSelectedStudentId(""); }}>
          <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
          <SelectContent>
            {exams.map((e: any) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name} - Grade {e.grade}
                {e.status === 'draft' && " (Draft)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedExamId && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or roll number..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {selectedExamId && !selectedStudentId && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStudents.map((s: any) => (
            <Card key={s.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedStudentId(s.id)}>
              <CardContent className="p-4">
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="text-sm text-muted-foreground">Roll: {s.roll_number || "-"} • Grade {s.grade}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {marksheetData && (
        <>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={handlePrint}><Download className="h-4 w-4 mr-2" /> Download</Button>
            <Button variant="outline" onClick={() => setSelectedStudentId("")}>Back to List</Button>
          </div>

          <Card>
            <CardContent className="p-6" ref={printRef}>
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

              {/* Summary */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{marksheetData.totalObtained}/{marksheetData.totalFull}</p>
                  <p className="text-xs text-muted-foreground">Total Marks</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{marksheetData.percentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{marksheetData.grade}</p>
                  <p className="text-xs text-muted-foreground">Grade</p>
                </div>
                <div className={cn("p-3 rounded-lg", marksheetData.passed ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20")}>
                  <p className={cn("text-2xl font-bold", marksheetData.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
                    {marksheetData.passed ? "PASS" : "FAIL"}
                  </p>
                  <p className="text-xs text-muted-foreground">Final Result</p>
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
