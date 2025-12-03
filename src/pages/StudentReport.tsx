import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Printer, DollarSign, BookOpen, Book, Paintbrush, AlertTriangle, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Invoice, Payment } from "@/integrations/supabase/finance-types";
import { safeFormatDate } from '@/lib/utils'; // Import safeFormatDate

type LessonPlan = Tables<'lesson_plans'>;
type StudentHomeworkRecord = Tables<'student_homework_records'>;
type StudentActivity = Tables<'student_activities'>;
type DisciplineIssue = Tables<'discipline_issues'>;

export default function StudentReport() {
  const { user } = useAuth();

  const [selectedStudentId, setSelectedStudentId] = useState<string>("none"); // Changed initial state to "none"
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
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

  // Fetch lesson records (student_chapters now links to lesson_plans)
  const { data: lessonRecords = [] } = useQuery({
    queryKey: ["student-lesson-records-report", selectedStudentId, subjectFilter, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return [];
      let query = supabase.from("student_chapters").select("*, lesson_plans(id, subject, chapter, topic, lesson_date, lesson_file_url)").eq("student_id", selectedStudentId)
        .gte("completed_at", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("completed_at", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (subjectFilter !== "all") query = query.eq("lesson_plans.subject", subjectFilter);
      const { data, error } = await query.order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none",
  });

  // Fetch test results
  const { data: testResults = [] } = useQuery({
    queryKey: ["student-test-results", selectedStudentId, subjectFilter, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return [];
      let query = supabase.from("test_results").select("*, tests(*)").eq("student_id", selectedStudentId)
        .gte("date_taken", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("date_taken", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (subjectFilter !== "all") query = query.eq("tests.subject", subjectFilter);
      const { data, error } = await query.order("date_taken", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none",
  });

  // Fetch homework status
  const { data: homeworkStatus = [] } = useQuery({
    queryKey: ["student-homework-status-report", selectedStudentId, subjectFilter, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return [];
      let query = supabase.from("student_homework_records").select("*, homework(*)")
        .eq("student_id", selectedStudentId)
        .gte("homework.due_date", safeFormatDate(dateRange.from, "yyyy-MM-dd")) // Filter by homework due_date
        .lte("homework.due_date", safeFormatDate(dateRange.to, "yyyy-MM-dd")); // Filter by homework due_date
      if (subjectFilter !== "all") query = query.eq("homework.subject", subjectFilter);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none",
  });

  // Fetch preschool activities
  const { data: preschoolActivities = [] } = useQuery({
    queryKey: ["student-preschool-activities-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return [];
      const { data, error } = await supabase.from("student_activities").select("*, activities(title, description, activity_date, photo_url, video_url, activity_type_id, activity_types(name))").eq("student_id", selectedStudentId)
        .gte("created_at", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none",
  });

  // Fetch discipline issues
  const { data: disciplineIssues = [] } = useQuery({
    queryKey: ["student-discipline-issues-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return [];
      const { data, error } = await supabase.from("discipline_issues").select("*, discipline_categories(name)").eq("student_id", selectedStudentId)
        .gte("issue_date", safeFormatDate(dateRange.from, "yyyy-MM-dd"))
        .lte("issue_date", safeFormatDate(dateRange.to, "yyyy-MM-dd"));
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId && selectedStudentId !== "none",
  });

  // Fetch finance data
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
    enabled: !!selectedStudentId && selectedStudentId !== "none",
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["student-payments-report", selectedStudentId, dateRange],
    queryFn: async () => {
      if (!selectedStudentId || selectedStudentId === "none") return [];
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
    enabled: !!selectedStudentId && selectedStudentId !== "none",
  });

  // Statistics
  const totalDays = attendanceData.length;
  const presentDays = attendanceData.filter((a) => a.status === "Present").length;
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

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const outstandingDues = totalInvoiced - totalPaid;

  const subjects = Array.from(new Set([
    ...lessonRecords.map((lr: any) => lr.lesson_plans?.subject).filter(Boolean),
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

  // Export CSV
  const exportToCSV = () => {
    if (!selectedStudent) return;

    const csvContent = [
      ["Student Report"],
      ["Name", selectedStudent.name],
      ["Grade", selectedStudent.grade],
      [""],
      ["Attendance Summary"],
      ["Total Days", totalDays],
      ["Present", presentDays],
      ["Absent", totalDays - presentDays],
      ["Percentage", attendancePercentage + "%"],
      [""],
      ["Finance Summary"],
      ["Total Invoiced", totalInvoiced],
      ["Total Paid", totalPaid],
      ["Outstanding Dues", outstandingDues],
      [""],
      ["Test Results"],
      ["Test Name", "Subject", "Marks Obtained", "Total Marks", "Date", "Question-wise Marks"],
      ...testResults.map(r => [
        r.tests?.name,
        r.tests?.subject,
        r.marks_obtained,
        r.tests?.total_marks,
        safeFormatDate(r.date_taken, "PPP"),
        r.question_marks ? JSON.stringify(r.question_marks) : '',
      ]),
      [""],
      ["Lesson Records"],
      ["Subject", "Chapter", "Topic", "Date Taught", "Session Notes", "File Link"],
      ...lessonRecords.map((lr: any) => [
        lr.lesson_plans?.subject,
        lr.lesson_plans?.chapter,
        lr.lesson_plans?.topic,
        safeFormatDate(lr.completed_at, "PPP"),
        lr.notes || '', // Include session notes
        lr.lesson_plans?.lesson_file_url ? supabase.storage.from("lesson-plan-files").getPublicUrl(lr.lesson_plans.lesson_file_url).data.publicUrl : '',
      ]),
      [""],
      ["Homework Status"],
      ["Title", "Subject", "Due Date", "Status", "Teacher Remarks"],
      ...homeworkStatus.map((hs: any) => [
        hs.homework?.title,
        hs.homework?.subject,
        safeFormatDate(hs.homework?.due_date, "PPP"),
        hs.status,
        hs.teacher_remarks,
      ]),
      [""],
      ["Preschool Activities"],
      ["Type", "Title", "Description", "Date", "Involvement", "Photo Link", "Video Link"],
      ...preschoolActivities.map((pa: any) => [
        pa.activities?.activity_types?.name || 'N/A',
        pa.activities?.title || 'N/A',
        pa.activities?.description || 'N/A',
        pa.activities?.activity_date ? safeFormatDate(pa.activities.activity_date, "PPP") : 'N/A',
        pa.involvement_score || 'N/A',
        pa.activities?.photo_url ? supabase.storage.from("activity-photos").getPublicUrl(pa.activities.photo_url).data.publicUrl : '',
        pa.activities?.video_url ? supabase.storage.from("activity-videos").getPublicUrl(pa.activities.video_url).data.publicUrl : '',
      ]),
      [""],
      ["Discipline Issues"],
      ["Category", "Description", "Severity", "Date"],
      ...disciplineIssues.map((di: any) => [
        di.discipline_categories?.name || 'N/A',
        di.description,
        di.severity,
        safeFormatDate(di.issue_date, "PPP"),
      ]),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
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

  const getSeverityColor = (severity: DisciplineIssue['severity']) => {
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
                          <td className="border px-2 py-1">{formatCurrency(p.amount_paid)}</td>
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

          {/* Lesson Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" /> Lesson Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lessonRecords.length === 0 ? (
                <p className="text-muted-foreground">No lesson records found.</p>
              ) : (
                <div className="overflow-x-auto max-h-80 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">Subject</th>
                        <th className="border px-2 py-1">Chapter</th>
                        <th className="border px-2 py-1">Topic</th>
                        <th className="border px-2 py-1">Date Taught</th>
                        <th className="border px-2 py-1">Session Notes</th>
                        <th className="border px-2 py-1">Files</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lessonRecords.map((lr: any) => (
                        <tr key={lr.id}>
                          <td className="border px-2 py-1">{lr.lesson_plans?.subject}</td>
                          <td className="border px-2 py-1">{lr.lesson_plans?.chapter}</td>
                          <td className="border px-2 py-1">{lr.lesson_plans?.topic}</td>
                          <td className="border px-2 py-1">{safeFormatDate(lr.date_completed, "PPP")}</td>
                          <td className="border px-2 py-1">{lr.notes || "-"}</td>
                          <td className="border px-2 py-1">
                            {lr.lesson_plans?.lesson_file_url && (
                              <a href={supabase.storage.from("lesson-plan-files").getPublicUrl(lr.lesson_plans.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mr-2">File</a>
                            )}
                            {!lr.lesson_plans?.lesson_file_url && "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>Total Tests: {totalTests}</div>
                <div>Average %: {averagePercentage}%</div>
                <div>Total Marks: {totalMarksObtained}/{totalMaxMarks}</div>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">Test Name</th>
                      <th className="border px-2 py-1">Subject</th>
                      <th className="border px-2 py-1">Marks Obtained</th>
                      <th className="border px-2 py-1">Total Marks</th>
                      <th className="border px-2 py-1">Percentage</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Question Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((t) => (
                      <tr key={t.id}>
                        <td className="border px-2 py-1">{t.tests?.name}</td>
                        <td className="border px-2 py-1">{t.tests?.subject}</td>
                        <td className="border px-2 py-1">{t.marks_obtained}</td>
                        <td className="border px-2 py-1">{t.tests?.total_marks}</td>
                        <td className="border px-2 py-1">{Math.round((t.marks_obtained / (t.tests?.total_marks || 1)) * 100)}%</td>
                        <td className="border px-2 py-1">{safeFormatDate(t.date_taken, "PPP")}</td>
                        <td className="border px-2 py-1 text-xs">
                          {t.question_marks && (t.question_marks as any[]).map((qm: any, idx: number) => (
                            <div key={idx}>Q{idx + 1}: {qm.marksObtained}/{t.tests?.questions?.[idx]?.maxMarks || '?'}</div>
                          ))}
                          {!t.question_marks && "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Homework Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" /> Homework Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {homeworkStatus.length === 0 ? (
                <p className="text-muted-foreground">No homework assignments found.</p>
              ) : (
                <div className="overflow-x-auto max-h-80 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border px-2 py-1">Title</th>
                        <th className="border px-2 py-1">Subject</th>
                        <th className="border px-2 py-1">Due Date</th>
                        <th className="border px-2 py-1">Status</th>
                        <th className="border px-2 py-1">Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {homeworkStatus.map((hs: any) => (
                        <tr key={hs.id}>
                          <td className="border px-2 py-1">{hs.homework?.title}</td>
                          <td className="border px-2 py-1">{hs.homework?.subject}</td>
                          <td className="border px-2 py-1">{safeFormatDate(hs.homework?.due_date, "PPP")}</td>
                          <td className="border px-2 py-1 flex items-center gap-1">
                            {getHomeworkStatusIcon(hs.status)} {hs.status.replace('_', ' ').toUpperCase()}
                          </td>
                          <td className="border px-2 py-1">{hs.teacher_remarks || "-"}</td>
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
