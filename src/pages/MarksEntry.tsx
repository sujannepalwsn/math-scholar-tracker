import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Save, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export default function MarksEntry() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const centerId = user?.center_id;

  const [selectedExamId, setSelectedExamId] = useState<string>(searchParams.get("examId") || "");
  const [marksData, setMarksData] = useState<Record<string, Record<string, string>>>({});
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const { data: exams = [] } = useQuery({
    queryKey: ["exams-entry-list", centerId],
    queryFn: async () => {
      if (!centerId) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("center_id", centerId)
        .in("status", ["draft", "published"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!centerId,
  });

  useEffect(() => {
    const examId = searchParams.get("examId");
    if (examId) {
      setSelectedExamId(examId);
    }
  }, [searchParams]);

  const selectedExam = exams.find((e: any) => e.id === selectedExamId);

  // Set initial filter grade when exam is selected
  useEffect(() => {
    if (selectedExam) {
      const examGrades = selectedExam.applicable_grades || (selectedExam.grade ? [selectedExam.grade] : []);
      if (examGrades.length > 0 && !examGrades.includes(filterGrade) && filterGrade !== "all") {
        setFilterGrade("all");
      }
    }
  }, [selectedExam]);

  const { data: subjects = [] } = useQuery({
    queryKey: ["exam-subjects-entry", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase
        .from("exam_subjects")
        .select("*")
        .eq("exam_id", selectedExamId)
        .order("subject_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId,
  });

  const examGrades = useMemo(() => {
    if (!selectedExam) return [];
    return selectedExam.applicable_grades || (selectedExam.grade ? [selectedExam.grade] : []);
  }, [selectedExam]);

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-exam", centerId, selectedExamId, filterGrade],
    queryFn: async () => {
      if (!centerId || !selectedExamId || !selectedExam) return [];

      let query = supabase
        .from("students")
        .select("*")
        .eq("center_id", centerId)
        .eq("is_active", true);

      if (filterGrade !== "all") {
        query = query.eq("grade", filterGrade);
      } else {
        query = query.in("grade", examGrades);
      }

      const { data, error } = await query.order("grade").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!centerId && !!selectedExamId && !!selectedExam,
  });

  // Load existing marks
  const { data: existingMarks = [] } = useQuery({
    queryKey: ["existing-marks", selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase
        .from("exam_marks")
        .select("*")
        .eq("exam_id", selectedExamId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedExamId,
  });

  // Initialize marks data from existing marks
  React.useEffect(() => {
    if (existingMarks.length > 0) {
      const data: Record<string, Record<string, string>> = {};
      existingMarks.forEach((m: any) => {
        if (!data[m.student_id]) data[m.student_id] = {};
        data[m.student_id][m.exam_subject_id] = m.marks_obtained?.toString() || "";
      });
      setMarksData(data);
    }
  }, [existingMarks]);

  const saveMarks = useMutation({
    mutationFn: async () => {
      if (!centerId || !selectedExamId) return;
      const records: any[] = [];
      Object.entries(marksData).forEach(([studentId, subjectMarks]) => {
        Object.entries(subjectMarks).forEach(([subjectId, marks]) => {
          if (marks !== "") {
            records.push({
              center_id: centerId,
              exam_id: selectedExamId,
              exam_subject_id: subjectId,
              student_id: studentId,
              marks_obtained: parseFloat(marks),
              entered_by: user?.id,
            });
          }
        });
      });
      if (records.length === 0) return;

      const { error } = await supabase
        .from("exam_marks")
        .upsert(records, { onConflict: "exam_id,exam_subject_id,student_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["existing-marks"] });
      toast.success("Marks saved successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleMarkChange = (studentId: string, subjectId: string, value: string) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectId]: value },
    }));
  };

  // Calculate results per student
  const studentResults = useMemo(() => {
    return students.map((student: any) => {
      const studentMarks = marksData[student.id] || {};
      let totalObtained = 0;
      let totalFull = 0;
      let allPassed = true;
      let hasMarks = false;

      subjects.forEach((subj: any) => {
        const marksString = studentMarks[subj.id];
        if (marksString !== undefined && marksString !== "") {
          const marks = parseFloat(marksString);
          hasMarks = true;
          totalObtained += marks;
          totalFull += subj.full_marks;
          if (marks < subj.pass_marks) allPassed = false;
        }
      });

      const percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;
      return {
        student,
        totalObtained,
        totalFull,
        percentage: hasMarks ? percentage : 0,
        grade: hasMarks ? getGrade(percentage) : "-",
        passed: hasMarks ? allPassed : null,
        hasMarks,
      };
    });
  }, [students, marksData, subjects]);

  return (
    <div className="space-y-6">
      <PageHeader title="Marks Entry" description="Enter student marks for exams" />

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Select Exam</Label>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam: any) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name} ({exam.applicable_grades?.join(", ") || exam.grade})
                    <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                      ({exam.status === 'published' ? 'Routine Published' : 'Draft'})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedExam && examGrades.length > 1 && (
            <div className="space-y-1.5">
              <Label>Filter Grade</Label>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades ({examGrades.join(", ")})</SelectItem>
                  {examGrades.map(g => (
                    <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedExamId && subjects.length > 0 && students.length > 0 && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => saveMarks.mutate()} disabled={saveMarks.isPending}>
              <Save className="h-4 w-4 mr-2" /> Save All Marks
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Student</TableHead>
                  {subjects.map((s: any) => (
                    <TableHead key={s.id} className="min-w-[100px] text-center">
                      {s.subject_name}
                      <div className="text-[10px] text-muted-foreground">({s.full_marks})</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentResults.map(({ student, totalObtained, totalFull, percentage, grade, passed, hasMarks }) => (
                  <TableRow key={student.id}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium">
                      {student.name}
                      <div className="text-[10px] text-muted-foreground">Grade {student.grade} • Roll: {student.roll_number || "-"}</div>
                    </TableCell>
                    {subjects.map((subj: any) => (
                      <TableCell key={subj.id} className="text-center">
                        <Input
                          type="number"
                          min="0"
                          max={subj.full_marks}
                          className="w-20 mx-auto text-center h-8"
                          value={marksData[student.id]?.[subj.id] || ""}
                          onChange={(e) => handleMarkChange(student.id, subj.id, e.target.value)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-medium">
                      {hasMarks ? `${totalObtained}/${totalFull}` : "-"}
                    </TableCell>
                    <TableCell className="text-center">{hasMarks ? `${percentage.toFixed(1)}%` : "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={grade === "F" ? "destructive" : "default"}>{grade}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {passed === null ? "-" : passed ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {selectedExamId && subjects.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No subjects configured for this exam. Add subjects first from Exam Management.
          </CardContent>
        </Card>
      )}

      {selectedExamId && subjects.length > 0 && students.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No active students found for the selected grade filter.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
