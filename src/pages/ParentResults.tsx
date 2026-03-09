import React, { useMemo, useState } from "react";
import { Award, BookOpen, Download, FileText, Printer, Search, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { cn, safeFormatDate, getGrade } from "@/lib/utils";

export default function ParentResults() {
  const { user } = useAuth();
  const linkedStudents = user?.linked_students || [];
  const [selectedStudentId, setSelectedStudentId] = useState<string>(linkedStudents[0]?.id || "");
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  const activeStudent = linkedStudents.find(s => s.id === selectedStudentId);

  const { data: center } = useQuery({
    queryKey: ["center-info", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return null;
      const { data } = await supabase.from("centers").select("*").eq("id", user.center_id).single();
      return data;
    },
    enabled: !!user?.center_id,
  });

  const { data: exams = [] } = useQuery({
    queryKey: ["parent-exams", selectedStudentId],
    queryFn: async () => {
      if (!activeStudent?.grade || !user?.center_id) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("grade", activeStudent.grade)
        .eq("status", "results_published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeStudent?.grade && !!user?.center_id,
  });

  const selectedExam = exams.find((e: any) => e.id === selectedExamId);

  const { data: subjects = [] } = useQuery({
    queryKey: ["parent-marksheet-subjects", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase.from("exam_subjects").select("*").eq("exam_id", selectedExamId).order("subject_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId,
  });

  const { data: marks = [] } = useQuery({
    queryKey: ["parent-marksheet-marks", selectedExamId, selectedStudentId],
    queryFn: async () => {
      if (!selectedExamId || !selectedStudentId) return [];
      const { data, error } = await supabase.from("exam_marks").select("*").eq("exam_id", selectedExamId).eq("student_id", selectedStudentId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId && !!selectedStudentId,
  });

  const marksheetData = useMemo(() => {
    if (!marks.length || !subjects.length || !activeStudent) return null;

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
      student: activeStudent,
      subjectResults,
      totalObtained,
      totalFull,
      percentage,
      grade: getGrade(percentage),
      passed: allPassed,
    };
  }, [marks, subjects, activeStudent]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Results" description="View child's academic performance in terminal exams" />

      <div className="grid sm:grid-cols-2 gap-4 no-print">
        {linkedStudents.length > 1 && (
          <Select value={selectedStudentId} onValueChange={(v) => { setSelectedStudentId(v); setSelectedExamId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select child" /></SelectTrigger>
            <SelectContent>
              {linkedStudents.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={selectedExamId} onValueChange={setSelectedExamId}>
          <SelectTrigger><SelectValue placeholder="Select published exam" /></SelectTrigger>
          <SelectContent>
            {exams.length === 0 ? (
              <SelectItem value="none" disabled>No exams published yet</SelectItem>
            ) : (
              exams.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {marksheetData ? (
        <div className="space-y-6">
          <div className="flex gap-2 justify-end no-print">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print Marksheet</Button>
          </div>

          <Card className="print:shadow-none print:border-none">
            <CardContent className="p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-foreground">{center?.name || "School Name"}</h1>
                <p className="text-sm text-muted-foreground">{center?.address || ""}</p>
                <Separator className="my-3" />
                {(center?.theme as any)?.marksheet?.header_text && (
                  <h3 className="text-md font-bold text-foreground mb-2">{(center?.theme as any).marksheet.header_text}</h3>
                )}
                <h2 className="text-lg font-semibold text-foreground">MARKSHEET - {selectedExam?.name}</h2>
                <p className="text-sm text-muted-foreground">Academic Year: {selectedExam?.academic_year}</p>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><span className="text-muted-foreground">Student Name:</span> <strong className="text-foreground">{marksheetData.student.name}</strong></div>
                <div><span className="text-muted-foreground">Grade:</span> <strong className="text-foreground">{marksheetData.student.grade}</strong></div>
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

              {/* Footer text */}
              {(center?.theme as any)?.marksheet?.footer_text && (
                <div className="mt-8 text-center text-sm italic text-muted-foreground">
                  "{(center?.theme as any).marksheet.footer_text}"
                </div>
              )}

              {/* Signatures */}
              <div className="flex justify-between mt-16 text-sm">
                <div className="text-center">
                  <div className="border-t border-foreground/30 w-32 mx-auto mb-1"></div>
                  <p className="text-muted-foreground">{(center?.theme as any)?.marksheet?.signature_left || "Class Teacher"}</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-foreground/30 w-32 mx-auto mb-1"></div>
                  <p className="text-muted-foreground">{(center?.theme as any)?.marksheet?.signature_right || "Principal"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : selectedExamId ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No marks recorded for this child in the selected exam.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Select an exam to view results.</CardContent></Card>
      )}
    </div>
  );
}
