import React, { useMemo, useState, useEffect } from "react";
import { UserRole } from "@/types/roles";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Save, XCircle, SquarePen } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission, hasActionPermission } from "@/utils/permissions";
import { cn } from "@/lib/utils";

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
  const canEdit = hasActionPermission(user, 'exams_results', 'edit');
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const centerId = user?.center_id;
  const teacherId = user?.teacher_id;

  const [selectedExamId, setSelectedExamId] = useState<string>(searchParams.get("examId") || "");
  const [marksData, setMarksData] = useState<Record<string, Record<string, string>>>({});
  const [filterGrade, setFilterGrade] = useState<string>("all");

  const isRestricted = user?.role === UserRole.TEACHER && user?.teacher_scope_mode !== 'full';

  const { data: exams = [] } = useQuery({
    queryKey: ["exams-entry-list", centerId, isRestricted, user?.id],
    queryFn: async () => {
      if (!centerId) return [];
      let query = supabase
        .from("exams")
        .select("*")
        .eq("center_id", centerId)
        .in("status", ["draft", "published", "results_published"])
        .order("created_at", { ascending: false });

      if (isRestricted) {
        // Teacher restricted mode: only exams they created OR exams for their assigned grades
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user?.teacher_id);
        const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user?.teacher_id);
        const myGrades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

        const conditions = [`created_by.eq.${user?.id}`];
        if (myGrades.length > 0) {
          myGrades.forEach(g => {
            conditions.push(`grade.eq."${g}"`);
            conditions.push(`applicable_grades.cs.{"${g}"}`);
          });
        }
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;
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
    queryKey: ["exam-subjects-entry", selectedExamId, isRestricted, teacherId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      let query = supabase
        .from("exam_subjects")
        .select("*")
        .eq("exam_id", selectedExamId)
        .order("subject_name");

      if (isRestricted && teacherId) {
        // Only subjects the teacher is assigned to in period_schedules
        const { data: scheduledSubjects } = await supabase
          .from('period_schedules')
          .select('subject')
          .eq('teacher_id', teacherId);

        const mySubjects = Array.from(new Set(scheduledSubjects?.map(s => s.subject) || []));
        if (mySubjects.length > 0) {
          query = query.in('subject_name', mySubjects);
        } else {
          return []; // No assigned subjects, so no exam subjects
        }
      }

      const { data, error } = await query;
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
      if (!canEdit) throw new Error("Access Denied: You do not have permission to enter marks.");
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
    const subject = subjects.find((s: any) => s.id === subjectId);
    if (subject && value !== "") {
      const numValue = parseFloat(value);
      if (numValue > subject.full_marks) {
        toast.error(`Marks for ${subject.subject_name} cannot exceed full marks (${subject.full_marks})`);
        return;
      }
      if (numValue < 0) {
        toast.error("Marks cannot be negative");
        return;
      }
    }

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
    <div className="space-y-8 animate-in fade-in duration-1000 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <SquarePen className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Score Entry
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Academic Achievement Registry</p>
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
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Examination Session</label>
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
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Grade Filter</label>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
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
      </div>

      {selectedExamId && subjects.length > 0 && students.length > 0 && (
        <>
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={() => saveMarks.mutate()} disabled={saveMarks.isPending} className="rounded-xl shadow-strong font-black uppercase text-[10px] tracking-widest h-11 px-6">
                {saveMarks.isPending ? "Commiting Marks..." : <><Save className="h-4 w-4 mr-2" /> Commit Score Registry</>}
              </Button>
            </div>
          )}

          <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
          <div className="overflow-x-auto table-scroll-shadow">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted/10 bg-muted/5">
                  <TableHead className="sticky left-0 bg-card/90 backdrop-blur-md z-10 min-w-[150px] md:min-w-[200px] pl-4 md:pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student Identity</TableHead>
                  {subjects.map((s: any) => (
                    <TableHead key={s.id} className="min-w-[100px] text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {s.subject_name}
                      <div className="opacity-60">({s.full_marks})</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">%</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Grade</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentResults.map(({ student, totalObtained, totalFull, percentage, grade, passed, hasMarks }) => (
                  <TableRow key={student.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                    <TableCell className="sticky left-0 bg-card/90 backdrop-blur-md z-10 pl-4 md:pl-6 py-3 md:py-4">
                      <p className="font-black text-slate-700 text-xs md:text-sm leading-none group-hover:text-primary transition-colors">{student.name}</p>
                      <div className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase mt-1 tracking-tight">Grade {student.grade} • Roll: {student.roll_number || "-"}</div>
                    </TableCell>
                    {subjects.map((subj: any) => (
                      <TableCell key={subj.id} className="text-center px-2">
                        <Input
                          type="number"
                          min="0"
                          max={subj.full_marks}
                          className="w-16 md:w-20 mx-auto text-center h-8 md:h-9 font-bold bg-white/50 border-none shadow-soft rounded-lg md:rounded-xl focus:ring-primary/20 text-xs md:text-sm"
                          value={marksData[student.id]?.[subj.id] || ""}
                          onChange={(e) => handleMarkChange(student.id, subj.id, e.target.value)}
                          disabled={!canEdit}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-black text-slate-600">
                      {hasMarks ? `${totalObtained}/${totalFull}` : "-"}
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary text-xs">{hasMarks ? `${percentage.toFixed(1)}%` : "-"}</TableCell>
                    <TableCell className="text-center">
                      {hasMarks && (
                        <Badge variant={grade === "F" ? "destructive" : "secondary"} className={cn("rounded-lg font-black text-[10px]", grade !== "F" && "bg-primary/10 text-primary")}>
                          {grade}
                        </Badge>
                      )}
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
          </Card>
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
