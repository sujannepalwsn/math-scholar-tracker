import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, AlertTriangle, Settings } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import DisciplineCategoryManagement from "@/components/center/DisciplineCategoryManagement"; // Import the new component

type DisciplineIssue = Tables<'discipline_issues'>;
type Student = Tables<'students'>;
type DisciplineCategory = Tables<'discipline_categories'>;

const severityLevels = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function DisciplineIssues() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<DisciplineIssue | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  const [studentId, setStudentId] = useState("select-student");
  const [disciplineCategoryId, setDisciplineCategoryId] = useState("select-category");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<DisciplineIssue['severity']>("medium");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [modalGradeFilter, setModalGradeFilter] = useState<string>("all");
  const [resolution, setResolution] = useState("");
  const [status, setStatus] = useState<string>("open");

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-discipline", user?.center_id],
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

  // Filtered students for the modal's student select dropdown
  const filteredStudentsForModal = students.filter(s => modalGradeFilter === "all" || s.grade === modalGradeFilter);

  // Fetch discipline categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["discipline-categories", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("discipline_categories")
        .select("*")
        .eq("center_id", user.center_id)
        .eq("is_active", true) // Only active categories
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  // Fetch discipline issues
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ // Destructure isLoading here
    queryKey: ["discipline-issues", user?.center_id, gradeFilter],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("discipline_issues")
        .select("*, students(name, grade), discipline_categories(name)")
        .eq("center_id", user.center_id)
        .order("issue_date", { ascending: false });
      
      if (gradeFilter !== "all") {
        query = query.eq("students.grade", gradeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const resetForm = () => {
    setStudentId("select-student");
    setDisciplineCategoryId("select-category");
    setDescription("");
    setSeverity("medium");
    setIssueDate(format(new Date(), "yyyy-MM-dd"));
    setEditingIssue(null);
    setModalGradeFilter("all");
    setResolution("");
    setStatus("open");
  };

  const createIssueMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id || studentId === "select-student" || disciplineCategoryId === "select-category") throw new Error("Please select a student and category."); // Validation

      const { error } = await supabase.from("discipline_issues").insert({
        center_id: user.center_id,
        student_id: studentId,
        discipline_category_id: disciplineCategoryId,
        description,
        severity,
        reported_by: user.id,
        issue_date: issueDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-issues"] });
      toast.success("Discipline issue logged successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to log issue");
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async () => {
      if (!editingIssue || !user?.center_id || studentId === "select-student" || disciplineCategoryId === "select-category") throw new Error("Please select a student and category.");

      const { error } = await supabase.from("discipline_issues").update({
        student_id: studentId,
        discipline_category_id: disciplineCategoryId,
        description,
        severity,
        issue_date: issueDate,
        resolution: resolution || null,
        status: status,
      }).eq("id", editingIssue.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-issues"] });
      toast.success("Discipline issue updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update issue");
    },
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discipline_issues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-issues"] });
      toast.success("Discipline issue deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete issue");
    },
  });

  const handleEditClick = (issue: DisciplineIssue) => {
    setEditingIssue(issue);
    setStudentId(issue.student_id);
    setDisciplineCategoryId(issue.discipline_category_id || "select-category");
    setDescription(issue.description);
    setSeverity(issue.severity);
    setIssueDate(issue.issue_date);
    setResolution(issue.resolution || "");
    setStatus(issue.status || "open");
    const student = students.find(s => s.id === issue.student_id);
    setModalGradeFilter(student?.grade || "all");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingIssue) {
      updateIssueMutation.mutate();
    } else {
      createIssueMutation.mutate();
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

  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort();
  // const filteredIssues = gradeFilter === "all" ? issues : issues.filter((issue: any) => {
  //   const studentGrade = students.find(s => s.id === issue.student_id)?.grade;
  //   return studentGrade === gradeFilter;
  // });
  // Filtering is now handled by the useQuery hook

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Discipline Issues</h1>
        <div className="flex gap-2 items-center">
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
          <Button variant="outline" onClick={() => setShowCategoryManagement(true)}>
            <Settings className="h-4 w-4 mr-2" /> Manage Categories
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Log Issue</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="discipline-issue-log-title" aria-describedby="discipline-issue-log-description">
              <DialogHeader>
                <DialogTitle id="discipline-issue-log-title">{editingIssue ? "Edit Discipline Issue" : "Log New Discipline Issue"}</DialogTitle>
                <DialogDescription id="discipline-issue-log-description">
                  {editingIssue ? "Update the details of this discipline issue." : "Record a new discipline issue for a student."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="modalGradeFilter">Filter Students by Grade</Label>
                  <Select value={modalGradeFilter} onValueChange={setModalGradeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {uniqueGrades.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student">Student *</Label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Student" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-student" disabled>Select Student</SelectItem> {/* Added placeholder item */}
                      {filteredStudentsForModal.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} - {s.grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={disciplineCategoryId} onValueChange={setDisciplineCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-category" disabled>Select Category</SelectItem> {/* Added placeholder item */}
                      {categoriesLoading ? (
                        <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                      ) : categories.length === 0 ? (
                        <SelectItem value="no-categories" disabled>No categories available. Add some!</SelectItem>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the incident" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity *</Label>
                  <Select value={severity} onValueChange={(value: DisciplineIssue['severity']) => setSeverity(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {severityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Date *</Label>
                  <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </div>
                {editingIssue && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution">Resolution Notes</Label>
                      <Textarea id="resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2} placeholder="How was the issue resolved?" />
                    </div>
                  </>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={studentId === "select-student" || disciplineCategoryId === "select-category" || !description || !severity || !issueDate || createIssueMutation.isPending || updateIssueMutation.isPending}
                  className="w-full"
                >
                  {editingIssue ? (updateIssueMutation.isPending ? "Updating..." : "Update Issue") : (createIssueMutation.isPending ? "Logging..." : "Log Issue")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Discipline Issues</CardTitle>
        </CardHeader>
        <CardContent>
          {issuesLoading ? (
            <p>Loading issues...</p>
          ) : issues.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No discipline issues found for the selected grade.</p>
          ) : (
            <div className="space-y-4">
              {issues.map((issue: any) => (
                <div key={issue.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-lg">{issue.students?.name} - {issue.discipline_categories?.name}</h3>
                    <p className="text-sm text-muted-foreground">Date: {format(new Date(issue.issue_date), "PPP")}</p>
                    <p className="text-sm">{issue.description}</p>
                    {issue.resolution_notes && <p className="text-sm font-medium">Resolution: {issue.resolution_notes}</p>}
                    <p className={`text-sm font-semibold ${getSeverityColor(issue.severity)}`}>Severity: {issue.severity.toUpperCase()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(issue)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteIssueMutation.mutate(issue.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discipline Category Management Dialog */}
      <Dialog open={showCategoryManagement} onOpenChange={setShowCategoryManagement}>
        <DialogContent className="max-w-2xl" aria-labelledby="discipline-category-management-title" aria-describedby="discipline-category-management-description">
          <DialogHeader>
            <DialogTitle id="discipline-category-management-title">Manage Discipline Categories</DialogTitle>
            <DialogDescription id="discipline-category-management-description">
              Add, edit, or deactivate categories for discipline issues.
            </DialogDescription>
          </DialogHeader>
          <DisciplineCategoryManagement />
        </DialogContent>
      </Dialog>
    </div>
  );
}