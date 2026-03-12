import React, { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Book, BookOpen, Calendar, CheckCircle, ClipboardCheck, Clock, DollarSign, Download, Eye, FileText, GraduationCap, Paintbrush, Printer, Star, Users, XCircle } from "lucide-react";
import { cn } from "@/lib/utils"
import { useMutation, useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { endOfMonth, format, isPast, startOfMonth, subYears } from "date-fns" // Added subYears, isPast
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Tables } from "@/integrations/supabase/types"
import { Invoice, Payment } from "@/integrations/supabase/finance-types"
import { formatCurrency, safeFormatDate, getGradeFormal } from "@/lib/utils" // Import safeFormatDate, formatCurrency, getGradeFormal

type LessonPlan = Tables<'lesson_plans'>;
type StudentHomeworkRecord = Tables<'student_homework_records'>;
type StudentActivity = Tables<'student_activities'>;
type DisciplineIssue = Tables<'discipline_issues'>;
type StudentChapter = Tables<'student_chapters'>; // Import StudentChapter type
type Test = Tables<'tests'>;
type Homework = Tables<'homework'>;
type TestResult = Tables<'test_results'>;

interface ChapterPerformance {
  lessonPlan: LessonPlan;
  studentChapters: (StudentChapter & { recorded_by_teacher?: Tables<'teachers'> })[];
  testResults: (Tables<'test_results'> & { tests: Pick<Test, 'id' | 'name' | 'subject' | 'total_marks' | 'lesson_plan_id' | 'questions'> })[];
  homeworkRecords: (Tables<'student_homework_records'> & { homework: Pick<Homework, 'id' | 'title' | 'subject' | 'due_date'> })[];
}

