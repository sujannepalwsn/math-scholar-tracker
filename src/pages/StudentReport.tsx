import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Printer, DollarSign, BookOpen, Book, Paintbrush, AlertTriangle, FileText, CheckCircle, XCircle, Clock, Star, User } from "lucide-react";
import { format, startOfMonth, endOfMonth, subYears, isPast } from "date-fns"; // Added subYears, isPast
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Invoice, Payment } from "@/integrations/supabase/finance-types";
import { safeFormatDate } from '@/lib/utils'; // Import safeFormatDate

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

export default function StudentReport() {
  const { user } = useAuth();

  const [selectedStudentId, setSelectedStudentId] = useState<string>("none"); // Changed initial state to "none"
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subYears(new Date(), 1), // Default to last year
    to: endOfMonth(new Date()),
  });
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [aiSummary, setAiSummary] = useState<string>("");

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["students", user?.center_id],
    queryFn: async () => {
      let query = supabase.from("students").select("*").order("name");
      if (user?.role !== "admin" && user?.center_id) query = query.eq("center_id", user.center_id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredStudents = students.filter(s => gradeFilter === "all" || s.grade === gradeFilter);

  // Fetch attendance
  const { data: attendanceData = [] } = useQuery({
    queryKey: ["student-attendance", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return []; // Added check for "none"
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", selectedStudentId)
        .gte("date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("date", safeFormatDate(dateRange.to, "yyyy-MM-dd"))
        .order("date");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none", // Enabled only if a real student is selected
  });

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
    enabled: !!user?.center_id,
  });

  // Fetch student_chapters (lesson evaluations)
  const { data: studentChapters = [] } = useQuery({
    queryKey: ["student-lesson-records-report", selectedStudentId, subjectFilter, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return []; // Added check for "none"
      let query = supabase.from("student_chapters").select(`
        *,
        lesson_plans(id, subject, chapter, topic, lesson_date, lesson_file_url),
        recorded_by_teacher:recorded_by_teacher_id(name)
      `).eq("student_id", selectedStudentId)
        .gte("completed_at", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("completed_at", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (subjectFilter !== "all") query = query.eq("lesson_plans.subject", subjectFilter);
      const { data, error } = await query.order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none", // Enabled only if a real student is selected
  });

  // Fetch test results
  const { data: testResults = [] } = useQuery({
    queryKey: ["student-test-results", selectedStudentId, subjectFilter, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return []; // Added check for "none"
      let query = supabase.from("test_results").select("*, tests(id, name, subject, total_marks, lesson_plan_id, questions)").eq("student_id", selectedStudentId)
        .gte("date_taken", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("date_taken", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (subjectFilter !== "all") query = query.eq("tests.subject", subjectFilter);
      const { data, error } = await query.order("date_taken", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none", // Enabled only if a real student is selected
  });

  // Fetch homework status
  const { data: homeworkStatus = [] } = useQuery({
    queryKey: ["student-homework-status-report", selectedStudentId, subjectFilter, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return []; // Added check for "none"
      let query = supabase.from("student_homework_records").select("*, homework(id, title, subject, due_date, lesson_plan_id)")
        .eq("student_id", selectedStudentId)
        .gte("homework.due_date", safeFormatDate(dateRange.from, "yyyy-MM-dd")) // Filter by homework due_date
        .lte("homework.due_date", safeFormatDate(dateRange.to, "yyyy-MM-dd")); // Filter by homework due_date
      if (subjectFilter !== "all") query = query.eq("homework.subject", subjectFilter);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none", // Enabled only if a real student is selected
  });

  // Fetch preschool activities
  const { data: preschoolActivities = [] } = useQuery({
    queryKey: ["student-preschool-activities-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return []; // Added check for "none"
      const { data, error } = await supabase.from("student_activities").select("*, activities(title, description, activity_date, photo_url, video_url, activity_type_id, activity_types(name))").eq("student_id", selectedStudentId)
        .gte("created_at", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none", // Enabled only if a real student is selected
  });

  // Fetch discipline issues
  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ["student-discipline-issues-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return []; // Added check for "none"
      const { data, error } = await supabase.from("discipline_issues").select("*, discipline_categories(name)").eq("student_id", selectedStudentId)
        .gte("issue_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("issue_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none", // Enabled only if a real student is selected
  });

  // Fetch finance data
  const { data: invoices = [] } = useQuery({
    queryKey: ["student-invoices-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return []; // Added check for "none"
      const { data, error } = await supabase.from("invoices").select("*").eq("student_id", selectedStudentId)
        .gte("invoice_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("invoice_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none", // Enabled only if a real student is selected
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["student-payments-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return []; // Added check for "none"
      // Get invoices for this student first
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
    enabled: !!selectedStudentId && selectedStudentId !== "none", // Enabled only if a real student is selected
  });

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
  const totalDays = attendanceData.length;
  const presentDays = attendanceData.filter((a) => a.status === "present").length;
  const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const totalTests = testResults.length;
  const totalMarksObtained = testResults.reduce(
    (sum, r) => sum + r.marks_obtained,
    0
  );
  const totalMaxMarks = testResults.reduce(
    (sum, r) => sum + (r.tests?.total_marks || 0),
    0
  );
  const averagePercentage =
    totalMaxMarks > 0
      ? Math.round((totalMarksObtained / totalMaxMarks) * 100)
      : 0;

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
        body: { studentId: selectedStudentId },
      });
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
    },
  });

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
            homeworkRecords: [],
          });
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
              homeworkRecords: [],
            });
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
            <title>Student Report - ${selectedStudent?.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1, h2, h3 { margin: 0 0 10px 0; }
              table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .text-green-600 { color: #22c55e; }
              .text-red-600 { color: #ef4444; }
              .text-orange-600 { color: #f97316; }
              .text-blue-600 { color: #3b82f6; }
              .text-yellow-500 { color: #eab308; }
              .font-semibold { font-weight: 600; }
              .text-muted-foreground { color: #6b7280; }
              .flex { display: flex; }
              .items-center { align-items: center; }
              .gap-1 { gap: 0.25rem; }
              .list-disc { list-style-type: disc; }
              .list-inside { list-style-position: inside; }
              .ml-4 { margin-left: 1rem; }
            </style>
          </head>
          <body>
            ${content.innerHTML}
          </body>
        </html>
      `);
      newWindow?.document.close();
      newWindow?.focus();
      newWindow?.print();
      newWindow?.close();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
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

  return (
    <div className="space-y-6">
      {/* Header and Print/Export */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Student Report</h1>
        {selectedStudentId !== "none" && ( // Only show if a student is selected
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {Array.from(new Set(students.map(s => s.grade))).map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={safeFormatDate(dateRange.from, "yyyy-MM-dd")}
          onChange={(e) => setDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
        />
        <Input
          type="date"
          value={safeFormatDate(dateRange.to, "yyyy-MM-dd")}
          onChange={(e) => setDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
        />

        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Student" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select Student</SelectItem> {/* Added placeholder item */}
            {filteredStudents.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.name} - Grade {student.grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStudentId !== "none" && selectedStudent && ( // Only render report if a student is selected
        <div id="printable-report" className="space-y-6">
          {/* Finance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" /> Finance Summary
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
          <Card>
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
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
                      <tr key={record.id}>
                        <td className="border px-2 py-1">{safeFormatDate(record.date, "PPP")}</td>
                        <td className="border px-2 py-1">{record.status}</td>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" /> Chapter-wise Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chapterPerformanceData.length === 0 ? (
                <p className="text-muted-foreground">No chapter performance data available for the selected filters.</p>
              ) : (
                <div className="space-y-6">
                  {chapterPerformanceData.map((chapterGroup) => (
                    <div key={chapterGroup.lessonPlan.id} className="border rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        {chapterGroup.lessonPlan.subject}: {chapterGroup.lessonPlan.chapter} - {chapterGroup.lessonPlan.topic}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Taught on: {safeFormatDate(chapterGroup.lessonPlan.lesson_date, "PPP")}
                      </p>

                      {/* Lesson Evaluation */}
                      {chapterGroup.studentChapters.length > 0 && (
                        <div className="ml-4 space-y-2">
                          <p className="font-semibold flex items-center gap-1"><Star className="h-4 w-4" /> Lesson Evaluation:</p>
                          {chapterGroup.studentChapters.map(sc => (
                            <div key={sc.id} className="text-sm">
                              <p>Rating: {getRatingStars(sc.evaluation_rating)}</p>
                              <p>Teacher Notes: {sc.teacher_notes || '-'}</p>
                              <p className="text-xs text-muted-foreground">Recorded by: {sc.recorded_by_teacher?.name || 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Associated Test Results */}
                      {chapterGroup.testResults.length > 0 && (
                        <div className="ml-4 space-y-2">
                          <p className="font-semibold flex items-center gap-1"><FileText className="h-4 w-4" /> Associated Test Results:</p>
                          {chapterGroup.testResults.map(tr => (
                            <div key={tr.id} className="text-sm">
                              <p>{tr.tests?.name}: {tr.marks_obtained}/{tr.tests?.total_marks} ({Math.round((tr.marks_obtained / (tr.tests?.total_marks || 1)) * 100)}%)</p>
                              <p className="text-xs text-muted-foreground">Date: {safeFormatDate(tr.date_taken, "PPP")}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Associated Homework Records */}
                      {chapterGroup.homeworkRecords.length > 0 && (
                        <div className="ml-4 space-y-2">
                          <p className="font-semibold flex items-center gap-1"><Book className="h-4 w-4" /> Associated Homework:</p>
                          {chapterGroup.homeworkRecords.map(hr => (
                            <div key={hr.id} className="text-sm">
                              <p className="flex items-center gap-1">
                                {getHomeworkStatusIcon(hr.status)} {hr.homework?.title} (Due: {safeFormatDate(hr.homework?.due_date, "PPP")})
                              </p>
                              <p className="text-xs text-muted-foreground">Status: {hr.status}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {chapterGroup.studentChapters.length === 0 && chapterGroup.testResults.length === 0 && chapterGroup.homeworkRecords.length === 0 && (
                        <p className="ml-4 text-sm text-muted-foreground italic">No specific records for this chapter.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* NEW: Missed Chapters */}
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Summary */}
          <Card>
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
  );
}