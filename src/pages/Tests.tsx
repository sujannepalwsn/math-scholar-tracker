import React, { useEffect, useState } from "react";
import { BookOpen, Bot, CalendarIcon, ClipboardCheck, Edit, Eye, FileText, FileUp, Plus, SquarePen, Trash2, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { format } from "date-fns"
import OCRModal from "@/components/OCRModal";
import BulkMarksEntry from "@/components/BulkMarksEntry";
import QuestionPaperViewer from "@/components/QuestionPaperViewer";
import { Tables } from "@/integrations/supabase/types"
import { cn } from "@/lib/utils"
"use client";



type Test = Tables<'tests'>;
type TestResult = Tables<'test_results'>;
type Student = Tables<'students'>;
type LessonPlan = Tables<'lesson_plans'>; // Import LessonPlan type

interface Question {
  id: string;
  questionText: string;
  maxMarks: number;
  correctAnswer?: string;
}

interface QuestionMark {
  questionId: string;
  marksObtained: number;
  studentAnswer?: string;
  feedback?: string;
  aiSuggestedMarks?: number;
}

export default function Tests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [extractedTestContent, setExtractedTestContent] = useState("");
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [viewingTestDetails, setViewingTestDetails] = useState<any>(null);

  // Form states for new test
  const [testName, setTestName] = useState("");
  const [testSubject, setTestSubject] = useState("");
  const [testDate, setTestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [totalMarks, setTotalMarks] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedLessonPlanIds, setSelectedLessonPlanIds] = useState<string[]>([]); // Multi-select lesson plans
  const [chapterSubjectFilter, setChapterSubjectFilter] = useState<string>("all"); // Filter for chapter selection
  const [questions, setQuestions] = useState<Question[]>([]); // For question-wise entry

  // States for entering marks
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [marksObtained, setMarksObtained] = useState(""); // Overall marks
  const [questionMarks, setQuestionMarks] = useState<QuestionMark[]>([]); // Question-wise marks
  const [studentAnswer, setStudentAnswer] = useState(""); // For AI grading
  const [resultDate, setResultDate] = useState(format(new Date(), "yyyy-MM-dd"));
  // Removed resultNotes state

  // Fetch tests
  const { data: tests = [] } = useQuery({
    queryKey: ["tests", user?.center_id, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("tests")
        .select("*, lesson_plans(id, subject, chapter, topic, grade)") // Fetch lesson_plans details
        .order("date", { ascending: false });
      
      if (user?.role === 'teacher') {
        query = query.eq('created_by', user.id);
      } else if (user?.role !== 'admin' && user?.center_id) {
        query = query.eq('center_id', user.center_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } });

  // Fetch lesson plans for the dropdown
  const { data: lessonPlans = [] } = useQuery({
    queryKey: ["lesson-plans-for-tests", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("id, subject, chapter, topic, grade")
        .eq("center_id", user.center_id)
        .order("lesson_date", { ascending: false });
      if (error) throw error;
      return data as LessonPlan[];
    },
    enabled: !!user?.center_id });

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["students", user?.center_id],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("*")
        .order("name");
      
      if (user?.role !== 'admin' && user?.center_id) {
        query = query.eq('center_id', user.center_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    } });

  // Fetch test results for selected test
  const { data: testResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ["test-results", selectedTest],
    queryFn: async () => {
      if (!selectedTest) return [];
      const { data, error } = await supabase
        .from("test_results")
        .select("*, students(name, grade)")
        .eq("test_id", selectedTest)
        .order("marks_obtained", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTest });

  // Effect to update questionMarks when selectedTest changes
  useEffect(() => {
    if (!selectedTest) {
      setQuestions([]);
      setQuestionMarks([]);
      return;
    }

    const test = tests.find(t => t.id === selectedTest);
    if (test && test.questions) {
      const parsedQuestions = test.questions as unknown as Question[];
      setQuestions(parsedQuestions);
      setQuestionMarks(parsedQuestions.map(q => ({
        questionId: q.id,
        marksObtained: 0,
        studentAnswer: '',
        feedback: '' })));
    } else {
      setQuestions([]);
      setQuestionMarks([]);
    }
  }, [selectedTest]);

  // Create test mutation
  const createTestMutation = useMutation({
    mutationFn: async () => {
      let uploadedFileUrl = null;

      if (uploadedFile) {
        const fileExt = uploadedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("test-files")
          .upload(fileName, uploadedFile);

        if (uploadError) throw uploadError;
        uploadedFileUrl = fileName;
      }
      
      console.log("DEBUG: Attempting to create test with lessonPlanIds:", selectedLessonPlanIds);

      // Use the first selected lesson plan ID for the test (primary link)
      const primaryLessonPlanId = selectedLessonPlanIds.length > 0 ? selectedLessonPlanIds[0] : null;

      const { data, error } = await supabase.from("tests").insert({
        name: testName || 'Unnamed Test',
        subject: testSubject,
        class: grade || 'General',
        date: testDate,
        total_marks: parseInt(totalMarks),
        center_id: user?.center_id!,
        questions: questions.length > 0 ? (questions as any) : null,
        lesson_plan_id: primaryLessonPlanId, // Save the primary lesson plan ID
        created_by: user?.id,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      toast.success("Test created successfully");
      setIsAddingTest(false);
      setTestName("");
      setTestSubject("");
      setTotalMarks("");
      setGrade("");
      setSelectedLessonPlanIds([]); // Reset lesson plan IDs
      setChapterSubjectFilter("all");
      setQuestions([]);
      setUploadedFile(null);
    },
    onError: (error: any) => {
      console.error("Error creating test:", error);
      toast.error("Failed to create test");
    } });

  // Add test result mutation
  const addResultMutation = useMutation({
    mutationFn: async () => {
      const totalMarksObtainedFromQuestions = questionMarks.reduce((sum, qm) => sum + qm.marksObtained, 0);

      const resultData = {
        test_id: selectedTest,
        student_id: selectedStudentId,
        marks_obtained: questions.length > 0 ? totalMarksObtainedFromQuestions : parseInt(marksObtained), // Use sum of question marks or overall marks
        date_taken: resultDate,
        // Removed notes field
        question_marks: questions.length > 0 ? (questionMarks as any) : null, // Save question-wise marks as Json
      };

      console.log("Attempting to save test result with data:", resultData);

      const { data, error } = await supabase.from("test_results").insert(resultData);
      if (error) {
        console.error("Supabase error saving test result:", error);
        throw error;
      }
      console.log("Test result saved successfully:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-results"] });
      toast.success("Marks recorded successfully");
      setSelectedStudentId("");
      setMarksObtained("");
      setQuestionMarks([]);
      setStudentAnswer("");
      // Removed resultNotes reset
    },
    onError: (error: any) => {
      console.error("Error in addResultMutation:", error);
      if (error.code === "23505") {
        toast.error("Marks already recorded for this student for this test.");
      } else {
        toast.error(error.message || "Failed to record marks");
      }
    } });

  // Bulk marks entry mutation
  const bulkMarksMutation = useMutation({
    mutationFn: async (marks: Array<{ studentId: string; marks: number }>) => {
      console.log("Attempting bulk marks save for test:", selectedTest, "with marks:", marks);

      // Delete existing records for these students in this test to prevent unique constraint errors
      const studentIdsInBatch = marks.map((m) => m.studentId);
      const { error: deleteError } = await supabase
        .from("test_results")
        .delete()
        .eq("test_id", selectedTest)
        .in("student_id", studentIdsInBatch);

      if (deleteError) {
        console.error("Supabase error deleting existing bulk marks:", deleteError);
        throw deleteError;
      }
      console.log("Existing bulk marks deleted for selected students.");

      const records = marks.map((m) => ({
        test_id: selectedTest,
        student_id: m.studentId,
        marks_obtained: m.marks,
        date_taken: format(new Date(), "yyyy-MM-dd"),
        question_marks: null, // Bulk entry doesn't support question-wise for now
      }));

      console.log("Inserting new bulk marks records:", records);
      const { error } = await supabase.from("test_results").insert(records);
      if (error) {
        console.error("Supabase error inserting bulk marks:", error);
        throw error;
      }
      console.log("Bulk marks saved successfully.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-results"] });
      toast.success("Bulk marks saved successfully");
    },
    onError: (error: any) => {
      console.error("Error in bulkMarksMutation:", error);
      toast.error(error.message || "Failed to save bulk marks");
    } });

  // Delete test result
  const deleteResultMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const { error } = await supabase
        .from("test_results")
        .delete()
        .eq("id", resultId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-results"] });
      toast.success("Result deleted");
    },
    onError: (error: any) => {
      console.error("Error deleting test result:", error);
      toast.error(error.message || "Failed to delete result");
    } });

  // Delete test mutation
  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const test = tests.find(t => t.id === testId);
      if (!test) throw new Error("Test not found");
      
      if (user?.role !== 'admin' && test.center_id !== user?.center_id) {
        throw new Error("You don't have permission to delete this test");
      }

      // Note: uploaded_file_url not in schema, skipping file deletion

      await supabase
        .from("test_results")
        .delete()
        .eq("test_id", testId);

      const { error } = await supabase
        .from("tests")
        .delete()
        .eq("id", testId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      setSelectedTest("");
      toast.success("Test deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete test");
    } });

  // AI Grade Answer Mutation
  const aiGradeAnswerMutation = useMutation({
    mutationFn: async ({ questionText, correctAnswer, studentAnswer, maxMarks }: { questionText: string, correctAnswer: string, studentAnswer: string, maxMarks: number }) => {
      const { data, error } = await supabase.functions.invoke("ai-grade-answer", {
        body: {
          questionText,
          correctAnswer,
          studentAnswer,
          totalMarks: maxMarks } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success("AI graded successfully!");
      setQuestionMarks(prev => prev.map(qm => 
        qm.questionId === variables.questionText // Using questionText as ID for simplicity here, ideally use unique ID
          ? { ...qm, aiSuggestedMarks: data.suggestedMarks, feedback: data.feedback, marksObtained: data.suggestedMarks }
          : qm
      ));
    },
    onError: (error: any) => {
      console.error("AI grading error:", error);
      toast.error(error.message || "Failed to get AI grade");
    } });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const addQuestion = () => {
    console.log("Attempting to add new question. Current questions length:", questions.length);
    setQuestions(prev => {
      const newQuestions = [...prev, { id: crypto.randomUUID(), questionText: '', maxMarks: 0, correctAnswer: '' }];
      console.log("Questions after adding:", newQuestions.length, newQuestions);
      return newQuestions;
    });
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateQuestionMark = (questionId: string, field: keyof QuestionMark, value: any) => {
    setQuestionMarks(prev => prev.map(qm => qm.questionId === questionId ? { ...qm, [field]: value } : qm));
  };

  const selectedTestData = tests.find((t) => t.id === selectedTest);

  const testsWithFiles: typeof tests = []; // No uploaded_file_url in schema

  const filteredStudents = selectedTestData?.class
    ? students.filter((s: Student) => s.grade === selectedTestData.class)
    : students;

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {testsWithFiles.length > 0 && (
        <Card className="border-none shadow-medium overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Available Question Papers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted/10">
                  <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Test Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testsWithFiles.map((test) => (
                  <TableRow key={test.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-foreground/90">{test.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">{test.subject}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[10px] bg-primary/10 text-primary border-none font-bold">
                        {test.date ? format(new Date(test.date), "MMM d, yyyy") : 'No date'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
            Assessment Center
          </h1>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <p className="text-muted-foreground text-sm font-medium">Create tests, manage papers, and track results.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setShowOCRModal(true)} className="rounded-xl">
            <FileUp className="mr-2 h-4 w-4" />
            OCR Upload
          </Button>
          <Dialog open={isAddingTest} onOpenChange={setIsAddingTest}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Test
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-labelledby="create-test-title" aria-describedby="create-test-description">
            <DialogHeader>
              <DialogTitle id="create-test-title">Create New Test</DialogTitle>
              <DialogDescription id="create-test-description">
                Define a new test, its details, and optional questions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Test Name</Label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g., Mid-term Math Exam"
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Total Marks (Overall)</Label>
                  <Input
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>
              <div>
                <Label>Grade (Optional)</Label>
                <Input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., 10th"
                />
              </div>
              {/* Multi-select Lesson Plans/Chapters */}
              <div className="space-y-3 border p-4 rounded-lg">
                <Label className="text-base font-semibold">Link to Chapters (Optional - Multi-select)</Label>
                
                {/* Subject filter for chapters */}
                <div className="flex gap-2 items-center">
                  <Label className="text-sm">Filter by Subject:</Label>
                  <Select value={chapterSubjectFilter} onValueChange={setChapterSubjectFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {Array.from(new Set(lessonPlans.map(lp => lp.subject))).map((subject) => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Chapter checkboxes */}
                <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
                  {lessonPlans
                    .filter(lp => chapterSubjectFilter === "all" || lp.subject === chapterSubjectFilter)
                    .map((lp) => {
                      const isSelected = selectedLessonPlanIds.includes(lp.id);
                      return (
                        <div key={lp.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`lp-${lp.id}`}
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedLessonPlanIds(prev => prev.filter(id => id !== lp.id));
                              } else {
                                setSelectedLessonPlanIds(prev => [...prev, lp.id]);
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor={`lp-${lp.id}`} className="text-sm cursor-pointer">
                            <span className="font-medium">{lp.subject}:</span> {lp.chapter} - {lp.topic} 
                            {lp.grade && <span className="text-muted-foreground"> ({lp.grade})</span>}
                          </label>
                        </div>
                      );
                    })}
                  {lessonPlans.filter(lp => chapterSubjectFilter === "all" || lp.subject === chapterSubjectFilter).length === 0 && (
                    <p className="text-sm text-muted-foreground">No lesson plans found.</p>
                  )}
                </div>
                {selectedLessonPlanIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">{selectedLessonPlanIds.length} chapter(s) selected</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Upload Test File (Optional)</Label>
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                />
                {uploadedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {uploadedFile.name}
                  </p>
                )}
              </div>

              {/* Question-wise Entry Section */}
              <div className="space-y-3 border p-4 rounded-lg">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <SquarePen className="h-5 w-5" /> Define Questions (Optional)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Add individual questions for detailed mark entry. Total marks for questions will override overall total marks.
                </p>
                {/* DEBUG: Display current number of questions */}
                <p className="text-sm text-muted-foreground">Current questions: {questions.length}</p>
                {questions.map((q, index) => (
                  <div key={q.id} className="flex flex-col gap-2 border p-3 rounded-xl bg-muted/20">
                    <div className="flex justify-between items-center">
                      <Label>Question {index + 1}</Label>
                      <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={q.questionText}
                      onChange={(e) => updateQuestion(q.id, 'questionText', e.target.value)}
                      placeholder="Question text"
                      rows={2}
                    />
                    <Input
                      type="number"
                      value={q.maxMarks}
                      onChange={(e) => updateQuestion(q.id, 'maxMarks', parseInt(e.target.value) || 0)}
                      placeholder="Max Marks"
                    />
                    <Textarea
                      value={q.correctAnswer}
                      onChange={(e) => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                      placeholder="Correct Answer (for AI grading)"
                      rows={2}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
                  Add Question
                </Button>
              </div>

              <Button
                onClick={() => createTestMutation.mutate()}
                disabled={!testName || !testSubject || (!totalMarks && questions.length === 0) || createTestMutation.isPending}
                className="w-full"
              >
                Create Test
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20 h-fit">
          <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              Evaluation Catalog
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted/10">
                  <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assessment Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Score</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow
                    key={test.id}
                    className={cn(
                      "group border-muted/5 transition-colors cursor-pointer",
                      selectedTest === test.id ? "bg-primary/10" : "hover:bg-primary/5"
                    )}
                    onClick={() => setSelectedTest(test.id)}
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground/90 leading-none">{test.name}</p>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {test.subject}</span>
                          <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {format(new Date(test.date), "MMM d")}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-primary/10 text-primary border-none font-black text-[10px]">
                        {test.total_marks} PTS
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingTestDetails(test);
                            setIsViewDetailsOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${test.name}"? This will also delete all associated student results.`)) {
                              deleteTestMutation.mutate(test.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tests.length === 0 && (
              <p className="text-muted-foreground text-center py-12 font-medium">
                No assessments in catalog
              </p>
            )}
          </CardContent>
        </Card>

        {selectedTest && selectedTestData && (
          <Card className="border-none shadow-strong overflow-hidden rounded-3xl animate-in slide-in-from-right-4 duration-500">
            <CardHeader className="bg-gradient-to-r from-primary to-violet-600 text-primary-foreground pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-black">Performance Entry</CardTitle>
                  <CardDescription className="text-primary-foreground/80 font-medium">Recording results for {selectedTestData.name}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkEntry(true)}
                  disabled={questions.length > 0} // Disable bulk entry if questions are defined
                >
                  <Users className="mr-2 h-4 w-4" />
                  Bulk Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display Linked Lesson Plan if available */}
              {(selectedTestData as any).lesson_plans?.chapter && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>
                    Linked Lesson: {(selectedTestData as any).lesson_plans.subject}: {(selectedTestData as any).lesson_plans.chapter} - {(selectedTestData as any).lesson_plans.topic}
                  </span>
                </div>
              )}

              <div>
                <Label>Select Student</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose student" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} - Grade {student.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {questions.length > 0 ? (
                // Question-wise mark entry
                <div className="space-y-4">
                  {questions.map((q, index) => {
                    const currentQuestionMark = questionMarks.find(qm => qm.questionId === q.id);
                    return (
                      <div key={q.id} className="border p-4 rounded-lg space-y-2">
                        <p className="font-semibold">Question {index + 1} (Max: {q.maxMarks} marks)</p>
                        <p className="text-sm text-muted-foreground">{q.questionText}</p>
                        {q.correctAnswer && (
                          <p className="text-xs text-blue-600">Correct Answer: {q.correctAnswer}</p>
                        )}
                        <div>
                          <Label>Student's Answer (Optional)</Label>
                          <Textarea
                            value={currentQuestionMark?.studentAnswer || ''}
                            onChange={(e) => updateQuestionMark(q.id, 'studentAnswer', e.target.value)}
                            placeholder="Student's answer"
                            rows={2}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label>Marks Obtained</Label>
                            <Input
                              type="number"
                              min="0"
                              max={q.maxMarks}
                              value={currentQuestionMark?.marksObtained || ''}
                              onChange={(e) => updateQuestionMark(q.id, 'marksObtained', parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                          {q.correctAnswer && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => aiGradeAnswerMutation.mutate({
                                questionText: q.questionText,
                                correctAnswer: q.correctAnswer!,
                                studentAnswer: currentQuestionMark?.studentAnswer || '',
                                maxMarks: q.maxMarks })}
                              disabled={aiGradeAnswerMutation.isPending || !currentQuestionMark?.studentAnswer}
                            >
                              <Bot className="h-4 w-4 mr-1" /> AI Grade
                            </Button>
                          )}
                        </div>
                        {currentQuestionMark?.feedback && (
                          <p className="text-sm text-muted-foreground mt-2">
                            AI Feedback: {currentQuestionMark.feedback}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Overall mark entry
                <div>
                  <Label>Marks Obtained (out of {selectedTestData.total_marks})</Label>
                  <Input
                    type="number"
                    min="0"
                    max={selectedTestData.total_marks}
                    value={marksObtained}
                    onChange={(e) => setMarksObtained(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              <div>
                <Label>Test Date</Label>
                <Input
                  type="date"
                  value={resultDate}
                  onChange={(e) => setResultDate(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  // Validate marks don't exceed total
                  if (questions.length === 0) {
                    const m = parseInt(marksObtained);
                    if (m > selectedTestData.total_marks) {
                      toast.error(`Marks (${m}) cannot exceed total marks (${selectedTestData.total_marks})`);
                      return;
                    }
                  } else {
                    const totalFromQ = questionMarks.reduce((sum, qm) => sum + qm.marksObtained, 0);
                    if (totalFromQ > selectedTestData.total_marks) {
                      toast.error(`Total marks (${totalFromQ}) exceed test total (${selectedTestData.total_marks})`);
                      return;
                    }
                  }
                  addResultMutation.mutate();
                }}
                disabled={!selectedStudentId || (!marksObtained && questions.length === 0) || addResultMutation.isPending}
                className="w-full"
              >
                Save Marks
              </Button>

              {/* Display Entered Marks Table */}
              <div className="mt-8">
                <h3 className="font-semibold text-lg mb-4">Entered Marks for {selectedTestData.name}</h3>
                {testResultsLoading ? (
                  <p>Loading results...</p>
                ) : testResults.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No marks entered for this test yet.</p>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Marks Obtained</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testResults.map((result: any) => {
                          const percentage = selectedTestData.total_marks
                            ? ((result.marks_obtained / selectedTestData.total_marks) * 100).toFixed(1)
                            : 'N/A';
                          return (
                            <TableRow key={result.id}>
                              <TableCell className="font-medium">{result.students?.name || 'N/A'}</TableCell>
                              <TableCell>{result.students?.grade || 'N/A'}</TableCell>
                              <TableCell>{result.marks_obtained} / {selectedTestData.total_marks}</TableCell>
                              <TableCell>{percentage}%</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteResultMutation.mutate(result.id)}
                                  disabled={deleteResultMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Question paper section removed - uploaded_file_url not in schema */}

      <OCRModal
        open={showOCRModal}
        onOpenChange={setShowOCRModal}
        onSave={(text) => {
          setExtractedTestContent(text);
          toast.success("Test content extracted! You can now use this for reference.");
        }}
      />

      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Specifications & Results</DialogTitle>
            <DialogDescription>Overview of test structure and student scores.</DialogDescription>
          </DialogHeader>
          {viewingTestDetails && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Test Name</Label>
                  <p className="font-bold">{viewingTestDetails.name}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Total Marks</Label>
                  <p className="font-bold">{viewingTestDetails.total_marks} PTS</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Subject</Label>
                  <p className="font-medium">{viewingTestDetails.subject}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Date</Label>
                  <p className="font-medium">{format(new Date(viewingTestDetails.date), "PPP")}</p>
                </div>
              </div>

              {viewingTestDetails.lesson_plans && (
                <div className="border-l-4 border-primary pl-4 py-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Linked Lesson/Chapter</Label>
                  <p className="text-sm font-semibold">
                    {viewingTestDetails.lesson_plans.subject}: {viewingTestDetails.lesson_plans.chapter} - {viewingTestDetails.lesson_plans.topic}
                  </p>
                </div>
              )}

              {viewingTestDetails.questions && (viewingTestDetails.questions as any).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-bold">Questions ({ (viewingTestDetails.questions as any).length })</Label>
                  <div className="space-y-2">
                    {(viewingTestDetails.questions as any).map((q: any, i: number) => (
                      <div key={i} className="text-xs p-3 rounded-lg border bg-card">
                        <div className="flex justify-between font-bold mb-1">
                          <span>Q{i+1}. {q.maxMarks} Marks</span>
                        </div>
                        <p>{q.questionText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-bold">Entered Results</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.find(t => t.id === viewingTestDetails.id) && testResults.length > 0 && selectedTest === viewingTestDetails.id ? (
                      testResults.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm font-medium">{r.students?.name}</TableCell>
                          <TableCell className="text-right text-sm font-bold">
                            {r.marks_obtained}/{viewingTestDetails.total_marks}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4 italic text-xs">
                          {selectedTest === viewingTestDetails.id ? "No results entered yet." : "Select this test in the catalog to view its results here."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedTest && selectedTestData && (
        <BulkMarksEntry
          open={showBulkEntry}
          onOpenChange={setShowBulkEntry}
          students={filteredStudents}
          testId={selectedTest}
          totalMarks={selectedTestData.total_marks}
          onSave={(marks) => bulkMarksMutation.mutate(marks)}
        />
      )}
    </div>
  );
}
