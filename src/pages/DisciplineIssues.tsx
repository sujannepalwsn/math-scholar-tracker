import React, { useState } from "react";
import { AlertTriangle, Clock, Edit, Plus, Settings, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ServerPagination } from "@/components/ui/server-pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { Checkbox } from "@/components/ui/checkbox"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { format } from "date-fns"
import { Tables } from "@/integrations/supabase/types"
import DisciplineCategoryManagement from "@/components/center/DisciplineCategoryManagement"; // Import the new component
import { cn } from "@/lib/utils"
import { hasActionPermission } from "@/utils/permissions";



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
  const isRestricted = user?.role === 'teacher' && user?.teacher_scope_mode !== 'full';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<DisciplineIssue | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [disciplineCategoryId, setDisciplineCategoryId] = useState("select-category");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<DisciplineIssue['severity']>("medium");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [modalGradeFilter, setModalGradeFilter] = useState<string>("all");
  const [resolution, setResolution] = useState("");
  const [status, setStatus] = useState<string>("open");
  const { page, setPage, pageSize, setPageSize } = usePagination();

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-discipline", user?.center_id, isRestricted, user?.teacher_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("students")
        .select("id, name, grade")
        .eq("center_id", user.center_id)
        .eq("is_active", true);

      if (isRestricted && user?.teacher_id) {
        const { data: assignments } = await supabase.from('class_teacher_assignments').select('grade').eq('teacher_id', user.teacher_id);
        const { data: schedules } = await supabase.from('period_schedules').select('grade').eq('teacher_id', user.teacher_id);
        const myGrades = Array.from(new Set([...(assignments?.map(a => a.grade) || []), ...(schedules?.map(s => s.grade) || [])]));

        if (myGrades.length > 0) {
          // Fix: Proper quoting for PostgREST
          query = query.or(`grade.in.(${myGrades.map(g => `"${g}"`).join(',')})`);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id });

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
    enabled: !!user?.center_id });

  // Fetch discipline issues
  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ["discipline-issues", user?.center_id, gradeFilter, user?.id, isRestricted, page, pageSize],
    queryFn: async () => {
      if (!user?.center_id) return { data: [], count: 0 };
      let query = supabase
        .from("discipline_issues")
        .select("*, students!inner(name, grade), discipline_categories(name)", { count: "exact" })
        .eq("center_id", user.center_id);
      
      if (gradeFilter !== "all") {
        query = query.eq("students.grade", gradeFilter);
      }

      if (user?.role === 'teacher' && isRestricted) {
        query = query.eq('reported_by', user.id);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("issue_date", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user?.center_id,
    placeholderData: (previousData) => previousData
  });

  const issues = issuesData?.data || [];
  const totalRows = issuesData?.count || 0;
  const totalPages = Math.ceil(totalRows / pageSize);

  const resetForm = () => {
    setSelectedStudentIds([]);
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
      if (!hasActionPermission(user, 'discipline_issues', 'edit')) {
        throw new Error("Access Denied: You do not have permission to log discipline issues.");
      }
      if (!user?.center_id || selectedStudentIds.length === 0 || disciplineCategoryId === "select-category") throw new Error("Please select at least one student and category."); // Validation

      const issueRecords = selectedStudentIds.map(sid => ({
        center_id: user.center_id,
        student_id: sid,
        discipline_category_id: disciplineCategoryId,
        description,
        severity,
        reported_by: user.id,
        issue_date: issueDate }));

      const { error } = await supabase.from("discipline_issues").insert(issueRecords);
      if (error) throw error;

      // Notify Parents
      const { data: parentUsers } = await supabase.from('users').select('id, student_id').in('student_id', selectedStudentIds).eq('role', 'parent');
      if (parentUsers && parentUsers.length > 0) {
        const notifications = parentUsers.map(pu => ({
          user_id: pu.id,
          center_id: user.center_id!,
          title: "Behavioral Incident Logged",
          message: `A new discipline issue has been recorded for ${students.find(s => s.id === pu.student_id)?.name}.`,
          type: "info",
          link: "/parent-discipline"
        }));
        const { error: notifError } = await supabase.from('notifications').insert(notifications);
        if (notifError) console.error("Notification error:", notifError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-issues"] });
      toast.success("Discipline issue logged successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to log issue");
    } });

  const updateIssueMutation = useMutation({
    mutationFn: async () => {
      if (!hasActionPermission(user, 'discipline_issues', 'edit')) {
        throw new Error("Access Denied: You do not have permission to modify discipline issues.");
      }
      if (!editingIssue || !user?.center_id || selectedStudentIds.length === 0 || disciplineCategoryId === "select-category") throw new Error("Please select a student and category.");

      const { error } = await supabase.from("discipline_issues").update({
        student_id: selectedStudentIds[0],
        discipline_category_id: disciplineCategoryId,
        description,
        severity,
        issue_date: issueDate,
        resolution: resolution || null,
        status: status }).eq("id", editingIssue.id);
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
    } });

  const deleteIssueMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!hasActionPermission(user, 'discipline_issues', 'edit')) {
        throw new Error("Access Denied: You do not have permission to delete discipline issues.");
      }
      const { error } = await supabase.from("discipline_issues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discipline-issues"] });
      toast.success("Discipline issue deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete issue");
    } });

  const handleEditClick = (issue: DisciplineIssue) => {
    setEditingIssue(issue);
    setSelectedStudentIds([issue.student_id]);
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
    <div className="space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
              <AlertTriangle className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                Conduct Hub
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="h-2 w-2 rounded-full bg-primary" />
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Behavioral Monitoring Terminal</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={gradeFilter} onValueChange={(v) => { setGradeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-11 bg-card/50 border-muted-foreground/10 focus:ring-primary/20 rounded-xl">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent className="backdrop-blur-xl bg-card/90 border-muted-foreground/10 rounded-xl">
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActionPermission(user, 'discipline_issues', 'edit') && (
            <Button variant="outline" onClick={() => setShowCategoryManagement(true)} className="rounded-xl h-11">
              <Settings className="h-4 w-4 mr-2" /> Categories
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              {hasActionPermission(user, 'discipline_issues', 'edit') && (
                <Button><Plus className="h-4 w-4 mr-2" /> Log Issue</Button>
              )}
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="discipline-issue-log-title" aria-describedby="discipline-issue-log-description">
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                     <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Selected Students ({selectedStudentIds.length})</Label>
                     <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest" onClick={() => setSelectedStudentIds(filteredStudentsForModal.map(s => s.id))}>Select All</Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest" onClick={() => setSelectedStudentIds([])}>Clear</Button>
                     </div>
                  </div>
                  <div className="border border-muted/20 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-muted/5">
                     {filteredStudentsForModal.map((s) => (
                       <div key={s.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-muted/10">
                          <Checkbox
                            id={`student-${s.id}`}
                            checked={selectedStudentIds.includes(s.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedStudentIds(prev => [...prev, s.id]);
                              else setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                            }}
                          />
                          <label htmlFor={`student-${s.id}`} className="text-sm font-bold text-slate-700 cursor-pointer flex-1">
                            {s.name} <span className="text-[10px] text-muted-foreground uppercase ml-2 tracking-tighter">{s.grade}</span>
                          </label>
                       </div>
                     ))}
                     {filteredStudentsForModal.length === 0 && (
                       <p className="text-center py-4 text-xs italic text-muted-foreground">No students found for selected grade.</p>
                     )}
                  </div>
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
                  disabled={selectedStudentIds.length === 0 || disciplineCategoryId === "select-category" || !description || !severity || !issueDate || createIssueMutation.isPending || updateIssueMutation.isPending}
                  className="w-full"
                >
                  {editingIssue ? (updateIssueMutation.isPending ? "Updating..." : "Update Issue") : (createIssueMutation.isPending ? "Logging..." : `Log Issue for ${selectedStudentIds.length} Students`)}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-strong overflow-hidden rounded-3xl bg-card/40 backdrop-blur-md border border-border/20">
        <CardHeader className="border-b border-muted/20 bg-primary/5 py-6">
          <CardTitle className="text-xl font-black flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <AlertTriangle className="h-6 w-6 text-primary" />
            </div>
            Recorded Incidents
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {issuesLoading && !issues.length ? (
            <TableSkeleton columns={5} rows={pageSize} />
          ) : issues.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">No behavioral records found for selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/10">
                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Student & Incident</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category & Priority</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue: any) => (
                    <TableRow key={issue.id} className="group border-muted/5 hover:bg-primary/5 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground/90 leading-none">{issue.students?.name}</p>
                          <p className="text-xs text-muted-foreground italic line-clamp-1">"{issue.description}"</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {issue.discipline_categories?.name}
                          </Badge>
                          <Badge
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[10px] font-black uppercase border-none tracking-wider",
                              issue.severity === 'high' ? "bg-red-500/20 text-red-600" :
                              issue.severity === 'medium' ? "bg-orange-500/20 text-orange-600" : "bg-green-500/20 text-green-600"
                            )}
                          >
                            {issue.severity}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {format(new Date(issue.issue_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "rounded-xl px-3 py-1 font-bold text-[10px] uppercase border-none shadow-soft",
                          issue.status === 'resolved' ? "bg-green-500 text-white" : "bg-slate-700 text-white"
                        )}>
                          {issue.status || 'open'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          {hasActionPermission(user, 'discipline_issues', 'edit') && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-primary hover:bg-primary/10" onClick={() => handleEditClick(issue)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-white shadow-soft text-destructive hover:bg-destructive/10" onClick={() => deleteIssueMutation.mutate(issue.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <ServerPagination
            currentPage={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Discipline Category Management Dialog */}
      <Dialog open={showCategoryManagement} onOpenChange={setShowCategoryManagement}>
        <DialogContent className="w-[95vw] sm:max-w-2xl" aria-labelledby="discipline-category-management-title" aria-describedby="discipline-category-management-description">
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