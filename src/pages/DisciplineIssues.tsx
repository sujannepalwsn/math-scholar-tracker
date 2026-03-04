import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Clock, Edit, Plus, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Conduct Registry</h1>
          <p className="text-muted-foreground text-lg">Monitor and manage student behavioral patterns and resolutions.</p>
        </div>
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

      <Card className="border-none shadow-medium overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-xl">Recorded Incidents</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {issuesLoading ? (
            <div className="flex justify-center py-12"><AlertTriangle className="h-8 w-8 animate-spin text-primary" /></div>
          ) : issues.length === 0 ? (
            <p className="text-muted-foreground text-center py-12 italic">No behavioral records found for the current selection.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {issues.map((issue: any) => (
                <div key={issue.id} className="rounded-2xl border-2 border-primary/5 bg-card p-6 shadow-soft hover:shadow-medium transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl bg-background shadow-soft" onClick={() => handleEditClick(issue)}>
                      <Edit className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl bg-background shadow-soft hover:bg-destructive/10" onClick={() => deleteIssueMutation.mutate(issue.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                       <div className={cn("p-3 rounded-2xl",
                         issue.severity === 'high' ? "bg-red-100 text-red-600" :
                         issue.severity === 'medium' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                       )}>
                          <AlertTriangle className="h-6 w-6" />
                       </div>
                       <div>
                          <h3 className="font-bold text-xl leading-tight">{issue.students?.name}</h3>
                          <div className="flex gap-2 mt-1">
                             <Badge variant="outline" className="text-[10px]">{issue.discipline_categories?.name}</Badge>
                             <Badge className={cn("text-[10px] border-none uppercase font-black",
                                issue.severity === 'high' ? "bg-red-500/10 text-red-600" :
                                issue.severity === 'medium' ? "bg-orange-500/10 text-orange-600" : "bg-green-500/10 text-green-600"
                             )}>
                                {issue.severity} Priority
                             </Badge>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{issue.description}</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-primary">
                        <Clock className="h-4 w-4" />
                        Incident Date: {format(new Date(issue.issue_date), "PPP")}
                      </div>
                    </div>

                    {issue.resolution && (
                      <div className="p-3 rounded-xl bg-muted/50 text-xs font-medium border-l-4 border-green-500">
                        <span className="font-black uppercase text-green-600 block mb-1">Resolution</span>
                        {issue.resolution}
                      </div>
                    )}

                    <div className="pt-2">
                       <Badge className={cn("rounded-full px-3 py-1",
                         issue.status === 'resolved' ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
                       )}>
                          {issue.status || 'open'}
                       </Badge>
                    </div>
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