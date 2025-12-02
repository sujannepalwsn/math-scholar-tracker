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
import { Plus, Edit, Trash2, FileUp, FileText, Video } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

type LessonPlan = Tables<'lesson_plans'>;
type Student = Tables<'students'>; // Import Student type to get grades

export default function LessonPlans() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLessonPlan, setEditingLessonPlan] = useState<LessonPlan | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all"); // New grade filter state

  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [lessonDate, setLessonDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [media, setMedia] = useState<File | null>(null);

  // Fetch students to get unique grades
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-grades", user?.center_id],
    queryFn: async () => {
      if (!user?.center_id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("grade")
        .eq("center_id", user.center_id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort();

  // Fetch lesson plans
  const { data: lessonPlans = [], isLoading } = useQuery({
    queryKey: ["lesson-plans-for-tracking", user?.center_id, subjectFilter, gradeFilter], // Add gradeFilter to query key
    queryFn: async () => {
      if (!user?.center_id) return [];
      let query = supabase
        .from("lesson_plans")
        .select("*")
        .eq("center_id", user.center_id)
        .order("lesson_date", { ascending: false });

      if (subjectFilter !== "all") {
        query = query.eq("subject", subjectFilter);
      }
      if (gradeFilter !== "all") { // Apply grade filter
        query = query.eq("grade", gradeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.center_id,
  });

  const resetForm = () => {
    setSubject("");
    setChapter("");
    setTopic("");
    setLessonDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setFile(null);
    setMedia(null);
    setEditingLessonPlan(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMedia(e.target.files[0]);
    }
  };

  const uploadFile = async (fileToUpload: File, bucket: string) => {
    const fileExt = fileToUpload.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileToUpload);
    if (uploadError) throw uploadError;
    return fileName;
  };

  const createLessonPlanMutation = useMutation({
    mutationFn: async () => {
      if (!user?.center_id) throw new Error("Center ID not found");

      let fileUrl: string | null = null;
      let mediaUrl: string | null = null;

      if (file) fileUrl = await uploadFile(file, "lesson-plan-files");
      if (media) mediaUrl = await uploadFile(media, "lesson-plan-media");

      const { error } = await supabase.from("lesson_plans").insert({
        center_id: user.center_id,
        teacher_id: user.teacher_id || null,
        subject,
        chapter,
        topic,
        class: gradeFilter === "all" ? "General" : gradeFilter,
        grade: gradeFilter === "all" ? null : gradeFilter,
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      toast.success("Lesson Plan created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create lesson plan");
    },
  });

  const updateLessonPlanMutation = useMutation({
    mutationFn: async () => {
      if (!editingLessonPlan || !user?.center_id) throw new Error("Lesson Plan or Center ID not found");

      let fileUrl: string | null = editingLessonPlan.lesson_file_url;

      if (file) fileUrl = await uploadFile(file, "lesson-plan-files");

      const { error } = await supabase.from("lesson_plans").update({
        subject,
        chapter,
        topic,
        lesson_date: lessonDate,
        notes: notes || null,
        lesson_file_url: fileUrl,
        grade: gradeFilter === "all" ? null : gradeFilter, // Update grade
      }).eq("id", editingLessonPlan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      toast.success("Lesson Plan updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update lesson plan");
    },
  });

  const deleteLessonPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      toast.success("Lesson Plan deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete lesson plan");
    },
  });

  const handleEditClick = (lessonPlan: LessonPlan) => {
    setEditingLessonPlan(lessonPlan);
    setSubject(lessonPlan.subject);
    setChapter(lessonPlan.chapter);
    setTopic(lessonPlan.topic);
    setLessonDate(lessonPlan.lesson_date);
    setNotes(lessonPlan.notes || "");
    setFile(null); // Clear file input for edit
    setMedia(null); // Clear media input for edit
    setGradeFilter(lessonPlan.grade || "all"); // Set grade filter to current lesson plan's grade
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingLessonPlan) {
      updateLessonPlanMutation.mutate();
    } else {
      createLessonPlanMutation.mutate();
    }
  };

  const uniqueSubjects = Array.from(new Set(lessonPlans.map(lp => lp.subject))).sort();
  // const filteredLessonPlans = subjectFilter === "all" ? lessonPlans : lessonPlans.filter(lp => lp.subject === subjectFilter);
  // The filtering is now handled by the useQuery hook

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lesson Plans</h1>
        <div className="flex gap-2 items-center">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={gradeFilter} onValueChange={setGradeFilter}> {/* New Grade Filter */}
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Create Lesson Plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-labelledby="lesson-plan-create-title" aria-describedby="lesson-plan-create-description">
              <DialogHeader>
                <DialogTitle id="lesson-plan-create-title">{editingLessonPlan ? "Edit Lesson Plan" : "Create New Lesson Plan"}</DialogTitle>
                <DialogDescription id="lesson-plan-create-description">
                  {editingLessonPlan ? "Update the details of this lesson plan." : "Fill in the details to create a new lesson plan."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Mathematics" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chapter">Chapter *</Label>
                    <Input id="chapter" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g., Algebra" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Linear Equations" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade (Optional)</Label> {/* Input for grade */}
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Grade" />
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
                  <Label htmlFor="lessonDate">Date *</Label>
                  <Input id="lessonDate" type="date" value={lessonDate} onChange={(e) => setLessonDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Key points, teaching strategies, etc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Upload Lesson Plan File (PDF, DOCX - Optional)</Label>
                  <Input id="file" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                  {editingLessonPlan?.lesson_file_url && !file && (
                    <p className="text-sm text-muted-foreground">Current file: {editingLessonPlan.lesson_file_url.split('-').pop()}</p>
                  )}
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!subject || !chapter || !topic || !lessonDate || createLessonPlanMutation.isPending || updateLessonPlanMutation.isPending}
                  className="w-full"
                >
                  {editingLessonPlan ? (updateLessonPlanMutation.isPending ? "Updating..." : "Update Lesson Plan") : (createLessonPlanMutation.isPending ? "Creating..." : "Create Lesson Plan")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Lesson Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading lesson plans...</p>
          ) : lessonPlans.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No lesson plans found for the selected subject/grade.</p>
          ) : (
            <div className="space-y-4">
              {lessonPlans.map((lp) => (
                <div key={lp.id} className="border rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-lg">{lp.subject}: {lp.chapter} - {lp.topic}</h3>
                    <p className="text-sm text-muted-foreground">Date: {format(new Date(lp.lesson_date), "PPP")} {lp.grade && `(Grade: ${lp.grade})`}</p>
                    {lp.notes && <p className="text-sm">{lp.notes}</p>}
                    <div className="flex gap-2 mt-2">
                      {lp.lesson_file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={supabase.storage.from("lesson-plan-files").getPublicUrl(lp.lesson_file_url).data.publicUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-1" /> File
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(lp)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteLessonPlanMutation.mutate(lp.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}