export default function ParentStudentReport() {
  const { user } = useAuth();
  const linkedStudents = user?.linked_students || [];

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    const firstStudent = linkedStudents[0];
    if (!firstStudent) return "none";
    return typeof firstStudent === 'string' ? firstStudent : firstStudent.id;
  });
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subYears(new Date(), 1), // Default to last year
    to: endOfMonth(new Date()) });
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [aiSummary, setAiSummary] = useState<string>("");
  const [selectedDisciplineIssue, setSelectedDisciplineIssue] = useState<any>(null);
  const [selectedChapterDetail, setSelectedChapterDetail] = useState<ChapterPerformance | null>(null);
  const [selectedExamResult, setSelectedExamResult] = useState<any>(null);
  const [selectedExamSchedule, setSelectedExamSchedule] = useState<any>(null);
  const [selectedPublishedExamId, setSelectedPublishedExamId] = useState<string>("none");
  const [selectedAttendanceDetail, setSelectedAttendanceDetail] = useState<any>(null);

  // Students for parent are already in user context, but let's fetch to be safe/consistent
  const { data: students = [] } = useQuery({
    queryKey: ["students", user?.center_id, user?.id, linkedStudents],
    queryFn: async () => {
      if (!linkedStudents.length) return [];
      const studentIds = linkedStudents.map((s: any) => typeof s === 'string' ? s : s.id);
      const { data, error } = await supabase.from("students").select("*").in("id", studentIds).order("name");
      if (error) throw error;
      return data;
    } });

  const filteredStudents = students;

  // Get student IDs for current filters
  const studentIds = useMemo(() => {
    if (selectedStudentId && selectedStudentId !== "none") return [selectedStudentId];
    return filteredStudents.map(s => s.id);
  }, [selectedStudentId, filteredStudents]);

  // Fetch attendance
  const { data: attendanceData = [], isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["student-attendance", selectedStudentId, gradeFilter, dateRange, user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("attendance")
        .select("*")
        .eq("center_id", user.center_id)
        .gte("date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));

      if (selectedStudentId && selectedStudentId !== "none") {
        query = query.eq("student_id", selectedStudentId);
      } else if (gradeFilter !== "all") {
        query = query.in("student_id", studentIds);
      }

      const { data, error } = await query.order("date");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  // Fetch lesson plans (needed for grouping)
  const { data: allLessonPlans = [] } = useQuery({
    queryKey: ["all-lesson-plans-for-report", user?.center_id],
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
    enabled: !!user?.center_id });

  // Fetch student_chapters (lesson evaluations)
  const { data: studentChapters = [], isLoading: isChaptersLoading } = useQuery({
    queryKey: ["student-lesson-records-report", selectedStudentId, gradeFilter, subjectFilter, dateRange, studentIds],
    queryFn: async () => {
      let query = supabase.from("student_chapters").select(`
        *,
        lesson_plans!inner(id, subject, chapter, topic, lesson_date, lesson_file_url),
        recorded_by_teacher:recorded_by_teacher_id(name)
      `)
        .gte("completed_at", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("completed_at", safeFormatDate(dateRange.to, "yyyy-MM-dd"));

      if (selectedStudentId && selectedStudentId !== "none") {
        query = query.eq("student_id", selectedStudentId);
      } else if (gradeFilter !== "all") {
        query = query.in("student_id", studentIds);
      } else {
        // School level: still need to ensure students belong to the center
        query = query.in("student_id", studentIds);
      }

      if (subjectFilter !== "all") {
        query = query.eq("lesson_plans.subject", subjectFilter);
      }

      const { data, error } = await query.order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0 });

  // Fetch test results
  const { data: testResults = [], isLoading: isTestsLoading } = useQuery({
    queryKey: ["student-test-results", selectedStudentId, gradeFilter, subjectFilter, dateRange, studentIds],
    queryFn: async () => {
      let query = supabase.from("test_results").select("*, tests!inner(id, name, subject, total_marks, lesson_plan_id, questions)")
        .gte("date_taken", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("date_taken", safeFormatDate(dateRange.to, "yyyy-MM-dd"));

      if (selectedStudentId && selectedStudentId !== "none") {
        query = query.eq("student_id", selectedStudentId);
      } else if (gradeFilter !== "all") {
        query = query.in("student_id", studentIds);
      } else {
        query = query.in("student_id", studentIds);
      }

      if (subjectFilter !== "all") {
        query = query.eq("tests.subject", subjectFilter);
      }

      const { data, error } = await query.order("date_taken", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0 });

  // Fetch homework status
  const { data: homeworkStatus = [], isLoading: isHomeworkLoading } = useQuery({
    queryKey: ["student-homework-status-report", selectedStudentId, gradeFilter, subjectFilter, dateRange, studentIds],
    queryFn: async () => {
      let query = supabase.from("student_homework_records").select("*, homework!inner(id, title, subject, due_date, lesson_plan_id)")
        .gte("homework.due_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("homework.due_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));

      if (selectedStudentId && selectedStudentId !== "none") {
        query = query.eq("student_id", selectedStudentId);
      } else if (gradeFilter !== "all") {
        query = query.in("student_id", studentIds);
      } else {
        query = query.in("student_id", studentIds);
      }

      if (subjectFilter !== "all") {
        query = query.eq("homework.subject", subjectFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0 });

  // Fetch activities (distinct from student participations)
  const { data: activities = [], isLoading: isAllActivitiesLoading } = useQuery({
    queryKey: ["center-activities", user?.center_id, gradeFilter, dateRange],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("activities")
        .select("*")
        .eq("center_id", user.center_id)
        .gte("activity_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("activity_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));

      if (gradeFilter !== "all") {
        query = query.eq("grade", gradeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  // Fetch preschool activities (student participations)
  const { data: preschoolActivities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: ["student-preschool-activities-report", selectedStudentId, gradeFilter, dateRange, studentIds],
    queryFn: async () => {
      let query = supabase.from("student_activities").select("*, activities(title, description, activity_date, photo_url, video_url, activity_type_id, activity_types(name))")
        .gte("created_at", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", safeFormatDate(dateRange.to, "yyyy-MM-dd"));

      if (selectedStudentId && selectedStudentId !== "none") {
        query = query.eq("student_id", selectedStudentId);
      } else if (gradeFilter !== "all") {
        query = query.in("student_id", studentIds);
      } else {
        query = query.in("student_id", studentIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: studentIds.length > 0 });

  // Fetch discipline issues
  const { data: disciplineIssues = [], isLoading: isDisciplineLoading } = useQuery({
    queryKey: ["student-discipline-issues-report", selectedStudentId, gradeFilter, dateRange, user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase.from("discipline_issues").select("*, discipline_categories(name)")
        .eq("center_id", user.center_id)
        .gte("issue_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("issue_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));

      if (selectedStudentId && selectedStudentId !== "none") {
        query = query.eq("student_id", selectedStudentId);
      } else if (gradeFilter !== "all") {
        query = query.in("student_id", studentIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

  // Fetch Exam Schedules & Results
  const { data: studentExams = [] } = useQuery({
    queryKey: ["student-exams-report", selectedStudentId, user?.center_id, students, dateRange],
    queryFn: async () => {
      if (!user?.center_id || !selectedStudentId || selectedStudentId === "none") return [];

      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return [];

      const { data: exams, error: examsError } = await supabase
        .from("exams")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("grade", student.grade)
        .in("status", ["published", "results_published"]) // Parents see both routine and results
        .gte("exam_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("exam_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));

      if (examsError) throw examsError;
      if (!exams || exams.length === 0) return [];

      const examIds = exams.map(e => e.id);

      const { data: subjects, error: subjError } = await supabase
        .from("exam_subjects")
        .select("*")
        .in("exam_id", examIds);

      if (subjError) throw subjError;

      const { data: marks, error: marksError } = await supabase
        .from("exam_marks")
        .select("*")
        .eq("student_id", selectedStudentId)
        .in("exam_id", examIds);

      if (marksError) throw marksError;

      return exams.map(exam => {
        const examSubjects = subjects.filter(s => s.exam_id === exam.id);
        const examMarks = marks.filter(m => m.exam_id === exam.id);

        let totalObtained = 0;
        let totalFull = 0;
        let allPassed = true;
        const hasMarks = examMarks.length > 0;

        const results = examSubjects.map(subj => {
          const mark = examMarks.find(m => m.exam_subject_id === subj.id);
          const hasMark = mark !== undefined && mark !== null && mark.marks_obtained !== null;
          const obtained = hasMark ? mark!.marks_obtained : null;

          if (hasMark) {
            totalObtained += (obtained || 0);
            totalFull += subj.full_marks;
            if ((obtained || 0) < subj.pass_marks) allPassed = false;
          } else {
            allPassed = false;
          }

          return {
            ...subj,
            obtained,
            passed: hasMark ? (obtained || 0) >= subj.pass_marks : false,
            hasMark
          };
        });

        const marksCount = results.filter(r => r.hasMark).length;
        const isPartial = marksCount > 0 && marksCount < examSubjects.length;
        const percentage = totalFull > 0 ? (totalObtained / totalFull) * 100 : 0;

        return {
          ...exam,
          totalObtained,
          totalFull,
          percentage,
          allPassed,
          hasMarks,
          isPartial,
          results,
          student
        };
      });
    },
    enabled: !!user?.center_id && selectedStudentId !== "none"
  });

  // Fetch finance data (keep student-specific for now, or generalize if needed)
  const { data: invoices = [] } = useQuery({
    queryKey: ["student-invoices-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return [];
      const { data, error } = await supabase.from("invoices").select("*").eq("student_id", selectedStudentId)
        .gte("invoice_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("invoice_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none" });

  const { data: payments = [] } = useQuery({
    queryKey: ["student-payments-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return [];
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', selectedStudentId);

      if (invError) throw invError;
      if (!invoices || invoices.length === 0) return [];

      const invoiceIds = invoices.map(inv => inv.id);
      const { data, error } = await supabase.from("payments").select("*")
        .in("invoice_id", invoiceIds)
        .gte("payment_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("payment_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none" });

  // Calculate finance summary
  const totalInvoiced = useMemo(() => {
    const sum = invoices.reduce((acc, inv) => acc + inv.total_amount, 0);
    return sum;
  }, [invoices]);

  const totalPaid = useMemo(() => {
    const sum = invoices.reduce((acc, inv) => acc + (inv.paid_amount || 0), 0);
    return sum;
  }, [invoices]);

  const outstandingDues = useMemo(() => {
    const dues = totalInvoiced - totalPaid;
    return dues;
  }, [totalInvoiced, totalPaid]);

  // Statistics
  const reportLevel = useMemo(() => {
    if (selectedStudentId && selectedStudentId !== "none") return "student";
    if (gradeFilter !== "all" && subjectFilter !== "all") return "grade-subject";
    if (gradeFilter !== "all") return "grade";
    if (subjectFilter !== "all") return "subject";
    return "school";
  }, [selectedStudentId, gradeFilter, subjectFilter]);

  const dashboardStats = useMemo(() => {
    // 1. Total Students
    const totalStudents = reportLevel === "student" ? 1 : filteredStudents.length;

    // 2. Average Attendance %
    const totalAttendanceDays = attendanceData.length;
    const presentAttendanceDays = attendanceData.filter(a => a.status === "present").length;
    const attendancePercentage = totalAttendanceDays > 0
      ? Math.round((presentAttendanceDays / totalAttendanceDays) * 100)
      : 0;

    // 3. Overall Homework Completion Rate
    const totalHomework = homeworkStatus.length;
    const completedHomework = homeworkStatus.filter(h => ["completed", "checked"].includes(h.status || "")).length;
    const homeworkCompletionRate = totalHomework > 0
      ? Math.round((completedHomework / totalHomework) * 100)
      : 0;

    // 4. Overall Evaluation Completion Rate (from student_chapters)
    const totalEvaluations = studentChapters.length;
    const ratedEvaluations = studentChapters.filter(sc => sc.evaluation_rating !== null).length;
    const evaluationCompletionRate = totalEvaluations > 0
      ? Math.round((ratedEvaluations / totalEvaluations) * 100)
      : 0;

    // 5. Average Test & Exam Performance
    const totalTestResults = testResults.length;
    const totalMarksObtained = testResults.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);
    const totalMaxMarks = testResults.reduce((sum, r) => sum + (r.tests?.total_marks || 0), 0);

    // Add Exam Marks
    let examObtained = 0;
    let examFull = 0;
    studentExams.forEach(e => {
      if (e.hasMarks) {
        examObtained += e.totalObtained;
        examFull += e.totalFull;
      }
    });

    const combinedObtained = totalMarksObtained + examObtained;
    const combinedFull = totalMaxMarks + examFull;

    const testPerformance = combinedFull > 0
      ? Math.round((combinedObtained / combinedFull) * 100)
      : 0;

    // 6. Total Discipline Records
    const totalDiscipline = disciplineIssues.length;

    // 7. Total Activities Conducted
    // If student selected, show participations. Else show unique activities.
    const totalActivities = reportLevel === "student" ? preschoolActivities.length : activities.length;

    return {
      totalStudents,
      attendancePercentage,
      homeworkCompletionRate,
      evaluationCompletionRate,
      testPerformance,
      totalDiscipline,
      totalActivities,
      totalTests: totalTestResults,
      totalMarksObtained,
      totalMaxMarks
    };
  }, [reportLevel, filteredStudents, attendanceData, homeworkStatus, studentChapters, testResults, disciplineIssues, activities, preschoolActivities]);

  const totalDays = attendanceData.length;
  const presentDays = attendanceData.filter((a) => a.status === "present").length;
  const attendancePercentage = dashboardStats.attendancePercentage;

  const totalTests = dashboardStats.totalTests;
  const totalMarksObtained = dashboardStats.totalMarksObtained;
  const totalMaxMarks = dashboardStats.totalMaxMarks;
  const averagePercentage = dashboardStats.testPerformance;

  const subjectPerformance = useMemo(() => {
    const subjectsMap = new Map<string, { total: number; count: number }>();

    // Process Tests
    testResults.forEach((tr: any) => {
      const subject = tr.tests?.subject;
      if (subject) {
        if (!subjectsMap.has(subject)) subjectsMap.set(subject, { total: 0, count: 0 });
        const pct = (tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100;
        const entry = subjectsMap.get(subject)!;
        entry.total += pct;
        entry.count += 1;
      }
    });

    // Process Exams
    studentExams.forEach((exam: any) => {
      if (exam.hasMarks) {
        exam.results.forEach((res: any) => {
          const subject = res.subject_name;
          if (!subjectsMap.has(subject)) subjectsMap.set(subject, { total: 0, count: 0 });
          const pct = (res.obtained / (res.full_marks || 1)) * 100;
          const entry = subjectsMap.get(subject)!;
          entry.total += pct;
          entry.count += 1;
        });
      }
    });

    return Array.from(subjectsMap.entries()).map(([name, { total, count }]) => ({
      name,
      percentage: Math.round(total / count)
    })).sort((a, b) => b.percentage - a.percentage);
  }, [testResults, studentExams]);

  const subjects = Array.from(new Set([
    ...allLessonPlans.map(lp => lp.subject).filter(Boolean),
    ...testResults.map(t => t.tests?.subject).filter(Boolean),
    ...homeworkStatus.map((hs: any) => hs.homework?.subject).filter(Boolean)
  ]));

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // AI Summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") {
        toast.error("Please select a student to generate AI summary.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("ai-student-summary", {
        body: { studentId: selectedStudentId } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAiSummary(data.summary);
      toast.success("AI summary generated successfully");
    },
    onError: (error: any) => {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate AI summary");
    } });

  // Chapter-wise Performance Data Grouping
  const chapterPerformanceData: ChapterPerformance[] = useMemo(() => {
    const dataMap = new Map<string, ChapterPerformance>();

    // Process student_chapters (lesson evaluations)
    studentChapters.forEach((sc: any) => {
      if (sc.lesson_plan_id && sc.lesson_plans) {
        if (!dataMap.has(sc.lesson_plan_id)) {
          dataMap.set(sc.lesson_plan_id, {
            lessonPlan: sc.lesson_plans,
            studentChapters: [],
            testResults: [],
            homeworkRecords: [] });
        }
        dataMap.get(sc.lesson_plan_id)?.studentChapters.push(sc);
      }
    });

    // Process test results
    testResults.forEach((tr: any) => {
      if (tr.tests?.lesson_plan_id) {
        if (!dataMap.has(tr.tests.lesson_plan_id)) {
          const correspondingLessonPlan = allLessonPlans.find(lp => lp.id === tr.tests.lesson_plan_id);
          if (correspondingLessonPlan) {
            dataMap.set(tr.tests.lesson_plan_id, {
              lessonPlan: correspondingLessonPlan as any,
              studentChapters: [],
              testResults: [],
              homeworkRecords: [] });
          } else {
            return; // Skip if no corresponding lesson plan found
          }
        }
        dataMap.get(tr.tests.lesson_plan_id)?.testResults.push(tr);
      }
    });

    // Process homework records - skip if no lesson_plan link since homework table doesn't have lesson_plan_id
    // Homework is matched by subject instead
    homeworkStatus.forEach((hs: any) => {
      const hwSubject = hs.homework?.subject;
      if (hwSubject) {
        // Find a lesson plan with the same subject
        const matchingLessonPlan = allLessonPlans.find(lp => lp.subject === hwSubject);
        if (matchingLessonPlan && dataMap.has(matchingLessonPlan.id)) {
          dataMap.get(matchingLessonPlan.id)?.homeworkRecords.push(hs);
        }
      }
    });

    // Sort by lesson plan date
    return Array.from(dataMap.values()).sort((a, b) =>
      new Date(b.lessonPlan.lesson_date).getTime() - new Date(a.lessonPlan.lesson_date).getTime()
    );
  }, [studentChapters, testResults, homeworkStatus, allLessonPlans]);

  // NEW: Calculate Missed Chapters
  const missedChapters = useMemo(() => {
    if (!selectedStudent || !selectedStudent.grade) return [];
    const studentGrade = selectedStudent.grade;

    const completedLessonPlanIds = new Set(studentChapters.map(sc => sc.lesson_plan_id));

    return allLessonPlans.filter(lp =>
      lp.grade === studentGrade && // Filter by student's grade
      !completedLessonPlanIds.has(lp.id) &&
      new Date(lp.lesson_date) >= dateRange.from &&
      new Date(lp.lesson_date) <= dateRange.to
    ).sort((a, b) => new Date(b.lesson_date).getTime() - new Date(a.lesson_date).getTime());
  }, [selectedStudent, studentChapters, allLessonPlans, dateRange]);

  // Overdue Homework - based on student_homework_records
  const overdueHomeworks = useMemo(() => {
    return homeworkStatus.filter((hs: any) => {
      const dueDate = hs.homework?.due_date ? new Date(hs.homework.due_date) : null;
      return dueDate && isPast(dueDate) && !['completed', 'checked'].includes(hs.status);
    });
  }, [homeworkStatus]);


  const getRatingStars = (rating: number | null) => {
    if (rating === null) return "N/A";
    return Array(rating).fill("⭐").join("");
  };

  // Export CSV
  const exportToCSV = () => {
    if (!selectedStudent) return;

    const csvRows: string[][] = [];

    csvRows.push(["Student Report"]);
    csvRows.push(["Name", selectedStudent.name]);
    csvRows.push(["Grade", selectedStudent.grade]);
    csvRows.push([]);

    csvRows.push(["Attendance Summary"]);
    csvRows.push(["Total Days", totalDays.toString()]);
    csvRows.push(["Present", presentDays.toString()]);
    csvRows.push(["Absent", (totalDays - presentDays).toString()]);
    csvRows.push(["Percentage", attendancePercentage + "%"]);
    csvRows.push([]);

    csvRows.push(["Finance Summary"]);
    csvRows.push(["Total Invoiced", totalInvoiced.toString()]);
    csvRows.push(["Total Paid", totalPaid.toString()]);
    csvRows.push(["Outstanding Dues", outstandingDues.toString()]);
    csvRows.push([]);

    csvRows.push(["Chapter-wise Performance"]);
    csvRows.push(["Subject", "Chapter", "Topic", "Lesson Date", "Evaluation Rating", "Teacher Notes", "Test Name", "Test Marks", "Homework Title", "Homework Status"]);
    chapterPerformanceData.forEach(chapterGroup => {
      const lp = chapterGroup.lessonPlan;
      const sc = chapterGroup.studentChapters[0]; // Assuming one student_chapter per lesson plan for simplicity in CSV

      const baseRow = [
        lp.subject || '',
        lp.chapter || '',
        lp.topic || '',
        safeFormatDate(lp.lesson_date, "PPP"),
        sc?.evaluation_rating ? `${sc.evaluation_rating}/5` : 'N/A',
        sc?.teacher_notes || '',
      ];

      if (chapterGroup.testResults.length > 0 || chapterGroup.homeworkRecords.length > 0) {
        const maxEntries = Math.max(chapterGroup.testResults.length, chapterGroup.homeworkRecords.length);
        for (let i = 0; i < maxEntries; i++) {
          const test = chapterGroup.testResults[i];
          const homework = chapterGroup.homeworkRecords[i];
          csvRows.push([
            ...baseRow,
            test ? test.tests?.name || '' : '',
            test ? `${test.marks_obtained}/${test.tests?.total_marks}` : '',
            homework ? homework.homework?.title || '' : '',
            homework ? homework.status || '' : '',
          ]);
        }
      } else {
        csvRows.push([...baseRow, '', '', '', '']); // Add empty columns if no tests/homework
      }
    });
    csvRows.push([]);

    // NEW: Missed Chapters to CSV
    csvRows.push(["Missed Chapters"]);
    csvRows.push(["Subject", "Chapter", "Topic", "Lesson Date"]);
    missedChapters.forEach(lp => {
      csvRows.push([
        lp.subject || '',
        lp.chapter || '',
        lp.topic || '',
        safeFormatDate(lp.lesson_date, "PPP"),
      ]);
    });
    csvRows.push([]);

    // Overdue Homework to CSV
    csvRows.push(["Overdue Homework"]);
    csvRows.push(["Title", "Subject", "Status", "Due Date"]);
    overdueHomeworks.forEach((hw: any) => {
      csvRows.push([
        hw.homework?.title || '',
        hw.homework?.subject || '',
        hw.status || '',
        safeFormatDate(hw.homework?.due_date, "PPP"),
      ]);
    });
    csvRows.push([]);

    csvRows.push(["Preschool Activities"]);
    csvRows.push(["Type", "Title", "Description", "Date", "Involvement", "Photo Link", "Video Link"]);
    preschoolActivities.forEach((pa: any) => {
      csvRows.push([
        pa.activities?.activity_types?.name || 'N/A',
        pa.activities?.title || 'N/A',
        pa.activities?.description || 'N/A',
        pa.activities?.activity_date ? safeFormatDate(pa.activities.activity_date, "PPP") : 'N/A',
        pa.involvement_score || 'N/A',
        pa.activities?.photo_url ? supabase.storage.from("activity-photos").getPublicUrl(pa.activities.photo_url).data.publicUrl : '',
        pa.activities?.video_url ? supabase.storage.from("activity-videos").getPublicUrl(pa.activities.video_url).data.publicUrl : '',
      ]);
    });
    csvRows.push([]);

    csvRows.push(["Discipline Issues"]);
    csvRows.push(["Category", "Description", "Severity", "Date"]);
    disciplineIssues.forEach((di: any) => {
      csvRows.push([
        di.discipline_categories?.name || 'N/A',
        di.description,
        di.severity,
        safeFormatDate(di.issue_date, "PPP"),
      ]);
    });
    csvRows.push([]);

    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedStudent.name}_report.csv`;
    a.click();
  };

  // Print
  const handlePrint = () => {
    const content = document.getElementById("printable-report");
    if (content) {
      const newWindow = window.open("", "_blank");
      newWindow?.document.write(`
        <html>
          <head>
            <title>Academic Performance Report — ${selectedStudent?.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
              body {
                font-family: 'Inter', -apple-system, sans-serif;
                padding: 40px;
                color: #1e293b;
                background: white;
              }
              .print-header {
                border-bottom: 4px solid #4f46e5;
                padding-bottom: 20px;
                margin-bottom: 30px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              .print-header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 800;
                letter-spacing: -0.025em;
                color: #4f46e5;
                text-transform: uppercase;
              }
              .print-header p {
                margin: 4px 0 0 0;
                font-size: 14px;
                color: #64748b;
                font-weight: 500;
              }
              h2 {
                font-size: 18px;
                font-weight: 700;
                margin: 30px 0 15px 0;
                color: #0f172a;
                display: flex;
                align-items: center;
                gap: 8px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
              }
              h3 { font-size: 15px; font-weight: 700; margin: 20px 0 10px 0; color: #334155; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 25px; font-size: 12px; }
              th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
              th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; color: #64748b; font-size: 10px; letter-spacing: 0.05em; }
              .text-green-600 { color: #16a34a; font-weight: 700; }
              .text-red-600 { color: #dc2626; font-weight: 700; }
              .text-orange-600 { color: #ea580c; font-weight: 700; }
              .text-blue-600 { color: #2563eb; font-weight: 700; }
              .font-bold { font-weight: 700; }
              .text-muted-foreground { color: #64748b; }
              .badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                background: #f1f5f9;
                color: #475569;
              }
              .stats-grid {
                display: grid;
                grid-template-cols: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 30px;
              }
              .stat-box {
                padding: 15px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
              }
              .stat-box p:first-child {
                margin: 0;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                color: #64748b;
                letter-spacing: 0.05em;
              }
              .stat-box p:last-child {
                margin: 5px 0 0 0;
                font-size: 20px;
                font-weight: 800;
                color: #1e293b;
              }
              .chapter-group {
                margin-bottom: 20px;
                padding: 15px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
              }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
                .chapter-group { page-break-inside: avoid; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <div>
                <h1>Official Progress Report</h1>
                <p>Academic Cycle: ${format(dateRange.from, "MMM yyyy")} - ${format(dateRange.to, "MMM yyyy")}</p>
              </div>
              <div style="text-right">
                <p style="font-weight: 800; color: #0f172a; font-size: 18px;">${selectedStudent?.name}</p>
                <p>Grade: ${selectedStudent?.grade} | Center: ${user?.center_name || 'Institution'}</p>
              </div>
            </div>
            ${content.innerHTML}
            <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; pt-20px; display: flex; justify-content: space-between;">
              <p style="font-size: 10px; color: #94a3b8;">Generated on ${format(new Date(), "PPP p")}</p>
              <p style="font-size: 10px; color: #94a3b8;">Computer Generated Record</p>
            </div>
          </body>
        </html>
      `);
      newWindow?.document.close();
      newWindow?.focus();
      setTimeout(() => {
        newWindow?.print();
        newWindow?.close();
      }, 500);
    }
  };

  const getHomeworkStatusIcon = (status: StudentHomeworkRecord['status']) => {
    switch (status) {
      case 'completed':
      case 'checked':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'assigned':
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getSeverityColor = (severity: Tables<'discipline_issues'>['severity']) => {
    switch (severity) {
      case "low": return "text-green-600";
      case "medium": return "text-orange-600";
      case "high": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const StatCard = ({ title, value, icon: Icon, description, colorClass, targetId }: any) => {
    const isClickable = !!targetId && reportLevel === "student";

    const handleClick = () => {
      if (isClickable) {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    return (
      <Card
        onClick={handleClick}
        className={cn(
          "group relative border-none shadow-soft overflow-hidden transition-all duration-500",
          isClickable ? "cursor-pointer hover:shadow-strong hover:-translate-y-1" : "hover:shadow-medium"
        )}
      >
        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 via-transparent to-transparent")} />
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{title}</p>
              <h3 className="text-3xl font-black tracking-tight group-hover:text-primary transition-colors duration-300">{value}</h3>
              {description && <p className="text-[10px] font-medium text-muted-foreground italic">{description}</p>}
            </div>
            <div className={cn("p-3 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3", colorClass)}>
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const SummaryDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/80 font-mono">Real-time Analytics</h2>
        </div>
        <div className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-muted-foreground/10 uppercase tracking-widest">
          Updated just now
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={reportLevel === "student" ? "Financial Status" : "Total Students"}
          value={reportLevel === "student" ? formatCurrency(outstandingDues) : dashboardStats.totalStudents}
          icon={reportLevel === "student" ? DollarSign : Users}
          colorClass="bg-blue-500/10"
          targetId="finance-section"
          description={reportLevel === "student" ? "Outstanding Balance" : ""}
        />
        <StatCard
          title="Attendance"
          value={`${dashboardStats.attendancePercentage}%`}
          icon={Clock}
          colorClass="bg-green-500/10"
          description="Average student attendance"
          targetId="attendance-section"
        />
        <StatCard
          title="Homework Completion"
          value={`${dashboardStats.homeworkCompletionRate}%`}
          icon={Book}
          colorClass="bg-orange-500/10"
          description="Assigned vs Completed"
          targetId="overdue-homework-section"
        />
        <StatCard
          title="Evaluation Completion"
          value={`${dashboardStats.evaluationCompletionRate}%`}
          icon={Star}
          colorClass="bg-yellow-500/10"
          description="Lesson evaluations"
          targetId="milestones-section"
        />
        <StatCard
          title="Test Performance"
          value={`${dashboardStats.testPerformance}%`}
          icon={ClipboardCheck}
          colorClass="bg-purple-500/10"
          description="Average score across tests"
          targetId="tests-section"
        />
        <StatCard
          title="Activities"
          value={dashboardStats.totalActivities}
          icon={Paintbrush}
          colorClass="bg-pink-500/10"
          description="Total activities conducted"
          targetId="activities-section"
        />
        <StatCard
          title="Discipline Records"
          value={dashboardStats.totalDiscipline}
          icon={AlertTriangle}
          colorClass="bg-red-500/10"
          description="Total incidents reported"
          targetId="discipline-section"
        />
        {(reportLevel === "subject" || reportLevel === "grade-subject") && (
          <StatCard
            title="Lessons Covered"
            value={studentChapters.length}
            icon={BookOpen}
            colorClass="bg-primary/10"
          />
        )}
      </div>

      {/* Subject Wise Performance Cards */}
      {subjectPerformance.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Subject Performance</h3>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
            {subjectPerformance.map((sp) => (
              <Card key={sp.name} className="border-none shadow-soft bg-card/40 backdrop-blur-sm overflow-hidden group hover:shadow-medium transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[80px] md:max-w-none">{sp.name}</p>
                      <p className="text-xl font-black group-hover:text-primary transition-colors">{sp.percentage}%</p>
                    </div>
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      sp.percentage >= 75 ? "bg-green-500" : sp.percentage >= 50 ? "bg-orange-500" : "bg-red-500"
                    )} />
                  </div>
                  <div className="mt-2 w-full h-1 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000",
                        sp.percentage >= 75 ? "bg-green-500" : sp.percentage >= 50 ? "bg-orange-500" : "bg-red-500"
                      )}
                      style={{ width: `${sp.percentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Aggregate Tables for Grade/Subject */}
      {(reportLevel === "grade" || reportLevel === "subject" || reportLevel === "grade-subject" || reportLevel === "school") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/40 backdrop-blur-md border border-border/20">
            <CardHeader className="border-b border-muted/20 bg-muted/5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <ClipboardCheck className="h-5 w-5 text-purple-600" />
                </div>
                Academic Performance Spotlight
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {testResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="p-3 rounded-full bg-muted/10">
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium italic">No test results found for this selection.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testResults.slice(0, 5).map((tr: any) => {
                    const pct = Math.round((tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100);
                    return (
                      <div key={tr.id} className="group p-4 rounded-xl bg-card/50 border border-transparent hover:border-primary/10 hover:shadow-soft transition-all duration-300">
                        <div className="flex justify-between items-start mb-2">
                          <div className="space-y-1">
                            <p className="font-bold text-sm group-hover:text-primary transition-colors">{tr.tests?.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4 border-muted-foreground/20 text-muted-foreground">
                                {tr.tests?.subject}
                              </Badge>
                              <p className="text-[10px] font-medium text-muted-foreground">{safeFormatDate(tr.date_taken, "PPP")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-lg">{tr.marks_obtained}<span className="text-xs text-muted-foreground font-medium">/{tr.tests?.total_marks}</span></p>
                            <p className={cn("text-xs font-bold", pct >= 75 ? "text-green-600" : pct >= 50 ? "text-orange-600" : "text-red-600")}>{pct}%</p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-1000", pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-orange-500" : "bg-red-500")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/40 backdrop-blur-md border border-border/20">
            <CardHeader className="border-b border-muted/20 bg-muted/5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                Behavioral Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {disciplineIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="p-3 rounded-full bg-muted/10">
                    <CheckCircle className="h-8 w-8 text-green-500/40" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium italic">No discipline records found for this selection.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {disciplineIssues.slice(0, 5).map((di: any) => (
                    <div key={di.id} className="p-4 rounded-xl bg-card/50 border border-transparent hover:border-red-500/10 hover:shadow-soft transition-all duration-300">
                      <div className="flex justify-between items-start mb-1">
                        <div className="space-y-1">
                          <p className="font-bold text-sm">{di.discipline_categories?.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{di.description}</p>
                        </div>
                        <Badge className={cn("text-[10px] font-black uppercase tracking-tighter px-1.5 py-0 h-5",
                          di.severity === "high" ? "bg-red-500 text-white" :
                          di.severity === "medium" ? "bg-orange-500 text-white" : "bg-green-500 text-white")}>
                          {di.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-muted/20">
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{safeFormatDate(di.issue_date, "PPP")}</p>
                        <p
                          className="text-[10px] font-medium text-primary underline cursor-pointer hover:text-primary/80 transition-colors"
                          onClick={() => setSelectedDisciplineIssue(di)}
                        >
                          View details
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const isLoading = isAttendanceLoading || isChaptersLoading || isTestsLoading || isHomeworkLoading || isActivitiesLoading || isDisciplineLoading || isAllActivitiesLoading;

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Header and Print/Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <BarChart3 className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Performance Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="rounded-md px-2 py-0 text-[10px] uppercase font-bold tracking-widest bg-primary/5 text-primary border-primary/10">
                  {reportLevel.replace('-', ' ')} level
                </Badge>
                {reportLevel === "student" && selectedStudent && (
                  <span className="text-sm font-medium text-muted-foreground">— {selectedStudent.name}</span>
                )}
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Real-time academic intelligence and performance analytics across your institution.
          </p>
        </div>
        {selectedStudentId !== "none" && (
          <div className="flex gap-3">
            <Button onClick={exportToCSV} variant="outline" className="rounded-xl border-2">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={handlePrint} variant="outline" className="rounded-xl border-2">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {/* Filters */}
      <div className={cn("relative group transition-all duration-700", isLoading ? "opacity-50 grayscale pointer-events-none" : "opacity-100")}>
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <Card className="relative border-none shadow-medium p-8 overflow-hidden bg-card/60 backdrop-blur-2xl border border-white/30 rounded-3xl">
          <div className="flex flex-wrap gap-8 items-end">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Student</label>
          <Select value={selectedStudentId} onValueChange={(val) => { setSelectedStudentId(val); setSelectedPublishedExamId("none"); }}>
            <SelectTrigger className="w-[220px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
              <SelectValue placeholder="Select Student" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
              {filteredStudents.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedStudentId !== "none" && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Published Result</label>
            <Select value={selectedPublishedExamId} onValueChange={setSelectedPublishedExamId}>
              <SelectTrigger className="w-[200px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
                <SelectValue placeholder="Pick a Result" />
              </SelectTrigger>
              <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                <SelectItem value="none">No Result Selected</SelectItem>
                {studentExams
                  .filter(e => e.status === 'results_published')
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">From Date</label>
          <Input
            type="date"
            className="w-[160px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl"
            value={safeFormatDate(dateRange.from, "yyyy-MM-dd")}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">To Date</label>
          <Input
            type="date"
            className="w-[160px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl"
            value={safeFormatDate(dateRange.to, "yyyy-MM-dd")}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Subject</label>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[160px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      </Card>
      </div>

      {isLoading ? (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-10 w-64 rounded-lg" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-full max-w-xl rounded-md" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>

          <Skeleton className="h-32 w-full rounded-[2rem]" />

          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="border-none shadow-soft p-6 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3">
                      <Skeleton className="h-3 w-20 rounded-full" />
                      <Skeleton className="h-10 w-16 rounded-lg" />
                      <Skeleton className="h-2 w-28 rounded-full" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-[400px] w-full rounded-[2rem] shadow-soft" />
            <Skeleton className="h-[400px] w-full rounded-[2rem] shadow-soft" />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <SummaryDashboard />

          {selectedPublishedExamId !== "none" && studentExams.find(e => e.id === selectedPublishedExamId) && (
            <Card className="border-none shadow-strong overflow-hidden rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500">
              <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    Published Result: {studentExams.find(e => e.id === selectedPublishedExamId)?.name}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPublishedExamId("none")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-4 w-4 mr-1" /> Clear Filter
                </Button>
              </CardHeader>
              <CardContent className="p-8">
                {(() => {
                  const exam = studentExams.find(e => e.id === selectedPublishedExamId);
                  return (
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-muted/30 p-6 rounded-2xl border">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Marks</p>
                          <p className="text-xl font-black">{exam.totalObtained}/{exam.totalFull}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Percentage</p>
                          <p className="text-xl font-black text-primary">{exam.percentage.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grade</p>
                          <p className="text-xl font-black">{getGradeFormal(exam.percentage)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</p>
                          <Badge variant={exam.allPassed ? "success" : "destructive"} className="font-black uppercase">
                            {exam.allPassed ? "PASSED" : "FAILED"}
                          </Badge>
                        </div>
                      </div>

                      <div className="rounded-2xl border overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 border-b">
                            <tr>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Subject</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Full Marks</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Obtained</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {exam.results.map((res: any) => (
                              <tr key={res.id}>
                                <td className="px-6 py-4 font-semibold">{res.subject_name}</td>
                                <td className="px-6 py-4 text-center">{res.full_marks}</td>
                                <td className="px-6 py-4 text-center font-black text-primary">{res.obtained}</td>
                                <td className="px-6 py-4 text-center">
                                  <Badge variant={res.passed ? "success" : "destructive"} className="text-[9px] uppercase font-bold">
                                    {res.passed ? "Pass" : "Fail"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={() => setSelectedExamResult(exam)}
                          className="rounded-xl shadow-soft"
                        >
                          <Printer className="h-4 w-4 mr-2" /> View & Print Full Marksheet
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {reportLevel === "student" && selectedStudent && (
            <div id="printable-report" className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
                Detailed Academic Profile
              </span>
            </div>
          </div>

          {/* Finance Summary */}
          <Card id="finance-section" className="border-none shadow-strong overflow-hidden rounded-2xl">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>Total Invoiced: {formatCurrency(totalInvoiced)}</div>
                <div>Total Paid: {formatCurrency(totalPaid)}</div>
                <div>Outstanding Dues: {formatCurrency(outstandingDues)}</div>
              </div>
              <h3 className="font-semibold mb-2">Payment History</h3>
              {payments.length === 0 ? (
                <p className="text-muted-foreground">No payments recorded.</p>
              ) : (
                <div className="overflow-x-auto max-h-48 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">Date</th>
                        <th className="border px-2 py-1">Amount</th>
                        <th className="border px-2 py-1">Method</th>
                        <th className="border px-2 py-1">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="border px-2 py-1">{safeFormatDate(p.payment_date, "PPP")}</td>
                          <td className="border px-2 py-1">{formatCurrency(p.amount)}</td>
                          <td className="border px-2 py-1">{p.payment_method}</td>
                          <td className="border px-2 py-1">{p.reference_number || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Overview */}
          <Card id="attendance-section" className="border-none shadow-strong overflow-hidden rounded-2xl">
            <CardHeader className="bg-green-500/5 pb-4 border-b border-green-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                Attendance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>Total Days: {totalDays}</div>
                <div>Present: {presentDays}</div>
                <div>Absent: {totalDays - presentDays}</div>
                <div>Attendance %: {attendancePercentage}%</div>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Status</th>
                      <th className="border px-2 py-1">Time In</th>
                      <th className="border px-2 py-1">Time Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((record) => (
                      <tr
                        key={record.id}
                        className={cn(record.remarks?.includes('Approved Leave') && "bg-orange-50 cursor-pointer hover:bg-orange-100")}
                        onClick={() => record.remarks && setSelectedAttendanceDetail(record)}
                      >
                        <td className="border px-2 py-1">
                          <div className="flex items-center justify-between">
                            {safeFormatDate(record.date, "PPP")}
                            {record.remarks?.includes('Approved Leave') && <Badge variant="outline" className="text-[8px] h-4 bg-white text-orange-600 border-orange-200">LEAVE</Badge>}
                          </div>
                        </td>
                        <td className="border px-2 py-1 capitalize">{record.status}</td>
                        <td className="border px-2 py-1">{record.time_in || "-"}</td>
                        <td className="border px-2 py-1">{record.time_out || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Chapter-wise Performance */}
          <Card id="milestones-section" className="border-none shadow-strong overflow-hidden rounded-2xl">
            <CardHeader className="bg-blue-500/5 pb-4 border-b border-blue-500/10">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                Curricular Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {chapterPerformanceData.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic">No chapter performance data available for the selected filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Subject</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Topic</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Evaluation</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Homework</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Result</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {chapterPerformanceData.map((chapterGroup) => {
                        const evaluation = chapterGroup.studentChapters[0];
                        const testResult = chapterGroup.testResults[0];
                        const homework = chapterGroup.homeworkRecords[0];

                        const avgPct = chapterGroup.testResults.length > 0
                          ? Math.round(chapterGroup.testResults.reduce((acc, tr) => acc + (tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100, 0) / chapterGroup.testResults.length)
                          : null;

                        return (
                          <tr key={chapterGroup.lessonPlan.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-6 py-4 font-semibold">{chapterGroup.lessonPlan.subject}</td>
                            <td className="px-6 py-4">
                              <p className="font-medium">{chapterGroup.lessonPlan.topic}</p>
                              <p className="text-[10px] text-muted-foreground">Chapter: {chapterGroup.lessonPlan.chapter}</p>
                            </td>
                            <td className="px-6 py-4">
                              {evaluation ? getRatingStars(evaluation.evaluation_rating) : <span className="text-muted-foreground italic text-xs">N/A</span>}
                            </td>
                            <td className="px-6 py-4">
                              {homework ? (
                                <Badge variant={homework.status === 'completed' || homework.status === 'checked' ? 'success' : homework.status === 'in_progress' ? 'warning' : 'destructive'} className="text-[9px] uppercase font-bold">
                                  {homework.status}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground italic text-xs">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-bold">
                              {avgPct !== null ? (
                                <span className={cn(avgPct >= 75 ? "text-green-600" : avgPct >= 50 ? "text-orange-600" : "text-red-600")}>
                                  {avgPct}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic text-xs">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full"
                                onClick={() => setSelectedChapterDetail(chapterGroup)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exam Schedules & Results Section */}
          <Card id="published-results-section" className="border-none shadow-strong overflow-hidden rounded-2xl bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  Formal Assessment Records
                </CardTitle>
                <div className="flex items-center gap-3 bg-card/60 p-1.5 rounded-xl border border-border/40 shadow-soft">
                  <span className="text-[10px] font-black text-muted-foreground uppercase ml-2">Filter Result:</span>
                  <Select value={selectedPublishedExamId} onValueChange={setSelectedPublishedExamId}>
                    <SelectTrigger className="w-[180px] h-8 bg-transparent border-none focus:ring-0 text-[11px] font-bold">
                      <SelectValue placeholder="All Published Exams" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
                      <SelectItem value="none">Show All History</SelectItem>
                      {studentExams
                        .filter(e => e.status === 'results_published')
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {selectedPublishedExamId !== "none" ? (
                <div className="p-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                  {(() => {
                    const exam = studentExams.find(e => e.id === selectedPublishedExamId);
                    if (!exam) return <div className="p-8 text-center text-muted-foreground">Result not found.</div>;
                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-primary/5 p-6 rounded-3xl border border-primary/10">
                          <div className="space-y-1 text-center border-r border-primary/10">
                            <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Synthesis Score</p>
                            <p className="text-2xl font-black">{exam.totalObtained}/{exam.totalFull}</p>
                          </div>
                          <div className="space-y-1 text-center border-r border-primary/10">
                            <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Proficiency %</p>
                            <p className="text-2xl font-black text-primary">{exam.percentage.toFixed(1)}%</p>
                          </div>
                          <div className="space-y-1 text-center border-r border-primary/10">
                            <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Grade Rank</p>
                            <p className="text-2xl font-black">{getGradeFormal(exam.percentage)}</p>
                          </div>
                          <div className="space-y-1 text-center">
                            <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Outcome</p>
                            <div className="flex justify-center mt-1">
                              <Badge variant={exam.allPassed ? "success" : "destructive"} className="font-black uppercase text-[10px] rounded-lg">
                                {exam.allPassed ? "PASSED" : "FAILED"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-border/40 overflow-hidden bg-white/20 backdrop-blur-sm">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 border-b">
                              <tr>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Subject Domain</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Full Scale</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Obtained</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {exam.results.map((res: any) => (
                                <tr key={res.id} className="hover:bg-primary/5 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-700">{res.subject_name}</td>
                                  <td className="px-6 py-4 text-center font-medium text-slate-400">{res.full_marks}</td>
                                  <td className="px-6 py-4 text-center font-black text-primary">{res.obtained}</td>
                                  <td className="px-6 py-4 text-center">
                                    <Badge variant={res.passed ? "success" : "destructive"} className="text-[9px] uppercase font-bold rounded-md">
                                      {res.passed ? "Pass" : "Fail"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-between items-center">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
                              * Official academic record for {exam.name}
                           </p>
                           <Button
                             onClick={() => setSelectedExamResult(exam)}
                             className="rounded-2xl shadow-strong bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest px-6"
                           >
                             <Printer className="h-4 w-4 mr-2" /> View Full Marksheet
                           </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Assessment Name</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Date</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Status</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Total Scale</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Proficiency</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Rank</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground text-center">Management</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {studentExams.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground italic">No assessment history found.</td></tr>
                      ) : (
                        studentExams.map((exam: any) => (
                          <tr key={exam.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-700">{exam.name}</p>
                              <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Academic Assessment</p>
                            </td>
                            <td className="px-6 py-4 text-[11px] font-medium text-slate-500">{safeFormatDate(exam.exam_date, "PPP")}</td>
                            <td className="px-6 py-4">
                              {exam.hasMarks ? (
                                <Badge variant={exam.isPartial ? "warning" : "success"} className="text-[9px] uppercase font-black rounded-md">
                                  {exam.isPartial ? "Partial Result" : "Result Ready"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] uppercase font-bold rounded-md">Scheduled</Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">
                              {exam.hasMarks ? `${exam.totalObtained}/${exam.totalFull}` : "-"}
                            </td>
                            <td className="px-6 py-4">
                              {exam.hasMarks ? (
                                <span className={cn("font-black", exam.percentage >= 75 ? "text-green-600" : exam.percentage >= 50 ? "text-orange-600" : "text-red-600")}>
                                  {exam.percentage.toFixed(1)}%
                                </span>
                              ) : "-"}
                            </td>
                            <td className="px-6 py-4 font-black text-slate-700">
                              {exam.hasMarks ? getGradeFormal(exam.percentage) : "-"}
                            </td>
                            <td className="px-6 py-4 text-center">
                               <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {exam.hasMarks ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-primary bg-white shadow-soft hover:bg-primary/10 rounded-xl"
                                      onClick={() => setSelectedExamResult(exam)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-slate-400 bg-white shadow-soft hover:bg-slate-50 rounded-xl"
                                      onClick={() => setSelectedExamSchedule(exam)}
                                    >
                                      <Calendar className="h-4 w-4" />
                                    </Button>
                                  )}
                               </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Report */}
          <Card id="tests-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" /> Test Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-muted-foreground">No test results found for the selected filters.</p>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-80 border rounded mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border px-2 py-1">Test Name</th>
                          <th className="border px-2 py-1">Subject</th>
                          <th className="border px-2 py-1">Date Taken</th>
                          <th className="border px-2 py-1">Marks Obtained</th>
                          <th className="border px-2 py-1">Total Marks</th>
                          <th className="border px-2 py-1">Percentage</th>
                          <th className="border px-2 py-1">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.map((tr: any) => {
                          const percentage = tr.tests?.total_marks
                            ? Math.round((tr.marks_obtained / tr.tests.total_marks) * 100)
                            : 0;
                          const getGradeColor = (pct: number) => {
                            if (pct >= 90) return 'text-green-600 font-semibold';
                            if (pct >= 75) return 'text-blue-600 font-semibold';
                            if (pct >= 60) return 'text-yellow-600 font-semibold';
                            if (pct >= 50) return 'text-orange-600 font-semibold';
                            return 'text-red-600 font-semibold';
                          };
                          const getGrade = (pct: number) => {
                            if (pct >= 90) return 'A+';
                            if (pct >= 80) return 'A';
                            if (pct >= 75) return 'B+';
                            if (pct >= 70) return 'B';
                            if (pct >= 60) return 'C+';
                            if (pct >= 50) return 'C';
                            return 'F';
                          };
                          return (
                            <tr key={tr.id}>
                              <td className="border px-2 py-1 font-medium">{tr.tests?.name || 'N/A'}</td>
                              <td className="border px-2 py-1">{tr.tests?.subject || 'N/A'}</td>
                              <td className="border px-2 py-1">{safeFormatDate(tr.date_taken, "PPP")}</td>
                              <td className="border px-2 py-1 font-semibold">{tr.marks_obtained}</td>
                              <td className="border px-2 py-1">{tr.tests?.total_marks || 'N/A'}</td>
                              <td className={`border px-2 py-1 ${getGradeColor(percentage)}`}>{percentage}%</td>
                              <td className={`border px-2 py-1 ${getGradeColor(percentage)}`}>{getGrade(percentage)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-4 border-t">
                    <div>
                      <p className="text-muted-foreground">Total Tests</p>
                      <p className="font-semibold">{totalTests}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Average Score</p>
                      <p className="font-semibold">{averagePercentage}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Marks</p>
                      <p className="font-semibold">{totalMarksObtained}/{totalMaxMarks}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Overall Performance</p>
                      <p className={`font-semibold ${averagePercentage >= 75 ? 'text-green-600' : averagePercentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {averagePercentage >= 75 ? 'Good' : averagePercentage >= 60 ? 'Average' : 'Needs Improvement'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* NEW: Missed Chapters */}
          <Card id="missed-chapters-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" /> Missed Chapters
              </CardTitle>
            </CardHeader>
            <CardContent>
              {missedChapters.length === 0 ? (
                <p className="text-muted-foreground">No missed chapters found for the selected period.</p>
              ) : (
                <div className="overflow-x-auto max-h-80 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">Subject</th>
                        <th className="border px-2 py-1">Chapter</th>
                        <th className="border px-2 py-1">Topic</th>
                        <th className="border px-2 py-1">Lesson Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missedChapters.map((lp) => (
                        <tr key={lp.id}>
                          <td className="border px-2 py-1">{lp.subject}</td>
                          <td className="border px-2 py-1">{lp.chapter}</td>
                          <td className="border px-2 py-1">{lp.topic}</td>
                          <td className="border px-2 py-1">{safeFormatDate(lp.lesson_date, "PPP")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NEW: Overdue Homework */}
          <Card id="overdue-homework-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" /> Overdue Homework
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueHomeworks.length === 0 ? (
                <p className="text-muted-foreground">No overdue homework found for the selected period.</p>
              ) : (
                <div className="overflow-x-auto max-h-80 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">Title</th>
                        <th className="border px-2 py-1">Subject</th>
                        <th className="border px-2 py-1">Status</th>
                        <th className="border px-2 py-1">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueHomeworks.map((hw: any) => (
                        <tr key={hw.id}>
                          <td className="border px-2 py-1">{hw.homework?.title || '-'}</td>
                          <td className="border px-2 py-1">{hw.homework?.subject || '-'}</td>
                          <td className="border px-2 py-1">{hw.status}</td>
                          <td className="border px-2 py-1">{safeFormatDate(hw.homework?.due_date, "PPP")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preschool Activities */}
          <Card id="activities-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5" /> Preschool Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {preschoolActivities.length === 0 ? (
                <p className="text-muted-foreground">No preschool activities found.</p>
              ) : (
                <div className="overflow-x-auto max-h-80 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">Type</th>
                        <th className="border px-2 py-1">Title</th>
                        <th className="border px-2 py-1">Description</th>
                        <th className="border px-2 py-1">Date</th>
                        <th className="border px-2 py-1">Involvement</th>
                        <th className="border px-2 py-1">Media</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preschoolActivities.map((pa: any) => (
                        <tr key={pa.id}>
                          <td className="border px-2 py-1">{pa.activities?.activity_types?.name || 'N/A'}</td>
                          <td className="border px-2 py-1">{pa.activities?.title || 'N/A'}</td>
                          <td className="border px-2 py-1">{pa.activities?.description || 'N/A'}</td>
                          <td className="border px-2 py-1">{pa.activities?.activity_date ? safeFormatDate(pa.activities.activity_date, "PPP") : 'N/A'}</td>
                          <td className="border px-2 py-1">{pa.involvement_score || "N/A"}</td>
                          <td className="border px-2 py-1">
                            {pa.activities?.photo_url && (
                              <a href={supabase.storage.from("activity-photos").getPublicUrl(pa.activities.photo_url).data.publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mr-2">Photo</a>
                            )}
                            {pa.activities?.video_url && (
                              <a href={supabase.storage.from("activity-videos").getPublicUrl(pa.activities.video_url).data.publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Video</a>
                            )}
                            {!pa.activities?.photo_url && !pa.activities?.video_url && "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discipline Issues */}
          <Card id="discipline-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Discipline Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {disciplineIssues.length === 0 ? (
                <p className="text-muted-foreground">No discipline issues found.</p>
              ) : (
                <div className="overflow-x-auto max-h-80 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">Category</th>
                        <th className="border px-2 py-1">Description</th>
                        <th className="border px-2 py-1">Severity</th>
                        <th className="border px-2 py-1">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disciplineIssues.map((di: any) => (
                        <tr key={di.id}>
                          <td className="border px-2 py-1">{di.discipline_categories?.name || 'N/A'}</td>
                          <td className="border px-2 py-1">{di.description}</td>
                          <td className="border px-2 py-1">
                            <span className={`font-semibold ${getSeverityColor(di.severity)}`}>
                              {di.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="border px-2 py-1">{safeFormatDate(di.issue_date, "PPP")}</td>
                          <td className="border px-2 py-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] font-bold uppercase text-primary"
                              onClick={() => setSelectedDisciplineIssue(di)}
                            >
                              Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

              {/* AI Summary */}
              <Card id="ai-summary-section">
                <CardHeader>
                  <CardTitle>AI Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {aiSummary ? (
                    <Textarea value={aiSummary} onChange={e => setAiSummary(e.target.value)} rows={12} className="resize-none" />
                  ) : (
                    <Button onClick={() => generateSummaryMutation.mutate()} disabled={generateSummaryMutation.isPending}>
                      {generateSummaryMutation.isPending ? "Generating..." : "Generate AI Summary"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Exam Schedule Dialog */}
      <Dialog open={!!selectedExamSchedule} onOpenChange={() => setSelectedExamSchedule(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Exam Schedule
            </DialogTitle>
            <DialogDescription>Examination details and subject-wise schedule.</DialogDescription>
          </DialogHeader>

          {selectedExamSchedule && (
            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Examination</p>
                <p className="text-lg font-bold text-primary">{selectedExamSchedule.name}</p>
                <p className="text-sm font-medium text-muted-foreground">Grade {selectedExamSchedule.grade} • {selectedExamSchedule.academic_year}</p>
              </div>

              <div className="bg-muted/30 p-4 rounded-2xl border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Base Exam Date</span>
                  <span className="text-sm font-semibold">{safeFormatDate(selectedExamSchedule.exam_date, "PPP")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Total Subjects</span>
                  <span className="text-sm font-semibold">{selectedExamSchedule.results.length}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Included Subjects</p>
                <div className="grid grid-cols-1 gap-2">
                  {selectedExamSchedule.results.map((subj: any) => (
                    <div key={subj.id} className="flex justify-between items-center p-3 bg-white border rounded-xl shadow-sm">
                      <span className="font-bold text-sm text-foreground/80">{subj.subject_name}</span>
                      <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
                        <span className="text-muted-foreground">Full: {subj.full_marks}</span>
                        <span className="text-muted-foreground">Pass: {subj.pass_marks}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedExamSchedule(null)}>Close Schedule</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Published Result Marksheet Dialog */}
      <Dialog open={!!selectedExamResult} onOpenChange={() => setSelectedExamResult(null)}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="no-print">
            <DialogTitle>Official Marksheet</DialogTitle>
            <DialogDescription>Formal academic record for {selectedExamResult?.name}</DialogDescription>
          </DialogHeader>

          {selectedExamResult && (
            <div id="marksheet-content-report" className="space-y-6">
              <div className="text-center space-y-2 border-b pb-6">
                <h1 className="text-2xl font-black text-primary tracking-tight">OFFICIAL MARKSHEET</h1>
                <h2 className="text-lg font-bold text-foreground/80 uppercase">{selectedExamResult.name}</h2>
                <p className="text-sm font-medium text-muted-foreground">Academic Year: {selectedExamResult.academic_year}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-muted/30 p-6 rounded-2xl border">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Student Name</p>
                  <p className="text-lg font-bold">{selectedExamResult.student.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Roll Number</p>
                  <p className="text-lg font-bold">{selectedExamResult.student.roll_number || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grade / Class</p>
                  <p className="text-lg font-bold">Grade {selectedExamResult.student.grade}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Exam Date</p>
                  <p className="text-lg font-bold">{selectedExamResult.exam_date ? safeFormatDate(selectedExamResult.exam_date, "PPP") : "-"}</p>
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-bold py-4">Subject Name</TableHead>
                      <TableHead className="text-center font-bold">Full Marks</TableHead>
                      <TableHead className="text-center font-bold">Pass Marks</TableHead>
                      <TableHead className="text-center font-bold">Obtained</TableHead>
                      <TableHead className="text-center font-bold">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedExamResult.results.map((subj: any) => (
                      <TableRow key={subj.id} className="h-12">
                        <TableCell className="font-semibold">{subj.subject_name}</TableCell>
                        <TableCell className="text-center font-medium">{subj.full_marks}</TableCell>
                        <TableCell className="text-center font-medium">{subj.pass_marks}</TableCell>
                        <TableCell className="text-center font-black text-primary">
                          {subj.obtained !== undefined && subj.obtained !== null ? subj.obtained : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {subj.obtained !== undefined && subj.obtained !== null ? (
                            <Badge variant={subj.passed ? "success" : "destructive"} className="font-black uppercase text-[9px]">
                              {subj.passed ? "Pass" : "Fail"}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Pending</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-muted/20 border text-center space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grand Total</p>
                  <p className="text-xl font-black">{selectedExamResult.totalObtained}/{selectedExamResult.totalFull}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border text-center space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Percentage</p>
                  <p className="text-xl font-black">{selectedExamResult.percentage.toFixed(1)}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border text-center space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Grade</p>
                  <p className="text-xl font-black">{getGradeFormal(selectedExamResult.percentage)}</p>
                </div>
                <div className={cn(
                  "p-4 rounded-2xl border text-center space-y-1",
                  selectedExamResult.allPassed ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                )}>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Final Status</p>
                  <p className={cn("text-xl font-black", selectedExamResult.allPassed ? "text-green-600" : "text-red-600")}>
                    {selectedExamResult.allPassed ? "PASSED" : "FAILED"}
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-16 px-4 pb-8">
                <div className="text-center space-y-1">
                  <div className="w-32 border-t-2 border-foreground/30 pt-1" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Class Teacher</p>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-32 border-t-2 border-foreground/30 pt-1" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Principal</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t no-print">
            <Button variant="outline" size="sm" className="rounded-xl h-10 px-6" onClick={() => {
               const content = document.getElementById('marksheet-content-report');
               if (content) {
                 const printWindow = window.open('', '_blank');
                 printWindow?.document.write(`<html><head><title>Marksheet</title><style>
                   body { font-family: sans-serif; padding: 40px; }
                   table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                   th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                   th { background-color: #f5f5f5; }
                   .text-center { text-align: center; }
                   .font-bold { font-weight: bold; }
                   .border-b { border-bottom: 1px solid #eee; }
                   .pb-6 { padding-bottom: 24px; }
                   .mb-6 { margin-bottom: 24px; }
                   .p-6 { padding: 24px; }
                   .rounded-2xl { border-radius: 1rem; }
                   .border { border: 1px solid #eee; }
                   .bg-muted\\/30 { background-color: #f9fafb; }
                   .grid { display: grid; }
                   .grid-cols-2 { grid-template-cols: 1fr 1fr; }
                   .gap-6 { gap: 24px; }
                 </style></head><body>${content.innerHTML}</body></html>`);
                 printWindow?.document.close();
                 printWindow?.focus();
                 setTimeout(() => { printWindow?.print(); printWindow?.close(); }, 500);
               }
            }}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chapter Detail Dialog */}
      <Dialog open={!!selectedChapterDetail} onOpenChange={() => setSelectedChapterDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-6 w-6 text-blue-600" />
              Chapter Details
            </DialogTitle>
            <DialogDescription>
              Detailed performance metrics and records for this curricular unit.
            </DialogDescription>
          </DialogHeader>

          {selectedChapterDetail && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject</p>
                  <p className="font-bold">{selectedChapterDetail.lessonPlan.subject}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lesson Date</p>
                  <p className="font-semibold">{safeFormatDate(selectedChapterDetail.lessonPlan.lesson_date, "PPP")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topic</p>
                  <p className="font-medium">{selectedChapterDetail.lessonPlan.chapter}: {selectedChapterDetail.lessonPlan.topic}</p>
                </div>
              </div>

              {/* Lesson Evaluation */}
              <div className="space-y-3">
                <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-primary">
                  <Star className="h-4 w-4" /> Teacher Evaluation
                </h4>
                {selectedChapterDetail.studentChapters.length > 0 ? (
                  selectedChapterDetail.studentChapters.map((sc) => (
                    <div key={sc.id} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold">Rating</span>
                        <span>{getRatingStars(sc.evaluation_rating)}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Teacher Notes</span>
                        <p className="text-sm italic leading-relaxed">{sc.teacher_notes || "No notes recorded."}</p>
                      </div>
                      <p className="text-[10px] text-right text-muted-foreground">Recorded by {sc.recorded_by_teacher?.name || "N/A"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic text-muted-foreground">No evaluation recorded for this lesson.</p>
                )}
              </div>

              {/* Tests */}
              <div className="space-y-3">
                <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-purple-600">
                  <ClipboardCheck className="h-4 w-4" /> Academic Results
                </h4>
                {selectedChapterDetail.testResults.length > 0 ? (
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {selectedChapterDetail.testResults.map((tr) => {
                      const pct = Math.round((tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100);
                      return (
                        <div key={tr.id} className="p-4 flex justify-between items-center bg-white">
                          <div>
                            <p className="text-sm font-bold">{tr.tests?.name}</p>
                            <p className="text-[10px] text-muted-foreground">{safeFormatDate(tr.date_taken, "PPP")}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black">{tr.marks_obtained}/{tr.tests?.total_marks}</p>
                            <p className={cn("text-[10px] font-bold", pct >= 75 ? "text-green-600" : pct >= 50 ? "text-orange-600" : "text-red-600")}>{pct}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No tests associated with this chapter.</p>
                )}
              </div>

              {/* Homework */}
              <div className="space-y-3">
                <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-orange-600">
                  <Book className="h-4 w-4" /> Homework Assignments
                </h4>
                {selectedChapterDetail.homeworkRecords.length > 0 ? (
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {selectedChapterDetail.homeworkRecords.map((hr) => (
                      <div key={hr.id} className="p-4 flex justify-between items-center bg-white">
                        <div>
                          <p className="text-sm font-bold">{hr.homework?.title}</p>
                          <p className="text-[10px] text-muted-foreground">Due: {safeFormatDate(hr.homework?.due_date, "PPP")}</p>
                        </div>
                        <Badge variant={hr.status === 'completed' || hr.status === 'checked' ? 'success' : hr.status === 'in_progress' ? 'warning' : 'destructive'} className="text-[9px] uppercase font-bold">
                          {hr.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">No homework assigned for this chapter.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Attendance Remark Dialog */}
      <Dialog open={!!selectedAttendanceDetail} onOpenChange={(open) => !open && setSelectedAttendanceDetail(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Attendance Detail</DialogTitle>
            <DialogDescription className="font-medium">
              Information for {selectedAttendanceDetail ? safeFormatDate(selectedAttendanceDetail.date, 'MMMM d, yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-2">
              <div className="flex items-center gap-2 text-orange-600">
                <FileText className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Recorded Remarks</span>
              </div>
              <p className="text-sm font-bold text-orange-900 leading-relaxed italic">
                "{selectedAttendanceDetail?.remarks}"
              </p>
            </div>
          </div>
          <Button
            onClick={() => setSelectedAttendanceDetail(null)}
            className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Discipline Detail Dialog */}
      <Dialog open={!!selectedDisciplineIssue} onOpenChange={() => setSelectedDisciplineIssue(null)}>
        <DialogContent className="max-w-md" aria-describedby="discipline-detail-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Discipline Issue Details
            </DialogTitle>
            <DialogDescription id="discipline-detail-description">
              In-depth view of the behavioral incident and its current resolution status.
            </DialogDescription>
          </DialogHeader>
          {selectedDisciplineIssue && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</p>
                  <p className="text-lg font-bold">{selectedDisciplineIssue.discipline_categories?.name}</p>
                </div>
                <Badge className={cn("text-[10px] font-black uppercase",
                  selectedDisciplineIssue.severity === "high" ? "bg-red-500" :
                  selectedDisciplineIssue.severity === "medium" ? "bg-orange-500" : "bg-green-500")}>
                  {selectedDisciplineIssue.severity} Severity
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</p>
                <p className="text-sm bg-muted/30 p-3 rounded-lg border italic leading-relaxed">
                  {selectedDisciplineIssue.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date Reported</p>
                  <p className="text-sm font-semibold">{safeFormatDate(selectedDisciplineIssue.issue_date, "PPP")}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</p>
                  <Badge variant="outline" className="mt-1 font-bold uppercase text-[10px]">
                    {selectedDisciplineIssue.status || "Reported"}
                  </Badge>
                </div>
              </div>

              {selectedDisciplineIssue.action_taken && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Action Taken</p>
                  <p className="text-sm font-medium">{selectedDisciplineIssue.action_taken}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}