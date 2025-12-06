"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, BookOpen, User, FileText } from "lucide-react"; // Added FileText for tests
import { Tables } from "@/integrations/supabase/types";
import { safeFormatDate } from '@/lib/utils';

// Re-using types from ParentChapterDetailModal for consistency
type LessonPlan = Tables<'lesson_plans'>;
type Student = Tables<'students'>;
type StudentChapter = Tables<'student_chapters'>;
type Test = Tables<'tests'>;
type TestResult = Tables<'test_results'>;

interface CombinedChapterRecord {
  studentChapterId: string; // ID of student_chapters record, or unique ID for test-only records
  studentId: string;
  studentName: string;
  studentGrade: string;
  lessonPlanId: string;
  lessonPlanSubject: string;
  lessonPlanChapter: string;
  lessonPlanTopic: string;
  lessonPlanDate: string;
  evaluationRating: number | null;
  teacherNotes: string | null;
  recordedByTeacherName: string | null;
  associatedTests: any[];
}

export default function ChapterPerformanceOverview() {
  const { user } = useAuth();
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [studentFilter, setStudentFilter] = useState<string>("all"); // NEW: Student filter state

  // Fetch all students for grade and student filters
  const { data: allStudents = [] } = useQuery({
    queryKey: ["all-students-for-chapter-overview", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, name, grade")
        .eq("center_id", user.center_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });
  const uniqueGrades = Array.from(new Set(allStudents.map(s => s.grade))).sort();

  // Fetch all lesson plans for subject filter and grouping
  const { data: allLessonPlans = [] } = useQuery({
    queryKey: ["all-lesson-plans-for-overview", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("id, subject, chapter, topic, grade, lesson_date, notes, lesson_file_url")
        .eq("center_id", user.center_id)
        .order("lesson_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch all student_chapters for the center, filtered by student/grade/subject
  const { data: studentChaptersRaw = [], isLoading: studentChaptersLoading } = useQuery({
    queryKey: ["all-student-chapters-overview", user?.center_id, subjectFilter, gradeFilter, studentFilter],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("student_chapters").select(`
        *,
        students(id, name, grade, center_id),
        lesson_plans(id, chapter, subject, topic, grade, lesson_date, lesson_file_url),
        recorded_by_teacher:recorded_by_teacher_id(name)
      `).eq("students.center_id", user.center_id);

      if (subjectFilter !== "all") {
        query = query.eq("lesson_plans.subject", subjectFilter);
      }
      if (gradeFilter !== "all") {
        query = query.eq("students.grade", gradeFilter);
      }
      if (studentFilter !== "all") { // NEW: Apply student filter
        query = query.eq("student_id", studentFilter);
      }

      const { data, error } = await query.order("completed_at", { ascending: false });
      if (error) throw error;

      // Filter out records where student or lesson_plan data might be missing
      return data?.filter((d: any) => d.students && d.lesson_plans) || [];
    },
    enabled: !!user?.center_id,
  });

  // NEW: Fetch all test results for the center, including test details and linked lesson_plan_id
  const { data: allTestResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ["all-test-results-for-chapter-overview", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("test_results")
        .select(`
          id,
          student_id,
          marks_obtained,
          tests(id, name, subject, total_marks, lesson_plan_id)
        `) // Removed lesson_plans(chapter) as it's not directly on tests
        .eq("tests.center_id", user.center_id); // Ensure tests belong to the same center
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const allSubjects = useMemo(() => {
    return Array.from(new Set(allLessonPlans.map(lp => lp.subject).filter(Boolean))).sort();
  }, [allLessonPlans]);

  // Combine student_chapters and associated test results into a flat list for easier table rendering
  const combinedChapterRecords: CombinedChapterRecord[] = useMemo(() => {
    const records: CombinedChapterRecord[] = [];

    studentChaptersRaw.forEach((sc: any) => {
      const student = sc.students;
      const lessonPlan = sc.lesson_plans;
      if (!student || !lessonPlan) return;

      // Filter associated test results for this specific student and lesson plan
      const associatedTests = allTestResults.filter(tr => {
        const testLessonPlanId = (tr.tests as Test)?.lesson_plan_id;
        const recordStudentId = student.id;
        const recordLessonPlanId = lessonPlan.id;

        const isStudentMatch = recordStudentId && tr.student_id === recordStudentId;
        const isLessonPlanMatch = recordLessonPlanId && testLessonPlanId === recordLessonPlanId;
        return isStudentMatch && isLessonPlanMatch;
      });

      records.push({
        studentChapterId: sc.id,
        studentId: student.id,
        studentName: student.name,
        studentGrade: student.grade,
        lessonPlanId: lessonPlan.id,
        lessonPlanSubject: lessonPlan.subject,
        lessonPlanChapter: lessonPlan.chapter,
        lessonPlanTopic: lessonPlan.topic,
        lessonPlanDate: lessonPlan.lesson_date,
        evaluationRating: sc.evaluation_rating,
        teacherNotes: sc.teacher_notes,
        recordedByTeacherName: sc.recorded_by_teacher?.name || null,
        associatedTests: associatedTests,
      });
    });

    // Also add entries for tests that are linked to a lesson plan but have no student_chapter entry
    allTestResults.forEach(tr => {
      const lessonPlan = allLessonPlans.find(lp => lp.id === (tr.tests as Test)?.lesson_plan_id);
      const student = allStudents.find(s => s.id === tr.student_id);

      if (lessonPlan && student) {
        // Check if this test result is already covered by a student_chapter entry
        const isCovered = records.some(r =>
          r.studentId === student.id &&
          r.lessonPlanId === lessonPlan.id &&
          r.associatedTests.some(at => at.id === tr.id)
        );

        if (!isCovered) {
          // Apply filters for this "test-only" record
          const isSubjectMatch = subjectFilter === "all" || lessonPlan.subject === subjectFilter;
          const isGradeMatch = gradeFilter === "all" || student.grade === gradeFilter;
          const isStudentMatch = studentFilter === "all" || student.id === studentFilter;

          if (isSubjectMatch && isGradeMatch && isStudentMatch) {
            records.push({
              studentChapterId: `test-only-${tr.id}`, // Unique ID for test-only records
              studentId: student.id,
              studentName: student.name,
              studentGrade: student.grade,
              lessonPlanId: lessonPlan.id,
              lessonPlanSubject: lessonPlan.subject,
              lessonPlanChapter: lessonPlan.chapter,
              lessonPlanTopic: lessonPlan.topic,
              lessonPlanDate: lessonPlan.lesson_date,
              evaluationRating: null,
              teacherNotes: null,
              recordedByTeacherName: null,
              associatedTests: [tr],
            });
          }
        }
      }
    });

    // Sort by lesson plan date, then student name
    return records.sort((a, b) => {
      const dateA = new Date(a.lessonPlanDate).getTime();
      const dateB = new Date(b.lessonPlanDate).getTime();
      if (dateA !== dateB) return dateB - dateA; // Descending date
      return a.studentName.localeCompare(b.studentName); // Ascending student name
    });
  }, [studentChaptersRaw, allTestResults, allLessonPlans, allStudents, subjectFilter, gradeFilter, studentFilter]);


  const getRatingStars = (rating: number | null) => {
    if (rating === null) return "N/A";
    return Array(rating).fill("⭐").join("");
  };

  if (studentChaptersLoading || testResultsLoading) {
    return <p>Loading chapter performance overview...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chapter Performance Overview</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> All Chapter Evaluations
            </CardTitle>
            <div className="flex gap-2">
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {allSubjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {uniqueGrades.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* NEW: Student Filter */}
              <Select value={studentFilter} onValueChange={setStudentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {allStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.grade})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {combinedChapterRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No chapter evaluations or associated tests found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto max-h-[600px] border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Date Taught</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Evaluation</TableHead>
                    <TableHead>Teacher Notes</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Associated Tests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedChapterRecords.map((record) => (
                    <TableRow key={record.studentChapterId}>
                      <TableCell className="font-medium">{record.lessonPlanSubject}</TableCell>
                      <TableCell>{record.lessonPlanChapter}</TableCell>
                      <TableCell>{record.lessonPlanTopic}</TableCell>
                      <TableCell>{safeFormatDate(record.lessonPlanDate, "PPP")}</TableCell>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                      <TableCell>{record.studentGrade}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        {getRatingStars(record.evaluationRating)}
                      </TableCell>
                      <TableCell>{record.teacherNotes || '-'}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        {record.recordedByTeacherName || '-'}
                      </TableCell>
                      <TableCell>
                        {record.associatedTests.length > 0 ? (
                          <ul className="list-disc list-inside text-xs">
                            {record.associatedTests.map(tr => (
                              <li key={tr.id}>
                                {tr.tests?.name}: {tr.marks_obtained}/{tr.tests?.total_marks}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          '-'
                        )}
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
  );
}